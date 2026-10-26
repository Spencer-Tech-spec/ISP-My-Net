"""
Inventory & Equipment Router — with Multi-Tenant Isolation
Handles hardware catalog, serialized assets (Routers/ONUs), stock movements,
and technician equipment allocation.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import supabase
from app.utils.tenant import get_tenant_context, TenantContext, require_manager, require_any_staff

router = APIRouter(prefix="/inventory", tags=["Inventory & Equipment"])


# ─── Pydantic Models ────────────────────────────────────────────────────────────

class InventoryItemCreate(BaseModel):
    name: str
    category: str                       # 'router', 'onu_cpe', 'cable', 'access_point', 'tool', 'accessory', 'other'
    model: Optional[str] = None
    sku: Optional[str] = None
    quantity: int = 0
    unit: str = "pcs"                   # 'pcs', 'meters', 'rolls', 'boxes'
    unit_cost: float = 0.0
    reorder_level: int = 5
    location: Optional[str] = "Central Warehouse"
    notes: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    model: Optional[str] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    reorder_level: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class StockAdjustment(BaseModel):
    adjustment_type: str                # 'stock_in', 'stock_out', 'transfer', 'adjustment', 'installation', 'return'
    quantity: int                       # positive value to adjust by
    recipient_name: Optional[str] = None
    reference_order: Optional[str] = None
    notes: Optional[str] = None


class SerializedAssetCreate(BaseModel):
    item_id: Optional[str] = None
    serial_number: str
    mac_address: Optional[str] = None
    status: str = "in_stock"            # 'in_stock', 'assigned_technician', 'installed_client', 'faulty'
    notes: Optional[str] = None


class AssetAssignment(BaseModel):
    status: str                         # 'assigned_technician', 'installed_client', 'in_stock', 'faulty'
    assigned_to_user_id: Optional[str] = None
    assigned_client_id: Optional[str] = None
    notes: Optional[str] = None


# ─── Inventory Catalog Endpoints ───────────────────────────────────────────────

@router.get("/items")
async def get_inventory_items(
    category: Optional[str] = None,
    ctx: TenantContext = Depends(get_tenant_context)
):
    """Lists all catalog items for this ISP with live stock status."""
    if not supabase:
        return []

    try:
        query = supabase.table("inventory_items").select("*").eq("isp_id", ctx.isp_id)
        if category and category != "all":
            query = query.eq("category", category)
        res = query.order("name", desc=False).execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching inventory items: {e}")
        return []


@router.post("/items", status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    item: InventoryItemCreate,
    ctx: TenantContext = Depends(require_manager)
):
    """Registers a new item in the ISP's equipment catalog."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client unavailable.")

    try:
        res = supabase.table("inventory_items").insert({
            "isp_id": ctx.isp_id,
            "name": item.name,
            "category": item.category,
            "model": item.model,
            "sku": item.sku,
            "quantity": item.quantity,
            "unit": item.unit,
            "unit_cost": item.unit_cost,
            "reorder_level": item.reorder_level,
            "location": item.location or "Central Warehouse",
            "notes": item.notes,
        }).execute()

        new_item = res.data[0] if res.data else None

        # Log initial stock movement if quantity > 0
        if new_item and item.quantity > 0:
            supabase.table("inventory_movements").insert({
                "isp_id": ctx.isp_id,
                "item_id": new_item["id"],
                "movement_type": "stock_in",
                "quantity_changed": item.quantity,
                "quantity_after": item.quantity,
                "actor_id": ctx.user_id,
                "notes": "Initial inventory catalog intake"
            }).execute()

        return {"status": "success", "item": new_item}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/items/{item_id}")
