from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from supabase_client import supabase
import uuid

router = APIRouter(prefix="/employees", tags=["employees"])

class WithdrawalRequest(BaseModel):
    amount: float

@router.get("/{employee_id}/clients")
async def get_assigned_clients(employee_id: str):
    try:
        response = supabase.table("employee_clients").select("*, profiles!client_id(*)").eq("employee_id", employee_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{employee_id}/payroll")
async def get_employee_payroll(employee_id: str):
    try:
        employee_data = supabase.table("employees").select("*").eq("id", employee_id).single().execute()
        history = supabase.table("payroll_history").select("*").eq("employee_id", employee_id).order("created_at", desc=True).execute()
        requests = supabase.table("withdrawal_requests").select("*").eq("employee_id", employee_id).order("created_at", desc=True).execute()
        
        return {
            "balance": employee_data.data.get("current_balance", 0) if employee_data.data else 0,
            "base_salary": employee_data.data.get("base_salary", 0) if employee_data.data else 0,
            "history": history.data,
            "withdrawal_requests": requests.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class BankDetails(BaseModel):
    bank_name: str
    bank_account_number: str
    bank_account_name: str
    bank_code: Optional[str] = None

@router.post("/{employee_id}/bank-details")
async def update_bank_details(employee_id: str, details: BankDetails):
    try:
        response = supabase.table("employees").update({
            "bank_name": details.bank_name,
            "bank_account_number": details.bank_account_number,
            "bank_account_name": details.bank_account_name,
            "bank_code": details.bank_code
        }).eq("id", employee_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{employee_id}/withdraw")
async def request_withdrawal(employee_id: str, request: WithdrawalRequest):
    try:
        # Check balance first
        employee_data = supabase.table("employees").select("current_balance").eq("id", employee_id).single().execute()
        if not employee_data.data or employee_data.data["current_balance"] < request.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Create request
        new_request = {
            "employee_id": employee_id,
            "amount": request.amount,
            "status": "pending"
        }
        response = supabase.table("withdrawal_requests").insert(new_request).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
