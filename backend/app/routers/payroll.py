"""
Payroll Router — with Multi-Tenant Isolation
All queries scoped to ctx.isp_id. Staff creation also assigns isp_id.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.database import supabase
from datetime import datetime
from app.utils.tenant import get_tenant_context, TenantContext, require_manager, require_owner
from app.utils.tenant import check_staff_limit

router = APIRouter(prefix="/payroll", tags=["payroll"])


class PayrollCredit(BaseModel):
    employee_id: str
    amount: float
    description: str


class CreateEmployee(BaseModel):
    email: str
    password: str
    full_name: str
    base_salary: float
    role: str = "employee"  # 'manager', 'technician', 'cashier', 'employee'


class WithdrawalAction(BaseModel):
    status: str          # 'approved' or 'rejected'
    admin_notes: Optional[str] = None
    transaction_reference: Optional[str] = None


# ─── CREATE EMPLOYEE ─────────────────────────────────────────────────────────────

@router.post("/employees")
async def create_employee(
    emp: CreateEmployee,
    ctx: TenantContext = Depends(require_owner),
):
    """Owner creates a new staff member under their ISP."""
    await check_staff_limit(ctx)

    valid_roles = ("manager", "technician", "cashier", "employee")
    if emp.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(valid_roles)}")

    try:
        user_response = supabase.auth.admin.create_user({
            "email": emp.email,
            "password": emp.password,
            "email_confirm": True,
            "user_metadata": {"full_name": emp.full_name, "role": emp.role},
        })
        user_id = user_response.user.id
    except Exception as e:
        if "already" in str(e).lower():
            raise HTTPException(status_code=409, detail="Email already registered.")
        raise HTTPException(status_code=500, detail=str(e))

    # Profile
    supabase.table("profiles").upsert({
        "id": user_id,
        "full_name": emp.full_name,
        "role": emp.role,
        "isp_id": ctx.isp_id,
    }).execute()

    # Employee record (salary/balance)
    supabase.table("employees").insert({
        "id": user_id,
        "base_salary": emp.base_salary,
        "current_balance": 0,
        "isp_id": ctx.isp_id,
    }).execute()

    # Staff role entry
    supabase.table("isp_staff_roles").insert({
        "isp_id": ctx.isp_id,
        "user_id": user_id,
        "role": emp.role,
        "invited_by": ctx.user_id,
    }).execute()

    # Welcome notification
    supabase.table("employee_notifications").insert({
        "employee_id": user_id,
        "title": f"Welcome to {ctx.tenant['company_name']}!",
        "body": f"Hi {emp.full_name}! Your account is active. Base salary: KES {emp.base_salary:,.0f}/month.",
        "type": "info",
        "isp_id": ctx.isp_id,
    }).execute()

    return {"status": "success", "user_id": user_id, "email": emp.email}


# ─── PAYROLL DASHBOARD ───────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_payroll_dashboard(ctx: TenantContext = Depends(require_manager)):
    """Payroll overview for this ISP only."""
    try:
        employees = supabase.table("employees") \
            .select("*, profiles!id(full_name, email)") \
            .eq("isp_id", ctx.isp_id) \
            .execute()

        pending_withdrawals = supabase.table("withdrawal_requests") \
            .select("*, profiles!employee_id(full_name), employees!employee_id(bank_name, bank_account_number, bank_account_name)") \
            .eq("isp_id", ctx.isp_id) \
            .eq("status", "pending") \
            .execute()

        # Totals
        total_payroll = sum(e.get("base_salary", 0) for e in (employees.data or []))
        total_balances = sum(e.get("current_balance", 0) for e in (employees.data or []))

        return {
            "employees": employees.data,
            "pending_withdrawals": pending_withdrawals.data,
            "summary": {
                "total_employees": len(employees.data or []),
                "total_monthly_payroll": total_payroll,
                "total_outstanding_balances": total_balances,
                "pending_withdrawal_count": len(pending_withdrawals.data or []),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREDIT SALARY ───────────────────────────────────────────────────────────────

@router.post("/credit")
async def credit_salary(
    credit: PayrollCredit,
    ctx: TenantContext = Depends(require_manager),
):
    """Credit salary to an employee's balance. Manager/Owner only."""
    try:
        # Verify employee belongs to this ISP
        employee = supabase.table("employees") \
            .select("current_balance") \
            .eq("id", credit.employee_id) \
            .eq("isp_id", ctx.isp_id) \
            .single() \
            .execute()

        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found in your ISP.")

        new_balance = (employee.data["current_balance"] or 0) + credit.amount

        supabase.table("employees") \
            .update({"current_balance": new_balance}) \
            .eq("id", credit.employee_id) \
            .eq("isp_id", ctx.isp_id) \
            .execute()

        # History record
        supabase.table("payroll_history").insert({
            "employee_id": credit.employee_id,
            "amount": credit.amount,
            "type": "salary_credit",
            "description": credit.description,
            "isp_id": ctx.isp_id,
        }).execute()

        # Notification
        supabase.table("employee_notifications").insert({
            "employee_id": credit.employee_id,
            "title": "Salary Credited 💰",
            "body": f"KES {credit.amount:,.0f} credited. Reason: {credit.description}. Balance: KES {new_balance:,.0f}.",
            "type": "salary_credit",
            "isp_id": ctx.isp_id,
        }).execute()

        return {"status": "success", "new_balance": new_balance}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── HANDLE WITHDRAWAL REQUEST ───────────────────────────────────────────────────