async def update_inventory_item(
    item_id: str,
    update: InventoryItemUpdate,
    ctx: TenantContext = Depends(require_manager)
):
    """Updates catalog item details."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client unavailable.")

    payload = {k: v for k, v in update.model_dump().items() if v is not None}
    try:
        res = supabase.table("inventory_items").update(payload).eq("id", item_id).eq("isp_id", ctx.isp_id).execute()
        return {"status": "success", "item": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/items/{item_id}")
async def delete_inventory_item(
    item_id: str,
    ctx: TenantContext = Depends(require_manager)
):
    """Removes an item from catalog."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client unavailable.")

    try:
        supabase.table("inventory_items").delete().eq("id", item_id).eq("isp_id", ctx.isp_id).execute()
        return {"status": "success", "message": "Item deleted."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/items/{item_id}/adjust-stock")
async def adjust_item_stock(
    item_id: str,
    adj: StockAdjustment,
    ctx: TenantContext = Depends(require_manager)
):
    """Records stock-in, stock-out, or technician check-out with movement audit."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client unavailable.")

    # 1. Fetch current item
    item_res = supabase.table("inventory_items").select("*").eq("id", item_id).eq("isp_id", ctx.isp_id).single().execute()
    if not item_res.data:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    current_qty = item_res.data.get("quantity", 0)
    qty_delta = adj.quantity if adj.adjustment_type in ("stock_in", "return") else -abs(adj.quantity)
    new_qty = max(0, current_qty + qty_delta)

    # 2. Update stock count
    supabase.table("inventory_items").update({"quantity": new_qty}).eq("id", item_id).execute()

    # 3. Create movement log
    movement = {
        "isp_id": ctx.isp_id,
        "item_id": item_id,
        "movement_type": adj.adjustment_type,
        "quantity_changed": qty_delta,
        "quantity_after": new_qty,
        "actor_id": ctx.user_id,
        "recipient_name": adj.recipient_name,
        "reference_order": adj.reference_order,
        "notes": adj.notes
    }
    supabase.table("inventory_movements").insert(movement).execute()

    return {
        "status": "success",
        "previous_quantity": current_qty,
        "new_quantity": new_qty,
        "item_name": item_res.data.get("name")
    }


# ─── Serialized Hardware Assets (Routers, ONUs, CPEs) ──────────────────────────

@router.get("/assets")
async def get_serialized_assets(
    status: Optional[str] = None,
    ctx: TenantContext = Depends(get_tenant_context)
):
    """Lists tracked serial numbers (e.g. MikroTik hEX, Huawei ONUs)."""
    if not supabase:
        return []

    try:
        query = supabase.table("serialized_assets").select("*, inventory_items(name, model, category)").eq("isp_id", ctx.isp_id)
        if status and status != "all":
            query = query.eq("status", status)
        res = query.order("created_at", desc=True).limit(100).execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching assets: {e}")
        return []


@router.post("/assets", status_code=status.HTTP_201_CREATED)
async def register_serialized_asset(
    asset: SerializedAssetCreate,
    ctx: TenantContext = Depends(require_manager)
):
    """Registers a hardware asset by serial number and MAC address."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client unavailable.")

    clean_serial = asset.serial_number.strip().upper()
    try:
        res = supabase.table("serialized_assets").insert({
            "isp_id": ctx.isp_id,
            "item_id": asset.item_id,
            "serial_number": clean_serial,
            "mac_address": asset.mac_address.strip().upper() if asset.mac_address else None,
            "status": asset.status,
            "notes": asset.notes
        }).execute()
        return {"status": "success", "asset": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to register asset (Serial might be duplicate): {e}")


@router.post("/assets/{asset_id}/assign")
async def assign_serialized_asset(
    asset_id: str,
    assign: AssetAssignment,
    ctx: TenantContext = Depends(require_any_staff)
):
    """Assigns asset to technician or binds to an installed customer."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client unavailable.")

    update_payload = {
        "status": assign.status,
        "assigned_to_user_id": assign.assigned_to_user_id,
        "assigned_client_id": assign.assigned_client_id,
        "notes": assign.notes,
        "installed_at": datetime.utcnow().isoformat() if assign.status == "installed_client" else None
    }

    try:
        res = supabase.table("serialized_assets").update(update_payload).eq("id", asset_id).eq("isp_id", ctx.isp_id).execute()
        return {"status": "success", "asset": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Stock Movement History & Dashboard Stats ─────────────────────────────────

@router.get("/movements")
async def get_inventory_movements(
    limit: int = 50,
    ctx: TenantContext = Depends(get_tenant_context)
):
    """Returns recent stock logs (stock in, technician checkouts, client installs)."""
    if not supabase:
        return []

    try:
        res = supabase.table("inventory_movements") \
            .select("*, inventory_items(name, unit)") \
            .eq("isp_id", ctx.isp_id) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching movements: {e}")
        return []


@router.get("/stats")
async def get_inventory_stats(ctx: TenantContext = Depends(get_tenant_context)):
    """Returns summary KPIs for the ISP Inventory Dashboard."""
    if not supabase:
        return {
            "total_items": 0,
            "total_stock_value": 0,
            "low_stock_count": 0,
            "serialized_assets_count": 0,
            "installed_assets_count": 0
        }

    try:
        items_resp = supabase.table("inventory_items").select("quantity, unit_cost, reorder_level").eq("isp_id", ctx.isp_id).execute()
        items = items_resp.data or []

        total_value = sum((it.get("quantity", 0) * float(it.get("unit_cost", 0) or 0)) for it in items)
        low_stock = sum(1 for it in items if it.get("quantity", 0) <= it.get("reorder_level", 5))

        assets_resp = supabase.table("serialized_assets").select("id, status").eq("isp_id", ctx.isp_id).execute()
        assets = assets_resp.data or []
        total_assets = len(assets)
        installed_assets = sum(1 for a in assets if a.get("status") == "installed_client")

        return {
            "total_items": len(items),
            "total_stock_value": round(total_value, 2),
            "low_stock_count": low_stock,
            "serialized_assets_count": total_assets,
            "installed_assets_count": installed_assets
        }
    except Exception as e:
        print(f"Error computing inventory stats: {e}")
        return {
            "total_items": 0,
            "total_stock_value": 0,
            "low_stock_count": 0,
            "serialized_assets_count": 0,
            "installed_assets_count": 0
        }
