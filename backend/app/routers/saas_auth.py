"""
SaaS Auth Router — ISP Registration, Login & Onboarding
Handles ISP company sign-up and staff invitation.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional
import re
import uuid
from app.database import supabase
from app.utils.tenant import get_current_user, get_tenant_context, TenantContext, require_owner

router = APIRouter(prefix="/saas", tags=["SaaS Auth"])


# ─── Models ────────────────────────────────────────────────────────────────────

class RegisterISPRequest(BaseModel):
    company_name: str
    owner_email: EmailStr
    owner_name: str
    owner_password: Optional[str] = None
    phone: Optional[str] = None
    county: Optional[str] = None
    plan_id: str = "revenue_share_3"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class InviteStaffRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str  # 'manager', 'technician', 'cashier'
    password: str  # temporary password

class UpdateTenantRequest(BaseModel):
    company_name: Optional[str] = None
    phone: Optional[str] = None
    county: Optional[str] = None
    mpesa_shortcode: Optional[str] = None
    mpesa_consumer_key: Optional[str] = None
    mpesa_consumer_secret: Optional[str] = None
    mpesa_passkey: Optional[str] = None
    mpesa_environment: Optional[str] = None
    mikrotik_host: Optional[str] = None
    mikrotik_username: Optional[str] = None
    mikrotik_password: Optional[str] = None
    smartolt_api_url: Optional[str] = None
    smartolt_api_key: Optional[str] = None
    primary_color: Optional[str] = None


# ─── Helpers ───────────────────────────────────────────────────────────────────

def generate_slug(company_name: str) -> str:
    """Converts 'Alpha Net Kenya' → 'alphanet-kenya'"""
    slug = company_name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def ensure_unique_slug(base_slug: str) -> str:
    """Appends a suffix if the slug is already taken."""
    slug = base_slug
    counter = 1
    while True:
        existing = supabase.table("isp_tenants").select("id").eq("slug", slug).execute()
        if not existing.data:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register-isp", status_code=status.HTTP_201_CREATED)
async def register_isp(req: RegisterISPRequest):
    """
    Step 1 of ISP onboarding: creates the ISP tenant and owner user.
    Starts a 14-day free trial automatically.
    """
    # Validate plan with resilient connection handling
    try:
        plan_check = supabase.table("subscription_plans").select("id").eq("id", req.plan_id).execute()
        if not plan_check.data and req.plan_id not in ("revenue_share_3", "starter", "standard", "enterprise"):
            raise HTTPException(status_code=400, detail=f"Invalid plan: {req.plan_id}")
    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        if "getaddrinfo failed" in err_msg or "ConnectError" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection error: Cannot reach Supabase (DNS resolution failed). Your Supabase project may be paused in your Supabase dashboard. Please go to https://supabase.com/dashboard and click 'Restore project' (or verify your SUPABASE_URL in backend/.env)."
            )


    # Auto-generate password if none provided
    import string, random
    if not req.owner_password:
        req.owner_password = ''.join(random.choices(string.ascii_letters + string.digits + "!@#$%^&*", k=12))

    # Create Supabase auth user for the ISP owner
    try:
        auth_response = supabase.auth.admin.create_user({
            "email": req.owner_email,
            "password": req.owner_password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": req.owner_name,
                "role": "isp_owner",
            }
        })
        owner_id = auth_response.user.id
    except Exception as e:
        err = str(e)
        if "getaddrinfo failed" in err or "ConnectError" in err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection error: Cannot reach Supabase (DNS resolution failed). Your Supabase project may be paused in your Supabase dashboard. Please go to https://supabase.com/dashboard and click 'Restore project'."
            )
        if "already registered" in err.lower() or "already exists" in err.lower():
            # Check if an active tenant already exists for this email
            existing_tenant = supabase.table("isp_tenants").select("id").eq("owner_email", req.owner_email).execute()
            if existing_tenant.data:
                raise HTTPException(status_code=409, detail="An account with this email already exists. Please log in.")
            
            # Interrupted registration recovery: user was created in auth but tenant failed
            try:
                users = supabase.auth.admin.list_users()
                matching_user = next((u for u in users if u.email == req.owner_email), None)
                if matching_user:
                    owner_id = matching_user.id
                    if req.owner_password:
                        supabase.auth.admin.update_user_by_id(owner_id, {
                            "password": req.owner_password,
                            "user_metadata": {
                                "full_name": req.owner_name,
                                "role": "isp_owner",
                            }
                        })
                else:
                    raise HTTPException(status_code=409, detail="An account with this email already exists.")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=409, detail="An account with this email already exists.")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to create user account: {err}")

    # Generate unique slug for the ISP
    base_slug = generate_slug(req.company_name)
    slug = ensure_unique_slug(base_slug)

    # Calculate trial end date (14-day free trial)
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    trial_end = (now + timedelta(days=14)).isoformat()

    # Ensure subscription plan exists in DB (avoid foreign key violation)
    try:
        chosen_plan = req.plan_id or "revenue_share_3"
        plan_check = supabase.table("subscription_plans").select("id").eq("id", chosen_plan).execute()
        if not plan_check.data:
            supabase.table("subscription_plans").upsert({
                "id": "revenue_share_3",
                "name": "Revenue Share (3%)",
                "price_monthly": 0,
                "max_customers": -1,
                "max_staff": -1,
                "ai_assistant": True,
                "sms_limit": -1,
                "analytics": True,
                "priority_support": True,
                "api_access": True,
                "white_labeling": True,
                "features": [
                    "Pay strictly 3% of collected monthly revenue",
                    "Zero upfront fixed fees",
                    "Unlimited Customers & Staff",
                    "M-Pesa Daraja & PayHero Gateways",
                    "MikroTik & SmartOLT Automation",
                    "Overdue Auto-Lock & Recovery",
                    "24/7 AI Network Operations"
                ]
            }).execute()
            req.plan_id = "revenue_share_3"
    except Exception as pe:
        logger.warning(f"Subscription plan check warning: {pe}")

    # Create the ISP tenant record
    try:
        tenant_response = supabase.table("isp_tenants").insert({
            "company_name": req.company_name,
            "slug": slug,
            "owner_id": owner_id,
            "owner_email": req.owner_email,
            "phone": req.phone,
            "county": req.county,
            "plan_id": req.plan_id,
            "subscription_status": "trial",
            "trial_ends_at": trial_end,
            "subscription_ends_at": trial_end,
            "temp_password": req.owner_password,
        }).execute()

        if not tenant_response.data:
            raise Exception("No data returned from tenant creation")

        tenant_id = tenant_response.data[0]["id"]
    except Exception as e:
        # Rollback: delete the profile and auth user we just created
        try:
            supabase.table("profiles").delete().eq("id", owner_id).execute()
        except Exception:
            pass
        try:
            supabase.auth.admin.delete_user(owner_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to create ISP tenant: {str(e)}")

    # Assign the 'owner' role to this user
    try:
        supabase.table("isp_staff_roles").insert({
            "isp_id": tenant_id,
            "user_id": owner_id,
            "role": "owner",
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign owner role: {str(e)}")

    # Create profile for the owner
    try:
        supabase.table("profiles").upsert({
            "id": owner_id,
            "full_name": req.owner_name,
            "role": "admin",
            "isp_id": tenant_id,
        }).execute()
    except Exception as e:
        print(f"Warning: Could not create profile for owner: {e}")

    return {
        "status": "success",
        "message": f"Welcome to ISP Cloud! Your 14-day free trial has started.",
        "isp_id": tenant_id,
        "slug": slug,
        "trial_ends": "14 days from now",
        "next_step": "Complete your setup at /onboarding",
    }


@router.post("/login")
async def saas_login(req: LoginRequest):
    """Resilient login endpoint that authenticates via Supabase server-side."""
    try:
        auth_res = supabase.auth.sign_in_with_password({
            "email": req.email.strip(),
            "password": req.password.strip(),
        })
        if not auth_res or not auth_res.session:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        session = auth_res.session
        user = auth_res.user

        # Fetch tenant info
        tenant = None
        try:
            t_res = supabase.table("isp_tenants").select("*").eq("owner_id", user.id).execute()
            if t_res.data:
                tenant = t_res.data[0]
        except Exception:
            pass

        # Fetch profile role
        role = "admin"
        try:
            p_res = supabase.table("profiles").select("role").eq("id", user.id).single().execute()
            if p_res.data and p_res.data.get("role"):
                role = p_res.data["role"]
        except Exception:
            pass

        return {
            "status": "success",
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata,
            },
            "role": role,
            "tenant": tenant,
        }
    except HTTPException:
        raise
    except Exception as e:
        err = str(e)
        if "invalid" in err.lower() or "credentials" in err.lower():
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        raise HTTPException(status_code=500, detail=f"Login failed: {err}")


@router.get("/my-tenant")
async def get_my_tenant(ctx: TenantContext = Depends(get_tenant_context)):
    """Returns the current user's ISP tenant info + subscription status."""
    # Fetch plan details alongside tenant
    plan = supabase.table("subscription_plans") \
        .select("*") \
        .eq("id", ctx.plan_id) \
        .single() \
        .execute()

    return {
        "tenant": ctx.tenant,
        "user_role": ctx.user_role,
        "plan": plan.data,
        "subscription_status": ctx.subscription_status,
        "is_active": ctx.is_active,
    }


