import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://asuxwdfunyfsymjhmexx.supabase.co";
const SERVICE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM2NDQxMiwiZXhwIjoyMDg1OTQwNDEyfQ.2pRrcX7n_40pGrq6QTCtNA4_ThEs9YZQCgfsI3Zzqzk";

function getAdminClient() {
    return createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

// GET: Fetch all hotspot packages
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const routerId = searchParams.get("router_id");

        const supabaseAdmin = getAdminClient();
        let query = supabaseAdmin.from("hotspot_packages").select("*");

        if (routerId) {
            query = query.or(`router_id.eq.${routerId},router_id.is.null`);
        }

        const { data, error } = await query.order("price", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ packages: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

// POST: Create a new hotspot package
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            name,
            price,
            duration_label,
            duration_minutes,
            speed_limit = "5M/5M",
            data_limit_mb = 0,
            device_limit = 1,
            router_id = null,
            is_active = true,
        } = body;

        if (!name || price === undefined || !duration_label || !duration_minutes) {
            return NextResponse.json(
                { error: "Missing required fields (name, price, duration_label, duration_minutes)" },
                { status: 400 }
            );
        }

        const payload: any = {
            name: String(name).trim(),
            price: Number(price),
            duration_label: String(duration_label).trim(),
            duration_minutes: Number(duration_minutes),
            speed_limit: String(speed_limit).trim() || "5M/5M",
            data_limit_mb: Number(data_limit_mb) || 0,
            device_limit: Number(device_limit) || 1,
            is_active: is_active !== false,
            router_id: router_id ? Number(router_id) : null,
        };

        const supabaseAdmin = getAdminClient();
        const { data, error } = await supabaseAdmin
            .from("hotspot_packages")
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error("Error creating package via admin:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Package '${payload.name}' created successfully`,
            package: data,
        });
    } catch (err: any) {
        console.error("Unhandled package creation error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

// PUT: Update an existing hotspot package
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing package ID" }, { status: 400 });
        }

        const payload: any = {};
        if (updates.name !== undefined) payload.name = String(updates.name).trim();
        if (updates.price !== undefined) payload.price = Number(updates.price);
        if (updates.duration_label !== undefined) payload.duration_label = String(updates.duration_label).trim();
        if (updates.duration_minutes !== undefined) payload.duration_minutes = Number(updates.duration_minutes);
        if (updates.speed_limit !== undefined) payload.speed_limit = String(updates.speed_limit).trim();
        if (updates.data_limit_mb !== undefined) payload.data_limit_mb = Number(updates.data_limit_mb);
        if (updates.device_limit !== undefined) payload.device_limit = Number(updates.device_limit);
        if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);
        if (updates.router_id !== undefined) payload.router_id = updates.router_id ? Number(updates.router_id) : null;

        const supabaseAdmin = getAdminClient();
        const { data, error } = await supabaseAdmin
            .from("hotspot_packages")
            .update(payload)
            .eq("id", Number(id))
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Package updated successfully",
            package: data,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE: Remove a hotspot package
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let idParam = searchParams.get("id");

        if (!idParam) {
            try {
                const body = await request.json();
                idParam = body.id ? String(body.id) : null;
            } catch (_) {}
        }

        if (!idParam) {
            return NextResponse.json({ error: "Missing package 'id' parameter" }, { status: 400 });
        }

        const packageId = Number(idParam);
        const supabaseAdmin = getAdminClient();

        // Nullify foreign vouchers referencing this package before deleting
        try {
            await supabaseAdmin.from("hotspot_vouchers").update({ package_id: null }).eq("package_id", packageId);
        } catch (_) {}

        const { data, error } = await supabaseAdmin
            .from("hotspot_packages")
            .delete()
            .eq("id", packageId)
            .select();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Package ${packageId} deleted successfully`,
            deleted: data,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
