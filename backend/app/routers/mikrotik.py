from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import socket
import secrets
import string
import os
from datetime import datetime, timedelta
from app.database import supabase

router = APIRouter(
    prefix="/mikrotik",
    tags=["mikrotik"],
)

class MikroTikConnection(BaseModel):
    host: str
    username: str
    password: str
    port: int = 8728

class RescueVoucherRequest(BaseModel):
    phone_number: str
    router_id: Optional[int] = None
    package_id: Optional[int] = None
    package_name: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[int] = None
    speed_limit: Optional[str] = "5M/5M"
    mpesa_receipt: Optional[str] = None
    notes: Optional[str] = None
    allocated_by: Optional[str] = "admin"

class PackageCreateRequest(BaseModel):
    name: str
    price: int
    duration_label: str
    duration_minutes: int
    speed_limit: str = "5M/5M"
    data_limit_mb: int = 0
    device_limit: int = 1
    router_id: Optional[int] = None

def generate_voucher_code(prefix: str = "MNET") -> str:
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '') # Avoid confusing chars
    rand_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"{prefix}-{rand_part[:3]}-{rand_part[3:]}"

@router.post("/test-connection")
async def test_connection(conn: MikroTikConnection):
    """
    Tests raw socket connectivity to the MikroTik host and port.
    """
    if not conn.host:
        raise HTTPException(status_code=400, detail="Host / IP is required")
    
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3.0)
        result = s.connect_ex((conn.host, conn.port))
        s.close()
        
        if result == 0:
            return {
                "status": "success",
                "connected": True,
                "message": f"Successfully reached MikroTik Router at {conn.host}:{conn.port}"
            }
        else:
            return {
                "status": "warning",
                "connected": False,
                "message": f"Could not connect to {conn.host}:{conn.port} (Port closed or host unreachable). Please check network/firewall settings."
            }
    except Exception as e:
        return {
            "status": "error",
            "connected": False,
            "message": f"Connection check failed: {str(e)}"
        }

@router.get("/status")
async def get_status():
    return {"module": "MikroTik Hotspot & Billing API", "status": "active"}

@router.get("/packages")
async def get_hotspot_packages(router_id: Optional[int] = None):
    """
    Fetch packages for a specific router or global packages.
    """
    if not supabase:
        # Return default mock packages if supabase is not initialized
        return [
            {"id": 1, "name": "1 Hour Pass", "price": 20, "duration_label": "1 Hour", "duration_minutes": 60, "speed_limit": "5M/5M", "device_limit": 1, "is_active": True},
            {"id": 2, "name": "3 Hours Blast", "price": 40, "duration_label": "3 Hours", "duration_minutes": 180, "speed_limit": "5M/5M", "device_limit": 1, "is_active": True},
            {"id": 3, "name": "12 Hours Unlimited", "price": 70, "duration_label": "12 Hours", "duration_minutes": 720, "speed_limit": "6M/6M", "device_limit": 1, "is_active": True},
            {"id": 4, "name": "24 Hours Daily", "price": 100, "duration_label": "24 Hours", "duration_minutes": 1440, "speed_limit": "8M/8M", "device_limit": 1, "is_active": True},
            {"id": 5, "name": "7 Days Weekly", "price": 400, "duration_label": "7 Days", "duration_minutes": 10080, "speed_limit": "10M/10M", "device_limit": 2, "is_active": True},
            {"id": 6, "name": "30 Days Monthly", "price": 1200, "duration_label": "30 Days", "duration_minutes": 43200, "speed_limit": "15M/15M", "device_limit": 3, "is_active": True},
        ]
    
    try:
        query = supabase.table("hotspot_packages").select("*").eq("is_active", True)
        if router_id:
            query = query.or_(f"router_id.eq.{router_id},router_id.is.null")
        res = query.order("price", desc=False).execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching packages: {e}")
        return []

