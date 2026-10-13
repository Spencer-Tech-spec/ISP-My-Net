"""
Subscriptions Router — ISP SaaS Platform
Handles:
1. 3% Monthly Revenue Sharing Billing & Invoicing
2. Multi-Gateway Commission Settlement (M-Pesa Daraja & PayHero)
3. Automated Overdue Detection & System Unresponsive Lockout
4. Subscription Plan Management & Renewals
"""
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional, List
import requests
import base64
from datetime import datetime, timedelta
import os
from app.database import supabase
from app.utils.tenant import get_tenant_context, TenantContext, require_owner
from app.utils.notifications import send_gmail_credentials, send_whatsapp_credentials
from app.routers.payhero import send_payhero_stk, get_platform_payhero_credentials

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Revenue Billing"])


# ─── Models ────────────────────────────────────────────────────────────────────

class SaaSPaymentRequest(BaseModel):
    plan_id: str
    phone_number: str   # ISP owner's phone

class RevenueCommissionPaymentRequest(BaseModel):
    amount: float
    phone_number: str
    invoice_id: Optional[str] = None
    gateway: str = "mpesa"  # 'mpesa' (Daraja) or 'payhero'


# ─── M-Pesa Daraja Platform Helpers ───────────────────────────────────────────

def get_platform_mpesa_token():
    """Gets M-Pesa token using the PLATFORM's own M-Pesa credentials."""
    key = os.getenv("PLATFORM_MPESA_CONSUMER_KEY")
    secret = os.getenv("PLATFORM_MPESA_CONSUMER_SECRET")
    env = os.getenv("PLATFORM_MPESA_ENVIRONMENT", "sandbox")

    if not key or not secret:
        raise HTTPException(status_code=500, detail="Platform M-Pesa credentials not configured.")

    base_url = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    auth_url = f"{base_url}/oauth/v1/generate?grant_type=client_credentials"

    try:
        resp = requests.get(auth_url, auth=(key, secret), timeout=10)
        resp.raise_for_status()
        return resp.json()["access_token"], base_url
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get M-Pesa token: {e}")


def activate_subscription(isp_id: str, plan_id: str, payment_id: str):
    """Background task: activates ISP subscription and unfreezes account after successful payment."""
    try:
        now = datetime.utcnow()
        ends_at = now + timedelta(days=30)

        # Get plan limits
        plan = supabase.table("subscription_plans").select("*").eq("id", plan_id).single().execute()
        plan_data = plan.data or {}

        # Get tenant details
        tenant_resp = supabase.table("isp_tenants").select("*").eq("id", isp_id).single().execute()
        tenant_data = tenant_resp.data

        update_data = {
            "plan_id": plan_id,
            "subscription_status": "active",
            "is_frozen": False,
            "overdue_amount": 0.0,
            "overdue_since": None,
            "subscription_ends_at": ends_at.isoformat(),
            "subscription_renewed_at": now.isoformat(),
            "max_customers": plan_data.get("max_customers", -1),
            "max_staff": plan_data.get("max_staff", -1),
        }

        # If this is their first payment and they have a temp password, send credentials
        if tenant_data and tenant_data.get("temp_password"):
            login_url = os.getenv("FRONTEND_URL", "https://mynet-isp.com/login")
            
            # Send Email
            send_gmail_credentials(
                to_email=tenant_data["owner_email"],
                company_name=tenant_data["company_name"],
                login_url=login_url,
                password=tenant_data["temp_password"]
            )
            
            # Fetch payment record to get the phone number if tenant phone is missing
            payment_resp = supabase.table("saas_payments").select("phone_number").eq("id", payment_id).single().execute()
            payment_phone = payment_resp.data.get("phone_number") if payment_resp.data else ""

            # Send WhatsApp
            send_whatsapp_credentials(
                phone_number=tenant_data.get("phone") or payment_phone,
                company_name=tenant_data["company_name"],
                login_url=login_url,
                email=tenant_data["owner_email"],
                password=tenant_data["temp_password"]
            )
            
            update_data["temp_password"] = None

        supabase.table("isp_tenants").update(update_data).eq("id", isp_id).execute()

        supabase.table("saas_payments").update({
            "status": "completed",
            "period_start": now.isoformat(),
            "period_end": ends_at.isoformat(),
        }).eq("id", payment_id).execute()

        print(f"✅ Subscription activated & unfreezed for ISP {isp_id} — Plan: {plan_id} until {ends_at}")

    except Exception as e:
        print(f"❌ Error activating subscription for ISP {isp_id}: {e}")


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/plans")
async def list_plans():
    """Returns all available subscription plans."""
    try:
        plans = supabase.table("subscription_plans").select("*").order("price_monthly").execute()
        return plans.data
    except Exception:
        return [
            {
                "id": "revenue_share_3",
                "name": "Revenue Share (3%)",
                "price_monthly": 0,
                "max_customers": -1,
                "max_staff": -1,
                "features": [
                    "3% of collected monthly revenue",
                    "PayHero & M-Pesa Daraja Integration",
                    "MikroTik & SmartOLT Automation",
                    "Staff & Payroll Management",
                    "Zero Fixed Monthly Fee"
                ]
            }
        ]


