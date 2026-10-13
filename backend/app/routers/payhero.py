"""
PayHero Router & Gateway Integration — My Net ISP Platform
Provides PayHero STK Push, Webhook Callbacks, and Configuration for:
1. Platform SaaS Invoices (ISPs paying 3% revenue platform commission)
2. Customer Internet Billing (Subscribers paying their ISP)
"""
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Depends, status
from pydantic import BaseModel
from typing import Optional
import requests
import base64
import os
from datetime import datetime
from app.database import supabase
from app.utils.tenant import get_tenant_context, TenantContext, require_owner
from app.client_actions import activate_client

router = APIRouter(prefix="/payhero", tags=["PayHero Gateway"])

PAYHERO_API_BASE_URL = os.getenv("PAYHERO_API_URL", "https://backend.payhero.co.ke/api/v2")


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class PayHeroSaaSPaymentRequest(BaseModel):
    invoice_id: Optional[str] = None
    amount: float
    phone_number: str

class PayHeroCustomerPaymentRequest(BaseModel):
    phone_number: str
    amount: float
    account_reference: str = "MyNetISP"
    customer_name: Optional[str] = None
    package_id: Optional[str] = None

class PayHeroSettingsRequest(BaseModel):
    payhero_api_key: Optional[str] = None
    payhero_api_secret: Optional[str] = None
    payhero_channel_id: Optional[str] = None
    payhero_provider: Optional[str] = "m-pesa"
    preferred_gateway: Optional[str] = "both"  # 'mpesa', 'payhero', 'both'


# ─── Helper Functions ─────────────────────────────────────────────────────────

def format_kenyan_phone(phone: str) -> str:
    """Formats phone number into standard 07... or 254... format accepted by PayHero."""
    cleaned = phone.replace("+", "").replace(" ", "").strip()
    if cleaned.startswith("254") and len(cleaned) == 12:
        return "0" + cleaned[3:]  # PayHero often expects 07.../01... or 254...
    if cleaned.startswith("0") and len(cleaned) == 10:
        return cleaned
    if len(cleaned) == 9 and (cleaned.startswith("7") or cleaned.startswith("1")):
        return "0" + cleaned
    return cleaned


def get_platform_payhero_credentials():
    """Retrieves Platform PayHero credentials from environment variables."""
    api_key = os.getenv("PLATFORM_PAYHERO_API_KEY")
    api_secret = os.getenv("PLATFORM_PAYHERO_API_SECRET")
    channel_id = os.getenv("PLATFORM_PAYHERO_CHANNEL_ID")
    callback_url = os.getenv("PLATFORM_PAYHERO_CALLBACK_URL", "https://api.mynet-isp.com/payhero/saas/callback")

    return {
        "api_key": api_key,
        "api_secret": api_secret,
        "channel_id": channel_id,
        "callback_url": callback_url
    }


def send_payhero_stk(
    amount: float,
    phone: str,
    channel_id: str,
    api_key: str,
    api_secret: str,
    reference: str,
    callback_url: str,
    provider: str = "m-pesa"
) -> dict:
    """Dispatches STK push request to PayHero v2 API."""
    basic_auth = os.getenv("PLATFORM_PAYHERO_BASIC_AUTH")
    if basic_auth:
        auth_header = basic_auth if basic_auth.startswith("Basic ") else f"Basic {basic_auth}"
    else:
        auth_str = f"{api_key}:{api_secret}"
        b64_auth = base64.b64encode(auth_str.encode()).decode("utf-8")
        auth_header = f"Basic {b64_auth}"

    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json"
    }

    formatted_phone = format_kenyan_phone(phone)
    payload = {
        "amount": int(round(amount)),
        "phone_number": formatted_phone,
        "channel_id": int(channel_id) if channel_id and channel_id.isdigit() else channel_id,
        "provider": provider,
        "external_reference": reference,
        "callback_url": callback_url
    }

    url = f"{PAYHERO_API_BASE_URL}/payments"

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=15)
        resp_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"text": resp.text}
        
        if not resp.ok:
            raise HTTPException(
                status_code=400,
                detail=f"PayHero Error ({resp.status_code}): {resp_data.get('message', resp_data)}"
            )
        return resp_data
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with PayHero API: {str(e)}")


# ─── Endpoints: SaaS Platform 3% Invoices via PayHero ──────────────────────────