@router.post("/packages")
async def create_hotspot_package(pkg: PackageCreateRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured")
    try:
        res = supabase.table("hotspot_packages").insert({
            "name": pkg.name,
            "price": pkg.price,
            "duration_label": pkg.duration_label,
            "duration_minutes": pkg.duration_minutes,
            "speed_limit": pkg.speed_limit,
            "data_limit_mb": pkg.data_limit_mb,
            "device_limit": pkg.device_limit,
            "router_id": pkg.router_id,
            "is_active": True
        }).execute()
        return {"status": "success", "package": res.data[0] if res.data else pkg}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vouchers")
async def get_vouchers(phone: Optional[str] = None, router_id: Optional[int] = None, status: Optional[str] = None):
    if not supabase:
        return []
    try:
        query = supabase.table("hotspot_vouchers").select("*")
        if phone:
            clean_phone = phone.replace("+", "").strip()
            query = query.ilike("phone_number", f"%{clean_phone}%")
        if router_id:
            query = query.eq("router_id", router_id)
        if status:
            query = query.eq("status", status)
        res = query.order("created_at", desc=True).limit(100).execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching vouchers: {e}")
        return []

@router.post("/vouchers/rescue")
async def rescue_allocate_voucher(req: RescueVoucherRequest):
    """
    Allocates a lost, delayed, or manual voucher to a user who paid without receiving connection.
    """
    clean_phone = req.phone_number.replace("+", "").replace(" ", "").strip()
    if clean_phone.startswith("0"):
        clean_phone = "254" + clean_phone[1:]
    elif not clean_phone.startswith("254") and len(clean_phone) == 9:
        clean_phone = "254" + clean_phone

    code = generate_voucher_code()
    
    # Resolve package details
    pkg_name = req.package_name or "Custom Package"
    duration_mins = req.duration_minutes or 1440 # default 24h
    price = req.price or 0
    speed = req.speed_limit or "5M/5M"
    router_name = "Global / Core Router"

    if supabase and req.package_id:
        try:
            pkg_res = supabase.table("hotspot_packages").select("*").eq("id", req.package_id).single().execute()
            if pkg_res.data:
                pkg_name = pkg_res.data.get("name", pkg_name)
                duration_mins = pkg_res.data.get("duration_minutes", duration_mins)
                price = pkg_res.data.get("price", price)
                speed = pkg_res.data.get("speed_limit", speed)
        except Exception as e:
            print(f"Package lookup error: {e}")

    if supabase and req.router_id:
        try:
            r_res = supabase.table("mikrotik_routers").select("name").eq("id", req.router_id).single().execute()
            if r_res.data:
                router_name = r_res.data.get("name", router_name)
        except Exception as e:
            print(f"Router lookup error: {e}")

    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=duration_mins)

    voucher_record = {
        "code": code,
        "router_id": req.router_id,
        "router_name": router_name,
        "package_id": req.package_id,
        "package_name": pkg_name,
        "price": price,
        "phone_number": clean_phone,
        "mpesa_receipt": req.mpesa_receipt or "ADMIN-RESCUE",
        "status": "active",
        "duration_minutes": duration_mins,
        "speed_limit": speed,
        "allocated_by": req.allocated_by or "admin",
        "notes": req.notes or "Rescued lost / delayed payment allocation",
        "expires_at": expires_at.isoformat()
    }

    if supabase:
        try:
            res = supabase.table("hotspot_vouchers").insert(voucher_record).execute()
            saved_voucher = res.data[0] if res.data else voucher_record
        except Exception as e:
            print(f"Error saving rescued voucher: {e}")
            saved_voucher = voucher_record
    else:
        saved_voucher = voucher_record

    # Generate ready-to-send SMS message template
    sms_message = (
        f"Hello! Your MyNet Hotspot WiFi access has been activated.\n"
        f"Package: {pkg_name}\n"
        f"Voucher Code: {code}\n"
        f"Duration: {duration_mins // 60}h {duration_mins % 60}m\n"
        f"Connect to WiFi and enter your voucher code to start browsing!"
    )

    # Generate RouterOS CLI command to paste into MikroTik if needed
    mikrotik_command = f'/ip hotspot user add name="{code}" password="{code}" limit-uptime={duration_mins}m rate-limit="{speed}" comment="Rescued for {clean_phone}"'

    return {
        "status": "success",
        "message": f"Successfully allocated package to {clean_phone}",
        "voucher": saved_voucher,
        "code": code,
        "sms_template": sms_message,
        "mikrotik_command": mikrotik_command
    }

@router.get("/generate-script/{router_id}")
async def generate_router_script(router_id: int):
    """
    Generates a MikroTik RouterOS CLI script to configure walled garden, captive portal redirect, and radius/hotspot billing link.
    """
    router_data = None
    if supabase:
        try:
            r_res = supabase.table("mikrotik_routers").select("*").eq("id", router_id).single().execute()
            router_data = r_res.data
        except Exception as e:
            print(f"Error fetching router: {e}")

    router_name = router_data.get("name", f"Router-{router_id}") if router_data else f"Router-{router_id}"
    dns_name = router_data.get("dns_name", "hotspot.mynet.local") if router_data else "hotspot.mynet.local"
    portal_url = router_data.get("portal_link", f"http://localhost:3000/hotspot?router={router_id}") if router_data else f"http://localhost:3000/hotspot?router={router_id}"

    script = f"""# ============================================================
# MY NET BILLING - MIKROTIK HOTSPOT CONFIGURATION SCRIPT
# Router: {router_name} (ID: {router_id})
# ============================================================

# 1. Configure Hotspot Server Profile with DNS Name
/ip hotspot profile set [find default=yes] dns-name="{dns_name}" login-by=http-chap,http-pap,cookie use-radius=no

# 2. Allow Walled Garden Access for Billing & M-Pesa Callbacks
/ip hotspot walled-garden
add dst-host=*.safaricom.co.ke action=allow comment="Allow M-Pesa"
add dst-host=*.supabase.co action=allow comment="Allow Supabase Cloud"
add dst-host=*mynet* action=allow comment="Allow Billing Portal"
add dst-host=localhost action=allow comment="Local Dev Portal"

# 3. Create Hotspot User Profile with Shared Limits
/ip hotspot user profile
add name="default-billing" keepalive-timeout=5m status-autorefresh=1m transparent-proxy=no

# 4. Success note
:put "MyNet Hotspot configuration applied for {router_name}! Hotspot Portal Link: {portal_url}"
"""

    return {
        "status": "success",
        "router_id": router_id,
        "router_name": router_name,
        "portal_url": portal_url,
        "script": script
    }