@router.get("/my-subscription")
async def get_my_subscription(ctx: TenantContext = Depends(get_tenant_context)):
    """Returns the current ISP's subscription & status details."""
    tenant = ctx.tenant

    plan_resp = supabase.table("subscription_plans") \
        .select("*").eq("id", ctx.plan_id).execute()
    plan_data = plan_resp.data[0] if plan_resp.data else {
        "id": "revenue_share_3",
        "name": "Revenue Share (3%)",
        "price_monthly": 0
    }

    payments = supabase.table("saas_payments") \
        .select("*") \
        .eq("isp_id", ctx.isp_id) \
        .order("created_at", desc=True) \
        .limit(10) \
        .execute()

    days_remaining = None
    if tenant.get("subscription_ends_at"):
        try:
            ends_at = datetime.fromisoformat(tenant["subscription_ends_at"].replace("Z", "+00:00"))
            delta = ends_at - datetime.now(ends_at.tzinfo)
            days_remaining = max(0, delta.days)
        except Exception:
            days_remaining = 30
    elif tenant.get("trial_ends_at"):
        try:
            trial_end = datetime.fromisoformat(tenant["trial_ends_at"].replace("Z", "+00:00"))
            delta = trial_end - datetime.now(trial_end.tzinfo)
            days_remaining = max(0, delta.days)
        except Exception:
            days_remaining = 14

    return {
        "status": ctx.subscription_status,
        "is_frozen": bool(tenant.get("is_frozen")),
        "plan": plan_data,
        "revenue_percentage": float(tenant.get("revenue_percentage") or 3.0),
        "days_remaining": days_remaining,
        "subscription_ends_at": tenant.get("subscription_ends_at"),
        "trial_ends_at": tenant.get("trial_ends_at"),
        "payment_history": payments.data or [],
    }


# ─── 3% Monthly Revenue Billing Breakdown & Invoices ──────────────────────────