@router.post("/saas/pay")
async def pay_saas_invoice_with_payhero(
    req: PayHeroSaaSPaymentRequest,
    ctx: TenantContext = Depends(require_owner)
):
    """
    ISP owner pays their 3% platform revenue fee invoice using PayHero.
    Funds go to the platform owner's PayHero account.
    """
    creds = get_platform_payhero_credentials()
    if not creds["api_key"] or not creds["channel_id"]:
        # Fallback simulated response in dev/test if platform keys not configured yet
        ref_id = f"PH-SAAS-{ctx.isp_id[:8]}-{int(datetime.utcnow().timestamp())}"
        if supabase:
            # Record invoice payment attempt
            if req.invoice_id:
                supabase.table("isp_invoices").update({
                    "payment_method": "payhero",
                    "checkout_request_id": ref_id,
                    "notes": f"PayHero STK sent to {req.phone_number}"
                }).eq("id", req.invoice_id).execute()

            supabase.table("saas_payments").insert({
                "isp_id": ctx.isp_id,
                "plan_id": ctx.plan_id or "revenue_share_3",
                "amount": req.amount,
                "phone_number": req.phone_number,
                "checkout_request_id": ref_id,
                "status": "pending",
                "notes": "PayHero payment pending"
            }).execute()

        return {
            "status": "success",
            "message": f"PayHero payment prompt for KES {req.amount:,.2f} sent to {req.phone_number}. (Platform Mock/Sandbox active)",
            "reference": ref_id,
            "amount": req.amount
        }

    reference = f"SAAS-{req.invoice_id or ctx.isp_id[:8]}-{int(datetime.utcnow().timestamp())}"
    result = send_payhero_stk(
        amount=req.amount,
        phone=req.phone_number,
        channel_id=creds["channel_id"],
        api_key=creds["api_key"],
        api_secret=creds["api_secret"] or "",
        reference=reference,
        callback_url=creds["callback_url"]
    )

    ref_id = result.get("reference") or reference

    # Record in database
    if supabase:
        try:
            if req.invoice_id:
                supabase.table("isp_invoices").update({
                    "payment_method": "payhero",
                    "checkout_request_id": ref_id,
                    "notes": f"PayHero prompt sent to {req.phone_number}"
                }).eq("id", req.invoice_id).execute()

            supabase.table("saas_payments").insert({
                "isp_id": ctx.isp_id,
                "plan_id": ctx.plan_id or "revenue_share_3",
                "amount": req.amount,
                "phone_number": req.phone_number,
                "checkout_request_id": ref_id,
                "status": "pending"
            }).execute()
        except Exception as db_err:
            print(f"[PayHero] Database record warning (payment still dispatched): {db_err}")

    return {
        "status": "success",
        "message": f"PayHero prompt sent to {req.phone_number}. Enter M-Pesa PIN on your phone to complete payment.",
        "reference": ref_id,
        "amount": req.amount
    }


