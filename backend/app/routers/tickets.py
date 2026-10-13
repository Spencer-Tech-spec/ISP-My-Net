"""
Tickets Router — with Multi-Tenant Isolation
Every query is scoped to ctx.isp_id so ISPs can't see each other's tickets.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import supabase
from app.utils.tenant import get_tenant_context, TenantContext, require_manager

router = APIRouter(prefix="/tickets", tags=["tickets"])


class TicketCreate(BaseModel):
    subject: str
    description: Optional[str] = None
    client_id: Optional[str] = None
    priority: str = "normal"  # 'low', 'normal', 'high', 'urgent'


class TicketAssign(BaseModel):
    employee_id: str
    admin_notes: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    resolution: Optional[str] = None


# ─── GET ALL TICKETS ────────────────────────────────────────────────────────────

@router.get("/")
async def get_all_tickets(ctx: TenantContext = Depends(require_manager)):
    """Returns all support tickets for this ISP only."""
    try:
        tickets = supabase.table("support_tickets") \
            .select("*, profiles!client_id(full_name, address, last_location_lat, last_location_lng), assigned:profiles!assigned_employee_id(full_name)") \
            .eq("isp_id", ctx.isp_id) \
            .order("created_at", desc=True) \
            .execute()
        return tickets.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE TICKET ───────────────────────────────────────────────────────────────

@router.post("/")
async def create_ticket(ticket: TicketCreate, ctx: TenantContext = Depends(get_tenant_context)):
    """Any staff member can create a support ticket."""
    try:
        result = supabase.table("support_tickets").insert({
            "subject": ticket.subject,
            "description": ticket.description,
            "client_id": ticket.client_id,
            "priority": ticket.priority,
            "status": "open",
            "isp_id": ctx.isp_id,
        }).execute()
        return result.data[0] if result.data else {"status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET SINGLE TICKET ───────────────────────────────────────────────────────────

@router.get("/{ticket_id}")
async def get_ticket(ticket_id: int, ctx: TenantContext = Depends(get_tenant_context)):
    """Get one ticket — enforces isp_id so cross-tenant access is impossible."""
    try:
        ticket = supabase.table("support_tickets") \
            .select("*, profiles!client_id(full_name, phone, address), assigned:profiles!assigned_employee_id(full_name)") \
            .eq("id", ticket_id) \
            .eq("isp_id", ctx.isp_id) \
            .single() \
            .execute()

        if not ticket.data:
            raise HTTPException(status_code=404, detail="Ticket not found.")
        return ticket.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── ASSIGN TICKET ───────────────────────────────────────────────────────────────

@router.post("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: int,
    assignment: TicketAssign,
    ctx: TenantContext = Depends(require_manager),
):
    """Assign a ticket to a staff member. Manager/Owner only."""
    try:
        # Verify employee belongs to same ISP
        emp_check = supabase.table("isp_staff_roles") \
            .select("id") \
            .eq("isp_id", ctx.isp_id) \
            .eq("user_id", assignment.employee_id) \
            .eq("is_active", True) \
            .execute()

        if not emp_check.data:
            raise HTTPException(status_code=400, detail="Employee not found in your ISP.")

        # Update ticket — must also match isp_id
        supabase.table("support_tickets").update({
            "assigned_employee_id": assignment.employee_id,
            "status": "assigned",
            "admin_notes": assignment.admin_notes,
        }).eq("id", ticket_id).eq("isp_id", ctx.isp_id).execute()

        # Fetch ticket subject for notification
        ticket = supabase.table("support_tickets") \
            .select("subject") \
            .eq("id", ticket_id) \
            .single() \
            .execute()

        # Notify the employee
        supabase.table("employee_notifications").insert({
            "employee_id": assignment.employee_id,
            "title": "New Task Assigned",
            "body": f"You have been assigned: {ticket.data.get('subject', 'a new ticket')}.",
            "type": "client_assigned",
            "isp_id": ctx.isp_id,
        }).execute()

        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE TICKET ───────────────────────────────────────────────────────────────

@router.patch("/{ticket_id}")
async def update_ticket(
    ticket_id: int,
    update: TicketUpdate,
    ctx: TenantContext = Depends(get_tenant_context),
):
    """Update ticket status or notes. Always scoped to isp_id."""
    try:
        data = {k: v for k, v in update.dict().items() if v is not None}
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update.")

        supabase.table("support_tickets") \
            .update(data) \
            .eq("id", ticket_id) \
            .eq("isp_id", ctx.isp_id) \
            .execute()

        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── NEARBY EMPLOYEES ────────────────────────────────────────────────────────────

@router.get("/nearby-employees/list")
async def get_nearby_employees(
    lat: float, lng: float,
    ctx: TenantContext = Depends(require_manager),
):
    """Returns all active employees for this ISP with their last known locations."""
    try:
        employees = supabase.table("profiles") \
            .select("id, full_name, last_location_lat, last_location_lng") \
            .eq("isp_id", ctx.isp_id) \
            .eq("role", "employee") \
            .execute()
        return employees.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
