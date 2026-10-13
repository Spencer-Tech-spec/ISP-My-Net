"""
Employees Router — with Multi-Tenant Isolation
All employee queries are scoped to ctx.isp_id.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.database import supabase
from app.utils.tenant import get_tenant_context, TenantContext, require_manager

router = APIRouter(prefix="/employees", tags=["employees"])


class WithdrawalRequest(BaseModel):
    amount: float


class BankDetails(BaseModel):
    bank_name: str
    bank_account_number: str
    bank_account_name: str
    bank_code: Optional[str] = None


# ─── LIST ALL EMPLOYEES FOR THIS ISP ────────────────────────────────────────────

@router.get("/")
async def list_employees(ctx: TenantContext = Depends(require_manager)):
    """Returns all active employees for this ISP."""
    try:
        response = supabase.table("isp_staff_roles") \
            .select("*, profiles!user_id(id, full_name, email, phone, last_location_lat, last_location_lng)") \
            .eq("isp_id", ctx.isp_id) \
            .eq("is_active", True) \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET ASSIGNED CLIENTS ────────────────────────────────────────────────────────

@router.get("/{employee_id}/clients")
async def get_assigned_clients(
    employee_id: str,
    ctx: TenantContext = Depends(get_tenant_context),
):
    """Returns clients assigned to a specific employee — scoped to ISP."""
    try:
        # First verify employee belongs to this ISP
        role_check = supabase.table("isp_staff_roles") \
            .select("id") \
            .eq("user_id", employee_id) \
            .eq("isp_id", ctx.isp_id) \
            .execute()

        if not role_check.data:
            raise HTTPException(status_code=404, detail="Employee not found in your ISP.")

        response = supabase.table("employee_clients") \
            .select("*, profiles!client_id(*)") \
            .eq("employee_id", employee_id) \
            .execute()

        # Filter clients to only show those belonging to this ISP
        isp_clients = [
            r for r in (response.data or [])
            if r.get("profiles") and r["profiles"].get("isp_id") == ctx.isp_id
        ]
        return isp_clients
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET EMPLOYEE PAYROLL ────────────────────────────────────────────────────────

@router.get("/{employee_id}/payroll")
async def get_employee_payroll(
    employee_id: str,
    ctx: TenantContext = Depends(get_tenant_context),
):
    """Returns payroll data for an employee. Employee can view own; manager can view any."""
    # Employees can only see their own payroll
    if ctx.user_role not in ("owner", "manager") and ctx.user_id != employee_id:
        raise HTTPException(status_code=403, detail="You can only view your own payroll.")

    try:
        # Verify employee belongs to this ISP
        role_check = supabase.table("isp_staff_roles") \
            .select("id") \
            .eq("user_id", employee_id) \
            .eq("isp_id", ctx.isp_id) \
            .execute()

        if not role_check.data:
            raise HTTPException(status_code=404, detail="Employee not found in your ISP.")

        employee_data = supabase.table("employees") \
            .select("*") \
            .eq("id", employee_id) \
            .eq("isp_id", ctx.isp_id) \
            .single() \
            .execute()

        history = supabase.table("payroll_history") \
            .select("*") \
            .eq("employee_id", employee_id) \
            .eq("isp_id", ctx.isp_id) \
            .order("created_at", desc=True) \
            .execute()

        requests = supabase.table("withdrawal_requests") \
            .select("*") \
            .eq("employee_id", employee_id) \
            .eq("isp_id", ctx.isp_id) \
            .order("created_at", desc=True) \
            .execute()

        return {
            "balance": employee_data.data.get("current_balance", 0) if employee_data.data else 0,
            "base_salary": employee_data.data.get("base_salary", 0) if employee_data.data else 0,
            "history": history.data,
            "withdrawal_requests": requests.data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE BANK DETAILS ─────────────────────────────────────────────────────────

@router.post("/{employee_id}/bank-details")
async def update_bank_details(
    employee_id: str,
    details: BankDetails,
    ctx: TenantContext = Depends(get_tenant_context),
):
    """Employee updates own bank details. Manager can update any employee's details."""
    if ctx.user_role not in ("owner", "manager") and ctx.user_id != employee_id:
        raise HTTPException(status_code=403, detail="You can only update your own bank details.")

    try:
        response = supabase.table("employees").update({
            "bank_name": details.bank_name,
            "bank_account_number": details.bank_account_number,
            "bank_account_name": details.bank_account_name,
            "bank_code": details.bank_code,
        }).eq("id", employee_id).eq("isp_id", ctx.isp_id).execute()

        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── REQUEST WITHDRAWAL ──────────────────────────────────────────────────────────

@router.post("/{employee_id}/withdraw")
async def request_withdrawal(
    employee_id: str,
    request: WithdrawalRequest,
    ctx: TenantContext = Depends(get_tenant_context),
):
    """Employee requests a salary withdrawal."""
    if ctx.user_id != employee_id:
        raise HTTPException(status_code=403, detail="You can only request your own withdrawals.")

    try:
        employee_data = supabase.table("employees") \
            .select("current_balance") \
            .eq("id", employee_id) \
            .eq("isp_id", ctx.isp_id) \
            .single() \
            .execute()

        if not employee_data.data or employee_data.data["current_balance"] < request.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance.")

        response = supabase.table("withdrawal_requests").insert({
            "employee_id": employee_id,
            "amount": request.amount,
            "status": "pending",
            "isp_id": ctx.isp_id,
        }).execute()

        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET EMPLOYEE NOTIFICATIONS ─────────────────────────────────────────────────

@router.get("/{employee_id}/notifications")
async def get_notifications(
    employee_id: str,
    ctx: TenantContext = Depends(get_tenant_context),
):
    """Returns notifications for an employee. Scoped to this ISP."""
    if ctx.user_id != employee_id and ctx.user_role not in ("owner", "manager"):
        raise HTTPException(status_code=403, detail="Access denied.")

    try:
        result = supabase.table("employee_notifications") \
            .select("*") \
            .eq("employee_id", employee_id) \
            .eq("isp_id", ctx.isp_id) \
            .order("created_at", desc=True) \
            .limit(50) \
            .execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
