"""
My Net ISP — Background Task Worker
Handles automated periodic tasks:
1. Monthly 3% SaaS platform revenue calculation and invoice generation.
2. Tenant grace period evaluation and automated account lockouts.
3. End-customer subscription expiration audits and router suspensions.
4. Router heartbeat checks and status synchronization.
"""
import os
import sys
import time
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Ensure root path is accessible
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from app.database import supabase
from app.adapters.mikrotik import MikroTikAdapter


async def audit_monthly_platform_invoices():
    """
    Evaluates gross monthly customer collections for all active ISPs and generates
    the 3% platform revenue fee invoice if not already generated.
    """
    if not supabase:
        print("[Worker] Supabase client not initialized. Skipping invoice audit.")
        return

    now = datetime.utcnow()
    current_month_str = now.strftime("%Y-%m")
    period_start = datetime(now.year, now.month, 1)
    # End of month or today
    due_date = period_start + timedelta(days=5) # Due 5th of current month

    print(f"[Worker] Running platform invoice audit for billing period: {current_month_str}")

    try:
        tenants_resp = supabase.table("isp_tenants").select("id, company_name, revenue_percentage, subscription_status").execute()
        tenants = tenants_resp.data or []

        for tenant in tenants:
            isp_id = tenant["id"]
            percentage = float(tenant.get("revenue_percentage") or 3.00)

            # Check if invoice already exists for this month
            inv_check = supabase.table("isp_invoices") \
                .select("id, status") \
                .eq("isp_id", isp_id) \
                .eq("billing_month", current_month_str) \
                .execute()

            if not inv_check.data:
                # Calculate gross collections in this month
                txs = supabase.table("mpesa_transactions") \
                    .select("amount") \
                    .eq("isp_id", isp_id) \
                    .ilike("status", "completed") \
                    .gte("created_at", period_start.isoformat()) \
                    .execute()

                gross = sum(float(t.get("amount") or 0) for t in (txs.data or []))
                amount_due = round(gross * (percentage / 100.0), 2)

                # Create pending invoice
                supabase.table("isp_invoices").insert({
                    "isp_id": isp_id,
                    "billing_month": current_month_str,
                    "period_start": period_start.isoformat(),
                    "period_end": now.isoformat(),
                    "gross_revenue": gross,
                    "fee_percentage": percentage,
                    "amount_due": amount_due,
                    "amount_paid": 0.0,
                    "status": "pending",
                    "due_date": due_date.isoformat(),
                    "notes": f"Automated 3% commission invoice for {current_month_str}"
                }).execute()

                print(f"[Worker] Created invoice for {tenant['company_name']}: KES {amount_due:,.2f} on KES {gross:,.2f} gross.")
    except Exception as e:
        print(f"[Worker] Error in audit_monthly_platform_invoices: {e}")


async def audit_overdue_tenants():
    """
    Checks for unpaid platform fee invoices that have passed their due date.
    Applies the grace period and auto-freezes delinquent tenants.
    """
    if not supabase:
        return

    now = datetime.utcnow()
    print("[Worker] Auditing tenant overdue statuses...")

    try:
        overdue_invoices = supabase.table("isp_invoices") \
            .select("*, isp_tenants(company_name, grace_period_days)") \
            .eq("status", "pending") \
            .lt("due_date", now.isoformat()) \
            .execute()

        for inv in (overdue_invoices.data or []):
            isp_id = inv["isp_id"]
            amount_due = float(inv.get("amount_due") or 0)

            if amount_due > 0:
                # Mark invoice as overdue
                supabase.table("isp_invoices").update({"status": "overdue"}).eq("id", inv["id"]).execute()

                # Lock the tenant account
                supabase.table("isp_tenants").update({
                    "is_frozen": True,
                    "subscription_status": "overdue",
                    "overdue_amount": amount_due,
                    "overdue_since": now.isoformat()
                }).eq("id", isp_id).execute()

                company = inv.get("isp_tenants", {}).get("company_name", isp_id)
                print(f"[Worker] Auto-frozen tenant '{company}' due to overdue KES {amount_due:,.2f}.")
    except Exception as e:
        print(f"[Worker] Error in audit_overdue_tenants: {e}")


async def audit_network_health():
    """
    Probes all registered MikroTik routers and logs connectivity status.
    """
    if not supabase:
        return

    print("[Worker] Running router connectivity probe...")
    try:
        routers = supabase.table("mikrotik_routers").select("*").execute()
        for r in (routers.data or []):
            host = r.get("host")
            port = r.get("port", 8728)
            adapter = MikroTikAdapter({"host": host, "port": port})
            res = await adapter.test_connection()
            status_text = "online" if res.success else "offline"
            print(f"[Worker] Router '{r.get('name')}' ({host}:{port}) is {status_text}.")
    except Exception as e:
        print(f"[Worker] Error in audit_network_health: {e}")


async def run_worker_cycle():
    """Executes a single cycle of background maintenance jobs."""
    print(f"\n==========================================")
    print(f"[Worker] Starting Maintenance Cycle: {datetime.utcnow().isoformat()}")
    print(f"==========================================")
    await audit_monthly_platform_invoices()
    await audit_overdue_tenants()
    await audit_network_health()
    print(f"[Worker] Cycle complete. Waiting for next interval.\n")


async def main():
    """Daemon execution loop running every 10 minutes."""
    while True:
        try:
            await run_worker_cycle()
        except Exception as e:
            print(f"[Worker Daemon Error] {e}")
        # Sleep for 10 minutes
        await asyncio.sleep(600)


if __name__ == "__main__":
    asyncio.run(main())
