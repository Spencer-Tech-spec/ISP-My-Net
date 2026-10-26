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

// GET — List all subscribers
export async function GET() {
    try {
        const supabase = getAdminClient();
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ subscribers: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

// POST — Create a new subscriber
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { full_name, email, phone, plan, status, username, address, id_number } = body;

        if (!full_name || !phone) {
            return NextResponse.json(
                { error: "Full name and phone number are required." },
                { status: 400 }
            );
        }

        const supabase = getAdminClient();

        // Build the subscriber record
        const newSubscriber: Record<string, any> = {
            full_name,
            phone,
            plan: plan || "Basic",
            status: status || "Active",
        };

        // Optional fields
        if (email) newSubscriber.email = email;
        if (username) newSubscriber.username = username;
        if (address) newSubscriber.address = address;
        if (id_number) newSubscriber.id_number = id_number;

        const { data, error } = await supabase
            .from("profiles")
            .insert([newSubscriber])
            .select();

        if (error) {
            console.error("Failed to insert subscriber:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Subscriber created successfully.",
            subscriber: data?.[0] || null,
        });
    } catch (err: any) {
        console.error("Unhandled error creating subscriber:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

// PUT — Update existing subscriber
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, full_name, phone, plan, status, email, username, address, id_number } = body;

        if (!id) {
            return NextResponse.json({ error: "Subscriber ID is required." }, { status: 400 });
        }

        const supabase = getAdminClient();

        const updates: Record<string, any> = {};
        if (full_name !== undefined) updates.full_name = full_name;
        if (phone !== undefined) updates.phone = phone;
        if (plan !== undefined) updates.plan = plan;
        if (status !== undefined) updates.status = status;
        if (email !== undefined) updates.email = email;
        if (username !== undefined) updates.username = username;
        if (address !== undefined) updates.address = address;
        if (id_number !== undefined) updates.id_number = id_number;

        const { data, error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", id)
            .select();

        if (error) {
            console.error("Failed to update subscriber:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Subscriber updated successfully.",
            subscriber: data?.[0] || null,
        });
    } catch (err: any) {
        console.error("Unhandled error updating subscriber:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE — Delete subscriber by ID
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
            return NextResponse.json({ error: "Missing subscriber 'id' parameter" }, { status: 400 });
        }

        const supabase = getAdminClient();

        const { data, error } = await supabase
            .from("profiles")
            .delete()
            .eq("id", idParam)
            .select();

        if (error) {
            console.error("Failed to delete subscriber:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Subscriber deleted successfully.",
            deleted: data,
        });
    } catch (err: any) {
        console.error("Unhandled error deleting subscriber:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
