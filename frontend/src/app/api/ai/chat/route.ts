import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://asuxwdfunyfsymjhmexx.supabase.co";
const SERVICE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM2NDQxMiwiZXhwIjoyMDg1OTQwNDEyfQ.2pRrcX7n_40pGrq6QTCtNA4_ThEs9YZQCgfsI3Zzqzk";

function getAdminClient() {
    return createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages = [] } = body;

        // 1. Try FastAPI backend first if available
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for fast fallback

            const backendRes = await fetch(`${backendUrl}/api/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (backendRes.ok) {
                const data = await backendRes.json();
                return NextResponse.json(data);
            }
        } catch (backendErr) {
            // Backend offline or unreachable from Vercel — use integrated serverless fallback
        }

        // 2. Serverless Knowledge & Diagnostics Engine
        const lastMsg = messages[messages.length - 1]?.content || "";
        const lower = lastMsg.toLowerCase();
        const supabase = getAdminClient();

        // Check Router Status
        if (lower.includes("router") && (lower.includes("online") || lower.includes("status") || lower.includes("list") || lower.includes("my router"))) {
            const { data: routers } = await supabase.from("mikrotik_routers").select("id, name, host, port, hotspot_name, is_online");
            let routerSummary = "No routers linked yet.";
            if (routers && routers.length > 0) {
                routerSummary = routers
                    .map((r) => `• **${r.name}** (${r.host}:${r.port}) — SSID: *${r.hotspot_name || "MyNet Hotspot"}* | Status: ${r.is_online !== false ? "🟢 ONLINE" : "🔴 OFFLINE"}`)
                    .join("\n");
            }
            return NextResponse.json({
                role: "assistant",
                content: `**Live MikroTik Router Status:**\n\n${routerSummary}\n\nYou can link additional routers or generate scripts in **[Network Management](/admin/network)**.`,
            });
        }

        // Payment & M-Pesa Troubleshooting
        if (lower.includes("mpesa") || lower.includes("m-pesa") || lower.includes("paid") || lower.includes("receipt") || lower.includes("still disconnected")) {
            return NextResponse.json({
                role: "assistant",
                content:
                    `**Customer Paid via M-Pesa But Internet Is Still Inactive:**\n\n` +
                    `Here is the official recovery procedure:\n` +
                    `1. **Verify Transaction**: Request the customer's M-Pesa transaction code and search it under **[Payments](/admin/payments)**.\n` +
                    `2. **Check Account**: If the payment appears, verify the client's expiration date in **[Subscribers](/admin/users)**.\n` +
                    `3. **Rescue Package (Instant Activation)**: If the Safaricom callback was delayed:\n` +
                    `   • Open **[Network Management](/admin/network)**.\n` +
                    `   • Click **"Rescue Package"** (top right).\n` +
                    `   • Enter the phone number and M-Pesa receipt to issue an instant active access pass.\n` +
                    `4. **Send SMS**: Send the generated SMS template containing the voucher code directly to the customer.`,
            });
        }

        // Adding a subscriber
        if (lower.includes("add subscriber") || lower.includes("new subscriber") || lower.includes("register") || lower.includes("add customer")) {
            return NextResponse.json({
                role: "assistant",
                content:
                    `**How to Add a New Subscriber in My Net:**\n\n` +
                    `1. Navigate to **[Subscribers](/admin/users)** in the left sidebar.\n` +
                    `2. Click the blue **"+ Add Subscriber"** button.\n` +
                    `3. Fill in:\n` +
                    `   • **Full Name & Phone Number** (e.g. 07XXXXXXXX)\n` +
                    `   • **Service Type**: PPPoE or Hotspot\n` +
                    `   • **Bandwidth Profile**: Speed limit (e.g. 5M/5M, 10M/10M)\n` +
                    `   • **Assigned Router**: Target MikroTik router\n` +
                    `4. Click **"Save Subscriber"**.\n` +
                    `5. The system saves the user credentials and schedules automatic payment reminders.`,
            });
        }

        // Hotspot Voucher issues
        if (lower.includes("voucher") || lower.includes("hotspot code") || lower.includes("captive portal")) {
            return NextResponse.json({
                role: "assistant",
                content:
                    `**Troubleshooting Hotspot Vouchers:**\n\n` +
                    `1. Go to **[Network Management](/admin/network)** -> **"Vouchers & Rescue"** tab.\n` +
                    `2. Search by phone number or code to verify if the voucher is **Active**, **Used**, or **Expired**.\n` +
                    `3. If expired or lost, click **"Rescue Package"** to generate a replacement pass immediately.`,
            });
        }

        // General default greeting / overview
        const { count: routerCount } = await supabase.from("mikrotik_routers").select("*", { count: "exact", head: true });
        const { count: pkgCount } = await supabase.from("hotspot_packages").select("*", { count: "exact", head: true });

        return NextResponse.json({
            role: "assistant",
            content:
                `Hello! I am **My Net AI**, your specialized Kenyan ISP operations assistant.\n\n` +
                `**Current System State:** ${routerCount || 0} Connected Routers | ${pkgCount || 0} Hotspot Packages.\n\n` +
                `How can I assist you?\n` +
                `• *"Is my router online?"* — Live router check\n` +
                `• *"Customer paid but internet is disconnected"* — Payment recovery workflow\n` +
                `• *"How do I add a new subscriber?"* — Step-by-step registration\n` +
                `• *"How to link a MikroTik router?"* — RouterOS script configuration`,
        });
    } catch (err: any) {
        return NextResponse.json({
            role: "assistant",
            content: "Hello! I am My Net AI. I am ready to help you manage routers, M-Pesa payments, subscribers, and hotspot operations. What would you like to check?",
        });
    }
}