@router.post("/withdrawals/{request_id}")
async def handle_withdrawal(
    request_id: int,
    action: WithdrawalAction,
    ctx: TenantContext = Depends(require_manager),
):
    """Approve or reject a staff withdrawal request."""
    if action.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'.")

    try:
        withdrawal = supabase.table("withdrawal_requests") \
            .select("*") \
            .eq("id", request_id) \
            .eq("isp_id", ctx.isp_id) \
            .single() \
            .execute()

        if not withdrawal.data:
            raise HTTPException(status_code=404, detail="Withdrawal request not found.")

        if withdrawal.data["status"] != "pending":
            raise HTTPException(status_code=400, detail="Request already processed.")

        w = withdrawal.data

        if action.status == "approved":
            employee = supabase.table("employees") \
                .select("current_balance") \
                .eq("id", w["employee_id"]) \
                .eq("isp_id", ctx.isp_id) \
                .single() \
                .execute()

            if not employee.data or employee.data["current_balance"] < w["amount"]:
                raise HTTPException(status_code=400, detail="Insufficient employee balance.")

            new_balance = employee.data["current_balance"] - w["amount"]

            supabase.table("employees") \
                .update({"current_balance": new_balance}) \
                .eq("id", w["employee_id"]) \
                .eq("isp_id", ctx.isp_id) \
                .execute()

            supabase.table("payroll_history").insert({
                "employee_id": w["employee_id"],
                "amount": -w["amount"],
                "type": "withdrawal",
                "description": f"Withdrawal approved: {action.admin_notes or ''}",
                "isp_id": ctx.isp_id,
            }).execute()

        # Update the request
        update_data = {
            "status": action.status,
            "admin_notes": action.admin_notes,
            "processed_at": datetime.utcnow().isoformat(),
        }
        if action.transaction_reference:
            update_data["transaction_reference"] = action.transaction_reference

        supabase.table("withdrawal_requests") \
            .update(update_data) \
            .eq("id", request_id) \
            .eq("isp_id", ctx.isp_id) \
            .execute()

        # Notify employee
        supabase.table("employee_notifications").insert({
            "employee_id": w["employee_id"],
            "title": f"Withdrawal {action.status.title()}",
            "body": f"Your withdrawal of KES {w['amount']:,.0f} has been {action.status}. {action.admin_notes or ''}",
            "type": "withdrawal",
            "isp_id": ctx.isp_id,
        }).execute()

        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── LIST WITHDRAWAL REQUESTS ────────────────────────────────────────────────────

@router.get("/withdrawals")
async def list_withdrawals(
    status: Optional[str] = "pending",
    ctx: TenantContext = Depends(require_manager),
):
    """Lists all withdrawal requests for this ISP, filtered by status."""
    try:
        query = supabase.table("withdrawal_requests") \
            .select("*, profiles!employee_id(full_name), employees!employee_id(bank_name, bank_account_number, bank_account_name)") \
            .eq("isp_id", ctx.isp_id)

        if status:
            query = query.eq("status", status)

        result = query.order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
