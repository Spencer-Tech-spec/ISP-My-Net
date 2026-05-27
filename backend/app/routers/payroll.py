from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.database import supabase
from datetime import datetime
from app.utils.logging import log_action
from app.utils.auth import get_admin_user

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

class WithdrawalAction(BaseModel):
    status: str  # 'approved', 'rejected'
    admin_notes: Optional[str] = None
    transaction_reference: Optional[str] = None

@router.post("/employees")
async def create_employee(emp: CreateEmployee, admin=Depends(get_admin_user)):
    try:
        # supabase already uses service role key, so auth.admin is available
        user_response = supabase.auth.admin.create_user({
            "email": emp.email,
            "password": emp.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": emp.full_name,
                "role": "employee"
            }
        })
        
        user_id = user_response.user.id
        
        # Upsert profile with employee role
        supabase.table("profiles").upsert({
            "id": user_id,
            "full_name": emp.full_name,
            "role": "employee"
        }).execute()

        # Create entry in employees table
        supabase.table("employees").insert({
            "id": user_id,
            "base_salary": emp.base_salary,
            "current_balance": 0
        }).execute()

        # Log Action
        await log_action(
            actor_id=admin.id,
            action_type="CREATE_EMPLOYEE",
            entity_type="employee",
            entity_id=user_id,
            details={"email": emp.email, "salary": emp.base_salary}
        )

        # Send welcome notification
        supabase.table("employee_notifications").insert({
            "employee_id": user_id,
            "title": "Welcome to My Net",
            "body": f"Welcome {emp.full_name}! Your account is active with a base salary of KES {emp.base_salary:,.2f}.",
            "type": "info"
        }).execute()
        
        return {"status": "success", "user_id": user_id, "email": emp.email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_payroll_dashboard(admin=Depends(get_admin_user)):
    try:
        employees = supabase.table("employees").select("*, profiles!id(full_name, email)").execute()
        pending_withdrawals = supabase.table("withdrawal_requests").select("*, profiles!employee_id(full_name), employees!employee_id(bank_name, bank_account_number, bank_account_name, bank_code)").eq("status", "pending").execute()
        
        return {
            "employees": employees.data,
            "pending_withdrawals": pending_withdrawals.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/credit")
async def credit_salary(credit: PayrollCredit, admin=Depends(get_admin_user)):
    try:
        # 1. Update employee balance
        employee = supabase.table("employees").select("current_balance").eq("id", credit.employee_id).single().execute()
        new_balance = (employee.data["current_balance"] or 0) + credit.amount
        
        supabase.table("employees").update({"current_balance": new_balance}).eq("id", credit.employee_id).execute()
        
        # 2. Record in history
        history_entry = {
            "employee_id": credit.employee_id,
            "amount": credit.amount,
            "type": "salary_credit",
            "description": credit.description
        }
        supabase.table("payroll_history").insert(history_entry).execute()

        # Log Action
        await log_action(
            actor_id=admin.id,
            action_type="CREDIT_SALARY",
            entity_type="employee",
            entity_id=credit.employee_id,
            details={"amount": credit.amount, "reason": credit.description}
        )

        # 3. Send notification
        supabase.table("employee_notifications").insert({
            "employee_id": credit.employee_id,
            "title": "Salary Credited",
            "body": f"Your account has been credited with KES {credit.amount:,.2f}. Reason: {credit.description}",
            "type": "salary_credit"
        }).execute()
        
        return {"status": "success", "new_balance": new_balance}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/withdrawals/{request_id}")
async def handle_withdrawal(request_id: int, action: WithdrawalAction, admin=Depends(get_admin_user)):
    try:
        withdrawal = supabase.table("withdrawal_requests").select("*").eq("id", request_id).single().execute()
        if not withdrawal.data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if withdrawal.data["status"] != "pending":
            raise HTTPException(status_code=400, detail="Request already processed")

        if action.status == "approved":
            # Deduct from employee balance
            employee = supabase.table("employees").select("current_balance").eq("id", withdrawal.data["employee_id"]).single().execute()
            if employee.data["current_balance"] < withdrawal.data["amount"]:
                raise HTTPException(status_code=400, detail="Insufficient employee balance")
            
            new_balance = employee.data["current_balance"] - withdrawal.data["amount"]
            supabase.table("employees").update({"current_balance": new_balance}).eq("id", withdrawal.data["employee_id"]).execute()
            
            # Record in history
            history_entry = {
                "employee_id": withdrawal.data["employee_id"],
                "amount": -withdrawal.data["amount"],
                "type": "withdrawal",
                "description": f"Withdrawal approved: {action.admin_notes or ''}"
            }
            supabase.table("payroll_history").insert(history_entry).execute()

        # Update request status
        supabase.table("withdrawal_requests").update({
            "status": action.status,
            "admin_notes": action.admin_notes,
            "processed_at": datetime.utcnow().isoformat()
        }).eq("id", request_id).execute()

        # Log Action
        await log_action(
            actor_id=admin.id,
            action_type=f"WITHDRAWAL_{action.status.upper()}",
            entity_type="withdrawal_request",
            entity_id=str(request_id),
            details={"amount": withdrawal.data["amount"], "notes": action.admin_notes}
        )
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
