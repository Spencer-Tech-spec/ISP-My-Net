from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.adapters.smartolt import SmartOLTAdapter
from app.utils.tenant import get_tenant_context, TenantContext, require_manager

router = APIRouter(
    prefix="/smartolt",
    tags=["smartolt"],
)

class SmartOLTConfig(BaseModel):
    url: str
    api_key: str

@router.post("/test-connection")
async def test_connection(config: SmartOLTConfig):
    """Tests connection to SmartOLT using provided configuration."""
    if not config.url or not config.api_key:
        raise HTTPException(status_code=400, detail="Missing SmartOLT URL or API Key.")

    adapter = SmartOLTAdapter({"url": config.url, "api_key": config.api_key})
    res = await adapter.test_connection()
    if not res.success:
        raise HTTPException(status_code=400, detail=res.message)
    return {"status": "success", "message": res.message, "data": res.data}

@router.get("/status")
async def get_tenant_smartolt_status(ctx: TenantContext = Depends(get_tenant_context)):
    """Tests connection to SmartOLT using current tenant's saved configuration."""
    tenant = ctx.tenant
    url = tenant.get("smartolt_api_url")
    key = tenant.get("smartolt_api_key")

    if not url or not key:
        return {
            "is_configured": False,
            "status": "not_configured",
            "message": "SmartOLT is not yet configured for this ISP."
        }

    adapter = SmartOLTAdapter({"url": url, "api_key": key})
    res = await adapter.get_system_health()
    return {
        "is_configured": True,
        "status": "online" if res.success else "offline",
        "message": res.message,
        "data": res.data
    }

@router.get("/info")
async def get_info():
    return {"module": "SmartOLT Fiber Adapter", "version": "2.0", "vendor": "SmartOLT GPON/EPON"}
