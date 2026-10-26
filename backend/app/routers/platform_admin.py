"""
Platform Administration Router — SaaS Platform Control Center
Exclusive to My Net Platform Super Admins.
Provides aggregate metrics, tenant management, and platform-wide governance.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.database import supabase
from app.utils.tenant import get_current_user

router = APIRouter(prefix="/platform-admin", tags=["Platform Super-Admin"])

SUPER_ADMIN_EMAILS = [
    "muneneoscar599@gmail.com",
    "lordcommander334@gmail.com"
]


def require_super_admin(user=Depends(get_current_user)):
    """Validates that the authenticated user is an authorized platform owner."""
    user_email = (user.email or "").lower().strip()
    if user_email not in [e.lower() for e in SUPER_ADMIN_EMAILS]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: My Net Platform Owner credentials required."
        )
    return user


# ─── Request Models ─────────────────────────────────────────────────────────────

class TenantStatusUpdate(BaseModel):
    status: str                         # 'trial', 'active', 'suspended', 'cancelled'
    is_frozen: Optional[bool] = None
    notes: Optional[str] = None


class TrialExtensionRequest(BaseModel):
    extra_days: int = 14


class RevenuePercentageUpdate(BaseModel):
    percentage: float                   # e.g., 3.00


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/metrics")
async def get_platform_metrics(admin=Depends(require_super_admin)):
    """Aggregates high-level platform SaaS metrics for the Super Admin dashboard."""
    if not supabase:
        return {
            "total_tenants": 0,
            "active_tenants": 0,
            "trial_tenants": 0,
            "suspended_tenants": 0,
            "total_end_subscribers": 0,
            "total_platform_revenue": 0.0,
            "total_commission_collected": 0.0,
        }

    try:
        # 1. Tenant counts
        tenants_resp = supabase.table("isp_tenants").select("id, subscription_status, is_frozen, created_at").execute()
        tenants = tenants_resp.data or []
        total_tenants = len(tenants)
        active_tenants = sum(1 for t in tenants if t.get("subscription_status") == "active" and not t.get("is_frozen"))
        trial_tenants = sum(1 for t in tenants if t.get("subscription_status") == "trial")
        suspended_tenants = sum(1 for t in tenants if t.get("subscription_status") == "suspended" or t.get("is_frozen"))

        # 2. Total end customers across all ISPs
        profiles_resp = supabase.table("profiles").select("id", count="exact").eq("role", "customer").execute()
        total_customers = profiles_resp.count or 0

        # 3. SaaS Revenue (Platform 3% fees + plan payments)
        payments_resp = supabase.table("saas_payments").select("amount, status").execute()
        saas_payments = payments_resp.data or []
        collected_commission = sum(
            float(p.get("amount") or 0)
            for p in saas_payments
            if (p.get("status") or "").lower() == "completed"
        )

        # 4. Total customer payments processed through platform
        customer_txs = supabase.table("mpesa_transactions").select("amount, status").execute()
        txs = customer_txs.data or []
        gross_processed = sum(
            float(t.get("amount") or 0)
            for t in txs
            if (t.get("status") or "").lower() == "completed"
        )

        return {
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "trial_tenants": trial_tenants,
            "suspended_tenants": suspended_tenants,
            "total_end_subscribers": total_customers,
            "total_gross_processed": gross_processed,
            "total_commission_collected": collected_commission,
            "system_status": "operational",
            "server_time": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error computing platform metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tenants")
async def list_tenants(
    search: Optional[str] = None,
    status: Optional[str] = None,
    admin=Depends(require_super_admin)
):
    """Lists all onboarded ISP tenants with their usage and subscription status."""
    if not supabase:
        return []

    try:
        query = supabase.table("isp_tenants").select("*")
        if status and status != "all":
            query = query.eq("subscription_status", status)
        if search:
            query = query.ilike("company_name", f"%{search}%")

        res = query.order("created_at", desc=True).execute()
        tenants = res.data or []

        # Enhance tenants with subscriber counts
        enriched = []
        for t in tenants:
            isp_id = t["id"]
            cust_count = supabase.table("profiles").select("id", count="exact").eq("isp_id", isp_id).eq("role", "customer").execute()
            t["actual_customer_count"] = cust_count.count or 0
            enriched.append(t)

        return enriched
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tenants/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: str,
    req: TenantStatusUpdate,
    admin=Depends(require_super_admin)
):
    """Platform owner can suspend, freeze, or restore an ISP tenant."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database unavailable.")

    update_payload = {
        "subscription_status": req.status,
    }
    if req.is_frozen is not None:
        update_payload["is_frozen"] = req.is_frozen

    try:
        res = supabase.table("isp_tenants").update(update_payload).eq("id", tenant_id).execute()
        return {"status": "success", "tenant": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tenants/{tenant_id}/extend-trial")
async def extend_tenant_trial(
    tenant_id: str,
    req: TrialExtensionRequest,
    admin=Depends(require_super_admin)
):
    """Extends an ISP's trial period by the specified number of days."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database unavailable.")

    try:
        tenant_res = supabase.table("isp_tenants").select("trial_ends_at").eq("id", tenant_id).single().execute()
        if not tenant_res.data:
            raise HTTPException(status_code=404, detail="Tenant not found.")

        current_end = datetime.utcnow()
        if tenant_res.data.get("trial_ends_at"):
            try:
                current_end = datetime.fromisoformat(tenant_res.data["trial_ends_at"].replace("Z", "+00:00"))
            except Exception:
                current_end = datetime.utcnow()

        new_end = max(current_end, datetime.utcnow()) + timedelta(days=req.extra_days)

        res = supabase.table("isp_tenants").update({
            "trial_ends_at": new_end.isoformat(),
            "subscription_status": "trial",
            "is_frozen": False
        }).eq("id", tenant_id).execute()

        return {"status": "success", "new_trial_ends_at": new_end.isoformat()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tenants/{tenant_id}/commission-rate")
async def set_tenant_commission_rate(
    tenant_id: str,
    req: RevenuePercentageUpdate,
    admin=Depends(require_super_admin)
):
    """Configures custom platform commission percentage for a specific ISP."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database unavailable.")

    try:
        res = supabase.table("isp_tenants").update({
            "revenue_percentage": req.percentage
        }).eq("id", tenant_id).execute()
        return {"status": "success", "revenue_percentage": req.percentage}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