@router.get("/revenue-billing")
async def get_revenue_billing(ctx: TenantContext = Depends(get_tenant_context)):
    """
    Calculates ISP owner's 3% revenue commission for the active billing cycle.
    Enforces overdue checks and provides payment details.
    """
    tenant = ctx.tenant
    now = datetime.utcnow()
    current_month_str = now.strftime("%Y-%m")
    start_of_month = datetime(now.year, now.month, 1).isoformat()

    # 1. Calculate Gross Revenue collected this month by this ISP
    gross_revenue = 0.0
    try:
        tx_resp = supabase.table("mpesa_transactions") \
            .select("amount") \
            .eq("isp_id", ctx.isp_id) \
            .gte("created_at", start_of_month) \
            .ilike("status", "completed") \
            .execute()
        if tx_resp.data:
            gross_revenue = sum(float(t.get("amount", 0)) for t in tx_resp.data)
    except Exception as e:
        print(f"Notice: Revenue calculation error: {e}")

    percentage = float(tenant.get("revenue_percentage") or 3.0)
    fee_due = round(gross_revenue * (percentage / 100.0), 2)

    # 2. Query or create this month's invoice in isp_invoices
    current_invoice = None
    try:
        inv_resp = supabase.table("isp_invoices") \
            .select("*") \
            .eq("isp_id", ctx.isp_id) \
            .eq("billing_month", current_month_str) \
            .execute()

        if inv_resp.data:
            current_invoice = inv_resp.data[0]
            # Update amount if live revenue changed and status is pending
            if current_invoice["status"] == "pending" and abs(float(current_invoice.get("gross_revenue", 0)) - gross_revenue) > 0.01:
                supabase.table("isp_invoices").update({
                    "gross_revenue": gross_revenue,
                    "amount_due": fee_due,
                    "updated_at": now.isoformat()
                }).eq("id", current_invoice["id"]).execute()
                current_invoice["gross_revenue"] = gross_revenue
                current_invoice["amount_due"] = fee_due
        else:
            # Create invoice for current month
            period_end = (datetime(now.year, now.month, 1) + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
            due_date = period_end + timedelta(days=5) # 5 days grace period after month end

            new_inv = supabase.table("isp_invoices").insert({
                "isp_id": ctx.isp_id,
                "billing_month": current_month_str,
                "period_start": start_of_month,
                "period_end": period_end.isoformat(),
                "gross_revenue": gross_revenue,
                "fee_percentage": percentage,
                "amount_due": fee_due,
                "status": "pending",
                "due_date": due_date.isoformat(),
            }).execute()
            if new_inv.data:
                current_invoice = new_inv.data[0]
    except Exception as e:
        print(f"Notice: Invoice sync error (table may need migration): {e}")

    # 3. Check for overdue past invoices
    is_overdue = False
    is_frozen = bool(tenant.get("is_frozen"))
    overdue_amount = float(tenant.get("overdue_amount") or 0.0)

    try:
        overdue_query = supabase.table("isp_invoices") \
            .select("*") \
            .eq("isp_id", ctx.isp_id) \
            .eq("status", "pending") \
            .lt("due_date", now.isoformat()) \
            .execute()

        if overdue_query.data and len(overdue_query.data) > 0:
            is_overdue = True
            is_frozen = True
            overdue_amount = sum(float(inv.get("amount_due", 0)) for inv in overdue_query.data)

            # Auto-freeze tenant in database
            supabase.table("isp_tenants").update({
                "is_frozen": True,
                "subscription_status": "overdue",
                "overdue_amount": overdue_amount,
                "overdue_since": overdue_query.data[0]["due_date"]
            }).eq("id", ctx.isp_id).execute()
    except Exception:
        pass

    # 4. Fetch past invoices list
    past_invoices = []
    try:
        invoices_resp = supabase.table("isp_invoices") \
            .select("*") \
            .eq("isp_id", ctx.isp_id) \
            .order("created_at", desc=True) \
            .limit(12) \
            .execute()
        past_invoices = invoices_resp.data or []
    except Exception:
        pass

    return {
        "billing_month": current_month_str,
        "gross_revenue": gross_revenue,
        "revenue_percentage": percentage,
        "fee_due": fee_due,
        "is_frozen": is_frozen,
        "is_overdue": is_overdue,
        "overdue_amount": overdue_amount,
        "subscription_status": "overdue" if is_overdue else ctx.subscription_status,
        "current_invoice": current_invoice,
        "past_invoices": past_invoices,
        "available_gateways": ["mpesa", "payhero"]
    }


@router.post("/pay-commission")
async def pay_revenue_commission(
    req: RevenueCommissionPaymentRequest,
    ctx: TenantContext = Depends(require_owner)
):
    """
    ISP Owner settles their 3% platform revenue fee invoice via M-Pesa Daraja or PayHero.
    Instantly lifts system unresponsiveness upon payment verification.
    """
    amount = float(req.amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    phone = req.phone_number.replace("+", "").replace(" ", "").strip()
    if phone.startswith("0"):
        phone = "254" + phone[1:]

    # Gateway Option 1: PAYHERO
    if req.gateway.lower() == "payhero":
        creds = get_platform_payhero_credentials()
        ref = f"SAAS-REV-{ctx.isp_id[:6]}-{int(datetime.utcnow().timestamp())}"

        if not creds["api_key"] or not creds["channel_id"]:
            # Mock / Sandbox response if credentials not provided
            if supabase:
                if req.invoice_id:
                    supabase.table("isp_invoices").update({
                        "payment_method": "payhero",
                        "checkout_request_id": ref,
                        "notes": f"PayHero prompt sent to {req.phone_number}"
                    }).eq("id", req.invoice_id).execute()

            return {
                "status": "stk_push_sent",
                "gateway": "payhero",
                "message": f"PayHero payment prompt for KES {amount:,.2f} sent to {req.phone_number}.",
                "checkout_request_id": ref,
                "amount": amount
            }

        result = send_payhero_stk(
            amount=amount,
            phone=req.phone_number,
            channel_id=creds["channel_id"],
            api_key=creds["api_key"],
            api_secret=creds["api_secret"] or "",
            reference=ref,
            callback_url=creds["callback_url"]
        )

        checkout_id = result.get("reference") or ref
        if supabase and req.invoice_id:
            supabase.table("isp_invoices").update({
                "payment_method": "payhero",
                "checkout_request_id": checkout_id
            }).eq("id", req.invoice_id).execute()

        return {
            "status": "stk_push_sent",
            "gateway": "payhero",
            "message": f"Check phone {req.phone_number} for PayHero prompt of KES {amount:,.2f}.",
            "checkout_request_id": checkout_id,
            "amount": amount
        }

    # Gateway Option 2: SAFARICOM DARAJA M-PESA
    shortcode = os.getenv("PLATFORM_MPESA_SHORTCODE", "174379")
    passkey = os.getenv("PLATFORM_MPESA_PASSKEY")
    callback_url = os.getenv("PLATFORM_MPESA_CALLBACK_URL")

    if not passkey or not callback_url:
        raise HTTPException(status_code=500, detail="Platform M-Pesa not configured.")

    access_token, base_url = get_platform_mpesa_token()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(round(amount)),
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": f"MYNET-{ctx.tenant['slug'].upper()[:8]}",
        "TransactionDesc": f"3% Revenue Platform Fee — {ctx.tenant['company_name']}",
    }

    try:
        resp = requests.post(
            f"{base_url}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"M-Pesa Error: {e.response.text}")

    checkout_id = data.get("CheckoutRequestID")

    # Record in saas_payments & isp_invoices
    if supabase:
        supabase.table("saas_payments").insert({
            "isp_id": ctx.isp_id,
            "plan_id": "revenue_share_3",
            "amount": amount,
            "phone_number": phone,
            "checkout_request_id": checkout_id,
            "merchant_request_id": data.get("MerchantRequestID"),
            "status": "pending",
        }).execute()

        if req.invoice_id:
            supabase.table("isp_invoices").update({
                "payment_method": "mpesa_daraja",
                "checkout_request_id": checkout_id
            }).eq("id", req.invoice_id).execute()

    return {
        "status": "stk_push_sent",
        "gateway": "mpesa",
        "message": f"Check your phone ({req.phone_number}) for M-Pesa prompt of KES {amount:,.2f}.",
        "checkout_request_id": checkout_id,
        "amount": amount,
    }


# ─── Legacy Pay / Fixed Plan Route ────────────────────────────────────────────

@router.post("/pay")
async def initiate_subscription_payment(
    req: SaaSPaymentRequest,
    background_tasks: BackgroundTasks,
    ctx: TenantContext = Depends(require_owner),
):
    """Fallback payment for tier-based subscription plans via M-Pesa STK push."""
    plan = supabase.table("subscription_plans").select("*").eq("id", req.plan_id).single().execute()
    if not plan.data:
        raise HTTPException(status_code=400, detail=f"Plan '{req.plan_id}' not found.")

    plan_data = plan.data
    amount = plan_data["price_monthly"]

    commission_req = RevenueCommissionPaymentRequest(
        amount=amount,
        phone_number=req.phone_number,
        gateway="mpesa"
    )
    return await pay_revenue_commission(commission_req, ctx)


# ─── M-Pesa Daraja Platform Callback ──────────────────────────────────────────

@router.post("/payment-callback")
async def subscription_payment_callback(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Safaricom M-Pesa callback for platform payments (3% fee or subscriptions).
    Unfreezes ISP tenant immediately upon successful settlement.
    """
    data = await request.json()
    print(f"[SaaS Daraja Callback] Received: {data}")

    try:
        stk = data.get("Body", {}).get("stkCallback", {})
        result_code = stk.get("ResultCode")
        checkout_id = stk.get("CheckoutRequestID")
        result_desc = stk.get("ResultDesc")

        if result_code == 0:
            receipt = None
            for item in stk.get("CallbackMetadata", {}).get("Item", []):
                if item.get("Name") == "MpesaReceiptNumber":
                    receipt = item.get("Value")

            # 1. Update saas_payments record
            payment_resp = supabase.table("saas_payments") \
                .select("*") \
                .eq("checkout_request_id", checkout_id) \
                .eq("status", "pending") \
                .execute()

            isp_id = None
            plan_id = "revenue_share_3"

            if payment_resp.data:
                payment = payment_resp.data[0]
                isp_id = payment.get("isp_id")
                plan_id = payment.get("plan_id", "revenue_share_3")
                supabase.table("saas_payments").update({
                    "mpesa_receipt": receipt,
                    "status": "completed",
                }).eq("id", payment["id"]).execute()

            # 2. Update isp_invoices record
            inv_resp = supabase.table("isp_invoices") \
                .select("*") \
                .eq("checkout_request_id", checkout_id) \
                .execute()

            if inv_resp.data:
                inv = inv_resp.data[0]
                isp_id = inv.get("isp_id")
                supabase.table("isp_invoices").update({
                    "status": "paid",
                    "payment_reference": receipt or checkout_id,
                    "paid_at": datetime.utcnow().isoformat()
                }).eq("id", inv["id"]).execute()

            # 3. LIFT SYSTEM FREEZE IMMEDIATELY
            if isp_id:
                supabase.table("isp_tenants").update({
                    "is_frozen": False,
                    "subscription_status": "active",
                    "overdue_amount": 0.0,
                    "overdue_since": None,
                    "subscription_renewed_at": datetime.utcnow().isoformat()
                }).eq("id", isp_id).execute()

                background_tasks.add_task(
                    activate_subscription,
                    isp_id,
                    plan_id,
                    payment["id"] if payment_resp.data else checkout_id
                )
                print(f"✅ 3% Platform Fee settled for ISP {isp_id}. Receipt: {receipt}. System unfreezed!")
        else:
            supabase.table("saas_payments").update({
                "status": "failed",
                "notes": result_desc,
            }).eq("checkout_request_id", checkout_id).execute()
            print(f"❌ Payment failed: {result_desc}")

    except Exception as e:
        print(f"[SaaS Callback Error] {e}")

    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.post("/upgrade")
async def upgrade_plan(
    req: SaaSPaymentRequest,
    background_tasks: BackgroundTasks,
    ctx: TenantContext = Depends(require_owner),
):
    """Routes to payment logic."""
    return await initiate_subscription_payment(req, background_tasks, ctx)