@router.put("/my-tenant")
async def update_tenant(
    req: UpdateTenantRequest,
    ctx: TenantContext = Depends(require_owner),
):
    """ISP Owner updates their company settings (MikroTik, M-Pesa config, etc.)."""
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    response = supabase.table("isp_tenants") \
        .update(update_data) \
        .eq("id", ctx.isp_id) \
        .execute()

    return {"status": "success", "updated": update_data}


@router.post("/invite-staff")
async def invite_staff(
    req: InviteStaffRequest,
    ctx: TenantContext = Depends(require_owner),
):
    """ISP Owner invites a staff member (manager/technician/cashier)."""
    from app.utils.tenant import check_staff_limit
    await check_staff_limit(ctx)

    valid_roles = ("manager", "technician", "cashier")
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(valid_roles)}")

    # Create auth user for staff
    try:
        auth_response = supabase.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {"full_name": req.full_name, "role": req.role}
        })
        staff_id = auth_response.user.id
    except Exception as e:
        if "already" in str(e).lower():
            raise HTTPException(status_code=409, detail="A user with this email already exists.")
        raise HTTPException(status_code=500, detail=str(e))

    # Assign role
    supabase.table("isp_staff_roles").insert({
        "isp_id": ctx.isp_id,
        "user_id": staff_id,
        "role": req.role,
        "invited_by": ctx.user_id,
    }).execute()

    # Create profile
    supabase.table("profiles").upsert({
        "id": staff_id,
        "full_name": req.full_name,
        "role": req.role,
        "isp_id": ctx.isp_id,
    }).execute()

    # Create employee record
    supabase.table("employees").insert({
        "id": staff_id,
        "base_salary": 0,
        "current_balance": 0,
        "isp_id": ctx.isp_id,
    }).execute()

    # Welcome notification
    supabase.table("employee_notifications").insert({
        "employee_id": staff_id,
        "title": f"Welcome to {ctx.tenant['company_name']}!",
        "body": f"Hi {req.full_name}, your account is ready. Your role is: {req.role.title()}.",
        "type": "info",
        "isp_id": ctx.isp_id,
    }).execute()

    return {
        "status": "success",
        "message": f"Staff member {req.full_name} added as {req.role}.",
        "user_id": staff_id,
    }


@router.get("/staff")
async def list_staff(ctx: TenantContext = Depends(require_owner)):
    """Lists all staff members for this ISP."""
    response = supabase.table("isp_staff_roles") \
        .select("*, profiles!user_id(full_name, email)") \
        .eq("isp_id", ctx.isp_id) \
        .eq("is_active", True) \
        .execute()
    return response.data


@router.delete("/staff/{user_id}")
async def deactivate_staff(user_id: str, ctx: TenantContext = Depends(require_owner)):
    """Deactivates a staff member (does not delete their account)."""
    if user_id == ctx.user_id:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself.")

    supabase.table("isp_staff_roles") \
        .update({"is_active": False}) \
        .eq("isp_id", ctx.isp_id) \
        .eq("user_id", user_id) \
        .execute()

    return {"status": "success", "message": "Staff member deactivated."}