@router.post("/saas/callback")
async def payhero_saas_callback(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook called by PayHero when an ISP owner completes their 3% platform commission payment.
    Marks invoice paid, lifts system freeze, and restores full system responsiveness.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    print(f"[PayHero SaaS Callback] Payload: {data}")

    # Standardize PayHero response payload
    resp_obj = data.get("response", data)
    status_str = str(resp_obj.get("status", "")).upper()
    reference = resp_obj.get("external_reference") or resp_obj.get("reference")
    receipt = resp_obj.get("mpesa_receipt") or resp_obj.get("MpesaReceiptNumber") or resp_obj.get("receipt")
    amount = float(resp_obj.get("amount", 0))

    if not supabase or not reference:
        return {"status": "ok", "message": "Received"}

    if status_str in ("SUCCESS", "COMPLETED", "TRUE"):
        # 1. Update saas_payments table
        payment_resp = supabase.table("saas_payments").select("*").eq("checkout_request_id", reference).execute()
        isp_id = None
        if payment_resp.data:
            payment = payment_resp.data[0]
            isp_id = payment.get("isp_id")
            supabase.table("saas_payments").update({
                "status": "completed",
                "mpesa_receipt": receipt,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", payment["id"]).execute()

        # 2. Update isp_invoices table if matched by checkout_request_id
        inv_resp = supabase.table("isp_invoices").select("*").eq("checkout_request_id", reference).execute()
        if inv_resp.data:
            inv = inv_resp.data[0]
            isp_id = inv.get("isp_id")
            supabase.table("isp_invoices").update({
                "status": "paid",
                "payment_reference": receipt or reference,
                "paid_at": datetime.utcnow().isoformat(),
                "amount_paid": amount or inv.get("amount_due", 0),
                "notes": "Paid successfully via PayHero"
            }).eq("id", inv["id"]).execute()

        # 3. LIFT SYSTEM FREEZE FOR ISP TENANT
        if isp_id:
            supabase.table("isp_tenants").update({
                "is_frozen": False,
                "subscription_status": "active",
                "overdue_amount": 0,
                "overdue_since": None,
                "subscription_renewed_at": datetime.utcnow().isoformat()
            }).eq("id", isp_id).execute()
            print(f"✅ PayHero: System freeze lifted for ISP {isp_id}. Account restored to Active.")

    elif status_str in ("FAILED", "CANCELLED"):
        supabase.table("saas_payments").update({
            "status": "failed",
            "notes": "PayHero payment failed or cancelled by user"
        }).eq("checkout_request_id", reference).execute()

    return {"status": "success", "message": "PayHero callback processed"}


# ─── Endpoints: Customer Internet Payments via PayHero ─────────────────────────

@router.post("/customer/stk")
async def payhero_customer_stk(
    req: PayHeroCustomerPaymentRequest,
    ctx: TenantContext = Depends(get_tenant_context)
):
    """
    ISP subscriber pays for their internet package via PayHero.
    Uses the ISP's own configured PayHero channel credentials.
    """
    tenant = ctx.tenant
    api_key = tenant.get("payhero_api_key") or os.getenv("PLATFORM_PAYHERO_API_KEY")
    api_secret = tenant.get("payhero_api_secret") or os.getenv("PLATFORM_PAYHERO_API_SECRET", "")
    channel_id = tenant.get("payhero_channel_id") or os.getenv("PLATFORM_PAYHERO_CHANNEL_ID")
    callback_url = os.getenv("PAYHERO_CUSTOMER_CALLBACK_URL", "https://api.mynet-isp.com/payhero/customer/callback")

    if not api_key or not channel_id:
        raise HTTPException(
            status_code=400,
            detail="PayHero is not configured for this ISP. Please configure PayHero in Settings or use standard M-Pesa."
        )

    ref = f"CUST-{ctx.isp_id[:6]}-{int(datetime.utcnow().timestamp())}"
    result = send_payhero_stk(
        amount=req.amount,
        phone=req.phone_number,
        channel_id=channel_id,
        api_key=api_key,
        api_secret=api_secret,
        reference=ref,
        callback_url=callback_url,
        provider=tenant.get("payhero_provider", "m-pesa")
    )

    # Save to customer transactions
    if supabase:
        supabase.table("mpesa_transactions").insert({
            "phone_number": req.phone_number,
            "amount": req.amount,
            "account_reference": req.account_reference,
            "checkout_request_id": result.get("reference") or ref,
            "status": "PENDING",
            "result_desc": "PayHero STK Initiated",
            "gateway": "payhero",
            "isp_id": ctx.isp_id
        }).execute()

    return {
        "status": "success",
        "message": f"PayHero payment prompt of KES {req.amount:,.2f} sent to {req.phone_number}",
        "reference": result.get("reference") or ref
    }


@router.post("/customer/callback")
async def payhero_customer_callback(request: Request, background_tasks: BackgroundTasks):
    """
    PayHero webhook for subscriber internet package payments.
    Triggers client network activation.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    print(f"[PayHero Customer Callback] Received: {data}")
    resp_obj = data.get("response", data)
    status_str = str(resp_obj.get("status", "")).upper()
    reference = resp_obj.get("external_reference") or resp_obj.get("reference")
    receipt = resp_obj.get("mpesa_receipt") or resp_obj.get("MpesaReceiptNumber")
    phone = resp_obj.get("phone") or resp_obj.get("phone_number")

    if not supabase or not reference:
        return {"status": "ok"}

    if status_str in ("SUCCESS", "COMPLETED", "TRUE"):
        update_data = {
            "status": "COMPLETED",
            "result_desc": "PayHero payment successful",
            "mpesa_receipt_number": receipt or reference,
            "updated_at": datetime.utcnow().isoformat()
        }
        res = supabase.table("mpesa_transactions").update(update_data).eq("checkout_request_id", reference).execute()
        
        target_phone = phone
        if not target_phone and res.data:
            target_phone = res.data[0].get("phone_number")

        if target_phone:
            print(f"✅ PayHero Customer payment verified for {target_phone}. Activating client service...")
            background_tasks.add_task(activate_client, target_phone)
    else:
        supabase.table("mpesa_transactions").update({
            "status": "FAILED",
            "result_desc": "PayHero payment failed or declined"
        }).eq("checkout_request_id", reference).execute()

    return {"status": "success"}


# ─── Endpoints: PayHero Tenant Settings ───────────────────────────────────────

@router.get("/settings")
async def get_payhero_settings(ctx: TenantContext = Depends(require_owner)):
    """Fetches the PayHero settings for the authenticated ISP."""
    tenant = ctx.tenant
    return {
        "payhero_api_key": tenant.get("payhero_api_key") or "",
        "payhero_channel_id": tenant.get("payhero_channel_id") or "",
        "payhero_provider": tenant.get("payhero_provider") or "m-pesa",
        "preferred_gateway": tenant.get("preferred_gateway") or "both",
        "has_api_secret": bool(tenant.get("payhero_api_secret"))
    }


@router.post("/settings")
async def update_payhero_settings(
    settings: PayHeroSettingsRequest,
    ctx: TenantContext = Depends(require_owner)
):
    """Updates the PayHero gateway credentials for the authenticated ISP."""
    update_data = {}
    if settings.payhero_api_key is not None:
        update_data["payhero_api_key"] = settings.payhero_api_key
    if settings.payhero_api_secret is not None and settings.payhero_api_secret != "":
        update_data["payhero_api_secret"] = settings.payhero_api_secret
    if settings.payhero_channel_id is not None:
        update_data["payhero_channel_id"] = settings.payhero_channel_id
    if settings.payhero_provider is not None:
        update_data["payhero_provider"] = settings.payhero_provider
    if settings.preferred_gateway is not None:
        update_data["preferred_gateway"] = settings.preferred_gateway

    if not update_data:
        raise HTTPException(status_code=400, detail="No settings provided to update.")

    supabase.table("isp_tenants").update(update_data).eq("id", ctx.isp_id).execute()

    return {"status": "success", "message": "PayHero settings saved successfully."}
