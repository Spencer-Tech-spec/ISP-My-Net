-- ================================================================
-- MY NET SAAS: INVENTORY & EQUIPMENT MANAGEMENT SCHEMA
-- ================================================================

-- 1. Inventory Items / Equipment Catalog
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isp_id UUID NOT NULL REFERENCES isp_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('router', 'onu_cpe', 'cable', 'access_point', 'tool', 'accessory', 'other')),
    model TEXT,
    sku TEXT,
    quantity INT NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'pcs',             -- pcs, meters, rolls, boxes
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    reorder_level INT NOT NULL DEFAULT 5,         -- Alert threshold
    location TEXT DEFAULT 'Central Warehouse',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Serialized Assets (Individual Routers, ONUs, CPEs with MAC/Serial)
CREATE TABLE IF NOT EXISTS serialized_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isp_id UUID NOT NULL REFERENCES isp_tenants(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    serial_number TEXT NOT NULL,
    mac_address TEXT,
    status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'assigned_technician', 'installed_client', 'faulty', 'decommissioned')),
    assigned_to_user_id UUID,                     -- Staff technician or Customer profile ID
    assigned_client_id UUID,                       -- End customer profile where installed
    installed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(isp_id, serial_number)
);

-- 3. Inventory Stock Movements / Audit History
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isp_id UUID NOT NULL REFERENCES isp_tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('stock_in', 'stock_out', 'transfer', 'adjustment', 'installation', 'return')),
    quantity_changed INT NOT NULL,                 -- Positive for in, negative for out
    quantity_after INT NOT NULL,
    actor_id UUID,                                 -- Staff who made the movement
    recipient_name TEXT,                           -- Technician name or client name
    reference_order TEXT,                          -- Work order ID or purchase invoice #
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_isp ON inventory_items(isp_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_serialized_assets_isp ON serialized_assets(isp_id);
CREATE INDEX IF NOT EXISTS idx_serialized_assets_serial ON serialized_assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_serialized_assets_status ON serialized_assets(status);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_isp ON inventory_movements(isp_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);

-- Row Level Security
ALTER TABLE IF EXISTS inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS serialized_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_inventory_items" ON inventory_items;
CREATE POLICY "tenant_isolation_inventory_items" ON inventory_items FOR ALL
    USING (isp_id = (SELECT id FROM isp_tenants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "tenant_isolation_serialized_assets" ON serialized_assets;
CREATE POLICY "tenant_isolation_serialized_assets" ON serialized_assets FOR ALL
    USING (isp_id = (SELECT id FROM isp_tenants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "tenant_isolation_inventory_movements" ON inventory_movements;
CREATE POLICY "tenant_isolation_inventory_movements" ON inventory_movements FOR ALL
    USING (isp_id = (SELECT id FROM isp_tenants WHERE owner_id = auth.uid()));
