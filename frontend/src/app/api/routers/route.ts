import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://asuxwdfunyfsymjhmexx.supabase.co";
// Prefer SERVICE_ROLE_KEY for server-side operations to bypass RLS, fallback to hardcoded service role or anon key
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
            return NextResponse.json({ error: "Missing router 'id' parameter" }, { status: 400 });
        }

        const routerId = Number(idParam);
        if (isNaN(routerId)) {
            return NextResponse.json({ error: "Invalid router ID format" }, { status: 400 });
        }

        const supabaseAdmin = getAdminClient();

        // 1. Unlink dependent hotspot packages and vouchers if any
        try {
            await supabaseAdmin.from("hotspot_packages").update({ router_id: null }).eq("router_id", routerId);
        } catch (e) {
            console.warn("Notice: packages unlink:", e);
        }

        try {
            await supabaseAdmin.from("hotspot_vouchers").update({ router_id: null }).eq("router_id", routerId);
        } catch (e) {
            console.warn("Notice: vouchers unlink:", e);
        }

        // 2. Perform router deletion
        const { data, error } = await supabaseAdmin
            .from("mikrotik_routers")
            .delete()
            .eq("id", routerId)
            .select();

        if (error) {
            console.error("Failed to delete router:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Router ${routerId} successfully deleted.`,
            deleted: data,
        });
    } catch (err: any) {
        console.error("Unhandled error deleting router:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const supabaseAdmin = getAdminClient();
        const { data, error } = await supabaseAdmin
            .from("mikrotik_routers")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ routers: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
