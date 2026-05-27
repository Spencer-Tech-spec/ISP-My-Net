from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.database import supabase
from app.utils.auth import get_admin_user, get_current_user
from app.utils.logging import log_action

router = APIRouter(prefix="/tickets", tags=["tickets"])

class TicketAssign(BaseModel):
    employee_id: str
    admin_notes: Optional[str] = None

@router.get("/")
async def get_all_tickets(admin=Depends(get_admin_user)):
    try:
        # Fetch tickets with client and employee info
        tickets = supabase.table("support_tickets").select(
            "*, profiles!client_id(full_name, address, last_location_lat, last_location_lng), assigned:profiles!assigned_employee_id(full_name)"
        ).order("created_at", { "ascending": False }).execute()
        
        return tickets.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{ticket_id}/assign")
async def assign_ticket(ticket_id: int, assignment: TicketAssign, admin=Depends(get_admin_user)):
    try:
        # Update ticket
        res = supabase.table("support_tickets").update({
            "assigned_employee_id": assignment.employee_id,
            "status": "assigned",
            "admin_notes": assignment.admin_notes
        }).eq("id", ticket_id).execute()

        # Send notification to employee
        ticket = supabase.table("support_tickets").select("subject").eq("id", ticket_id).single().execute()
        
        supabase.table("employee_notifications").insert({
            "employee_id": assignment.employee_id,
            "title": "New Task Assigned",
            "body": f"You have been assigned to ticket: {ticket.data['subject']}. Check your tasks for details.",
            "type": "client_assigned"
        }).execute()

        # Log Action
        await log_action(
            actor_id=admin.id,
            action_type="ASSIGN_TICKET",
            entity_type="ticket",
            entity_id=str(ticket_id),
            details={"employee_id": assignment.employee_id}
        )

        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nearby-employees")
async def get_nearby_employees(lat: float, lng: float, admin=Depends(get_admin_user)):
    """
    Returns employees sorted by proximity to a given coordinate.
    Simplified version: just returns all employees with their locations.
    """
    try:
        employees = supabase.table("profiles").select("id, full_name, last_location_lat, last_location_lng").eq("role", "employee").execute()
        return employees.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
