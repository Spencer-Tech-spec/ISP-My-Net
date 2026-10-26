"""
Tenant Middleware — ISP SaaS
Extracts isp_id from JWT and injects it into every request.
Also enforces subscription limits.
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase
from typing import Optional
import os

security = HTTPBearer(auto_error=False)


class TenantContext:
    """Holds the current ISP tenant's context for a request."""
    def __init__(self, tenant: dict, user_id: str, user_role: str):
        self.isp_id: str = tenant["id"]
        self.tenant: dict = tenant
        self.user_id: str = user_id
        self.user_role: str = user_role
        self.plan_id: str = tenant.get("plan_id", "starter")
        self.subscription_status: str = tenant.get("subscription_status", "trial")

    @property
    def is_active(self) -> bool:
        if self.tenant.get("is_frozen", False):
            return False
        return self.subscription_status in ("trial", "active")

    @property
    def is_frozen(self) -> bool:
        return bool(self.tenant.get("is_frozen", False) or self.subscription_status in ("overdue", "suspended"))


    @property
    def is_owner_or_manager(self) -> bool:
        return self.user_role in ("owner", "manager")

    @property
    def is_owner(self) -> bool:
        return self.user_role == "owner"


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Validates the Bearer JWT and returns the Supabase user."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token. Please log in again.",
            )
        return user_response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
        )


async def get_tenant_context(
    request: Request,
    user=Depends(get_current_user),
) -> TenantContext:
    """
    Resolves the ISP tenant for the authenticated user.
    Checks subscription status and returns a TenantContext object.
    Allows the Super Admin to impersonate any ISP.
    """
    user_id = user.id
    email = user.email

    # Super Admin Flow: if impersonating or no specific role, bind to target or primary tenant
    if email in super_admins:
        if impersonate_isp_id:
            tenant_resp = supabase.table("isp_tenants").select("*").eq("id", impersonate_isp_id).single().execute()
            if tenant_resp.data:
                return TenantContext(tenant=tenant_resp.data, user_id=user_id, user_role="owner")
        
        # Fallback: bind to the first available ISP tenant so super admin is never locked out
        first_resp = supabase.table("isp_tenants").select("*").order("created_at", desc=True).limit(1).execute()
        if first_resp.data:
            return TenantContext(tenant=first_resp.data[0], user_id=user_id, user_role="owner")

    # Normal Flow: Find this user's role within an ISP
    role_response = supabase.table("isp_staff_roles") \
        .select("*, isp_tenants(*)") \
        .eq("user_id", user_id) \
        .eq("is_active", True) \
        .single() \
        .execute()

    if not role_response.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No ISP account found for this user. Please register your ISP first.",
        )

    tenant = role_response.data.get("isp_tenants")
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ISP tenant not found.",
        )

    user_role = role_response.data.get("role", "technician")
    ctx = TenantContext(tenant=tenant, user_id=user_id, user_role=user_role)

    # Enforce subscription status and overdue freeze
    billing_paths = ("/subscriptions", "/payhero/saas", "/payhero/settings")
    is_billing_request = any(request.url.path.startswith(p) for p in billing_paths)

    if not ctx.is_active:
        if is_billing_request:
            # Allow billing and payment endpoints so the owner can view invoices and pay
            return ctx

        status_msg = {
            "suspended": "Your ISP account has been suspended due to overdue platform fees.",
            "overdue": "SYSTEM UNRESPONSIVE: Account is locked due to overdue My Net platform invoice (3% monthly revenue). Please settle payment at /billing to restore access.",
            "expired": "Your ISP subscription has expired. Settle your platform bill at /billing to continue.",
            "cancelled": "Your ISP subscription has been cancelled.",
        }.get(ctx.subscription_status, "SYSTEM UNRESPONSIVE: Overdue 3% revenue platform fee.")

        if ctx.tenant.get("is_frozen"):
            status_msg = "SYSTEM UNRESPONSIVE: Account is locked due to overdue My Net platform invoice (3% monthly revenue). Access is restricted until payment is settled."

        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "SYSTEM_FROZEN",
                "message": status_msg,
                "subscription_status": ctx.subscription_status,
                "is_frozen": True,
                "overdue_amount": float(ctx.tenant.get("overdue_amount") or 0)
            }
        )

    return ctx



def require_role(*allowed_roles: str):
    """Dependency factory: restricts endpoint to specific roles."""
    async def role_checker(ctx: TenantContext = Depends(get_tenant_context)):
        if ctx.user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {', '.join(allowed_roles)}",
            )
        return ctx
    return role_checker


# Convenient pre-built dependencies
require_owner = require_role("owner")
require_manager = require_role("owner", "manager")
require_cashier = require_role("owner", "manager", "cashier")
require_any_staff = require_role("owner", "manager", "technician", "cashier")


async def check_customer_limit(ctx: TenantContext):
    """Raises 403 if ISP has reached their plan's customer limit."""
    plan_response = supabase.table("subscription_plans") \
        .select("max_customers") \
        .eq("id", ctx.plan_id) \
        .single() \
        .execute()

    if not plan_response.data:
        return  # Can't verify, allow through

    max_customers = plan_response.data["max_customers"]
    if max_customers == -1:
        return  # Unlimited plan

    current_count = supabase.table("profiles") \
        .select("id", count="exact") \
        .eq("isp_id", ctx.isp_id) \
        .eq("role", "customer") \
        .execute()

    if current_count.count >= max_customers:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Customer limit reached ({max_customers}). Upgrade your plan to add more customers.",
        )


async def check_staff_limit(ctx: TenantContext):
    """Raises 403 if ISP has reached their plan's staff limit."""
    plan_response = supabase.table("subscription_plans") \
        .select("max_staff") \
        .eq("id", ctx.plan_id) \
        .single() \
        .execute()

    if not plan_response.data:
        return

    max_staff = plan_response.data["max_staff"]
    if max_staff == -1:
        return  # Unlimited

    current_count = supabase.table("isp_staff_roles") \
        .select("id", count="exact") \
        .eq("isp_id", ctx.isp_id) \
        .eq("is_active", True) \
        .execute()

    if current_count.count >= max_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Staff limit reached ({max_staff}). Upgrade your plan to add more staff.",
        )
