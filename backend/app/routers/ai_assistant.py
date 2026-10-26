from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import json
from openai import OpenAI
from typing import List, Optional, Dict, Any
from app.database import supabase
from app.ai.knowledge_base import MY_NET_SYSTEM_INSTRUCTIONS, KNOWLEDGE_DOCUMENTS

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# Initialize OpenAI client if valid key is set
client = None
try:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and api_key != "your_openai_api_key_here" and len(api_key) > 20:
        client = OpenAI(api_key=api_key)
except Exception as e:
    print(f"Notice: OpenAI client not initialized ({e}). Using integrated knowledge engine.")

# -------------------------------------------------------------
# REAL-TIME SYSTEM TOOLS FOR THE AI ASSISTANT
# -------------------------------------------------------------

def tool_get_routers() -> str:
    """Fetch live list of connected MikroTik routers and their status."""
    if not supabase:
        return "Database client unavailable."
    try:
        res = supabase.table("mikrotik_routers").select("id, name, host, port, hotspot_name, is_online, status").execute()
        if not res.data:
            return "No MikroTik routers are currently linked to this account."
        output = ["Live Routers:"]
        for r in res.data:
            state = "ONLINE" if r.get("is_online", True) else "OFFLINE"
            output.append(f"• ID #{r['id']} - {r['name']} ({r['host']}:{r['port']}) | Hotspot: '{r.get('hotspot_name', 'N/A')}' | Status: {state}")
        return "\n".join(output)
    except Exception as e:
        return f"Error retrieving routers: {str(e)}"

def tool_search_payment(query: str) -> str:
    """Search for payment transaction by M-Pesa receipt or customer phone."""
    if not supabase:
        return "Database client unavailable."
    clean_q = query.strip()
    try:
        # 1. Search customer mpesa_transactions
        try:
            res = supabase.table("mpesa_transactions").select("*").or_(f"mpesa_receipt.ilike.%{clean_q}%,phone_number.ilike.%{clean_q}%").order("created_at", desc=True).limit(5).execute()
            if res.data:
                lines = [f"Found {len(res.data)} M-Pesa transaction(s) matching '{clean_q}':"]
                for p in res.data:
                    lines.append(f"• Receipt: {p.get('mpesa_receipt', 'N/A')} | KES {p.get('amount', 0)} | Phone: {p.get('phone_number')} | Status: {p.get('status')} | Date: {str(p.get('created_at', ''))[:10]}")
                return "\n".join(lines)
        except Exception:
            pass

        # 2. Search saas_payments fallback
        try:
            res2 = supabase.table("saas_payments").select("*").or_(f"mpesa_receipt.ilike.%{clean_q}%,phone_number.ilike.%{clean_q}%").order("created_at", desc=True).limit(5).execute()
            if res2.data:
                lines = [f"Found {len(res2.data)} SaaS payment(s) matching '{clean_q}':"]
                for p in res2.data:
                    lines.append(f"• Receipt: {p.get('mpesa_receipt', 'N/A')} | KES {p.get('amount', 0)} | Phone: {p.get('phone_number')} | Status: {p.get('status')} | Date: {str(p.get('created_at', ''))[:10]}")
                return "\n".join(lines)
        except Exception:
            pass

        return f"No payment or M-Pesa records found in database matching '{clean_q}'."
    except Exception as e:
        return f"Error searching payments: {str(e)}"

def tool_search_voucher(query: str) -> str:
    """Lookup hotspot voucher by code or phone number."""
    if not supabase:
        return "Database client unavailable."
    clean_q = query.strip().upper()
    try:
        res = supabase.table("hotspot_vouchers").select("*").or_(f"code.ilike.%{clean_q}%,phone_number.ilike.%{clean_q}%").order("created_at", desc=True).limit(5).execute()
        if not res.data:
            return f"No hotspot vouchers found matching '{query}'."
        lines = [f"Voucher results for '{query}':"]
        for v in res.data:
            lines.append(f"• Code: {v.get('code')} | Pkg: {v.get('package_name')} (KES {v.get('price')}) | Phone: {v.get('phone_number')} | Status: {v.get('status')} | Speed: {v.get('speed_limit')}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching vouchers: {str(e)}"

def tool_get_system_overview() -> str:
    """Get high-level summary of routers, subscribers, and packages."""
    if not supabase:
        return "Database unavailable."
    try:
        routers = supabase.table("mikrotik_routers").select("id", count="exact").execute()
        pkgs = supabase.table("hotspot_packages").select("id", count="exact").execute()
        vouchers = supabase.table("hotspot_vouchers").select("id", count="exact").eq("status", "active").execute()
        r_count = routers.count if routers.count is not None else len(routers.data or [])
        p_count = pkgs.count if pkgs.count is not None else len(pkgs.data or [])
        v_count = vouchers.count if vouchers.count is not None else len(vouchers.data or [])
        return f"Platform Overview: {r_count} Connected Routers | {p_count} Hotspot Packages | {v_count} Active Hotspot Vouchers"
    except Exception as e:
        return f"System overview unavailable: {str(e)}"

# OpenAI Function Calling Schema
AI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "tool_get_routers",
            "description": "Checks the live list of connected MikroTik routers, IP addresses, ports, and online status.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tool_search_payment",
            "description": "Looks up payment transactions by M-Pesa receipt code or customer phone number.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The M-Pesa transaction receipt code (e.g. QKH827X91J) or phone number (e.g. 0712345678)"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tool_search_voucher",
            "description": "Looks up hotspot voucher details by voucher code or customer phone number.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Voucher code (e.g. MNET-ABC-123) or phone number"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tool_get_system_overview",
            "description": "Gets high level stats of routers, hotspot packages, and active vouchers.",
            "parameters": {"type": "object", "properties": {}}
        }
    }
]

# -------------------------------------------------------------
# INTELLIGENT RULE-BASED FALLBACK ENGINE (when OpenAI key is not set)
# -------------------------------------------------------------

def generate_fallback_response(user_text: str) -> str:
    text = user_text.lower()

    # 1. Router status & connectivity
    if any(k in text for k in ["router", "online", "mikrotik", "status of router", "offline"]):
        if any(k in text for k in ["is my router", "check router", "list router", "my router", "routers"]):
            routers_info = tool_get_routers()
            return f"**Live MikroTik Router Status:**\n\n{routers_info}\n\nTo configure or inspect your routers, open **[Network Management](/admin/network)**."
        if "offline" in text or "disconnected" in text or "cannot connect" in text:
            return (
                "**Troubleshooting an Offline MikroTik Router:**\n\n"
                "1. **Check Power & Internet**: Verify the router has physical power and active upstream WAN link.\n"
                "2. **Verify API Port (8728)**: In Winbox, open terminal and run `/ip service print`. Ensure the `api` service is enabled on port 8728.\n"
                "3. **IP Accessibility**: If your router uses a private IP (e.g. `192.168.88.1`), you can only manage it while connected to its local network.\n"
                "4. **Script Check**: In **[Network Management](/admin/network)**, click **'Script'** on your router card and reapply the configuration in your RouterOS terminal."
            )

    # 2. Payment & M-Pesa troubleshooting
    if any(k in text for k in ["mpesa", "m-pesa", "paid", "payment", "receipt", "still disconnected", "still inactive"]):
        # Extract receipt code or phone if mentioned
        words = user_text.split()
        potential_code = next((w for w in words if len(w) >= 8 and (w.isalnum() or w.startswith("07") or w.startswith("254"))), None)
        lookup_result = ""
        if potential_code:
            lookup_result = f"\n\n**Database Lookup Result:**\n{tool_search_payment(potential_code)}"

        return (
            "**Customer Paid via M-Pesa But Internet Is Still Inactive:**\n\n"
            "Here is the standard 4-step recovery procedure:\n"
            "1. **Verify Transaction**: Ask for the customer's M-Pesa Receipt Code (e.g. `SLK872X91J`). Check **[Payments](/admin/payments)** to see if the callback was received.\n"
            "2. **If Payment Is Found**: Verify the subscriber's account status in **[Subscribers](/admin/users)**.\n"
            "3. **Rescue Package (Instant Fix)**: If Safaricom's callback was delayed:\n"
            "   • Go to **[Network Management](/admin/network)**.\n"
            "   • Click the orange **'Rescue Package'** button.\n"
            "   • Enter the customer's phone number, select their package, and enter their M-Pesa receipt code.\n"
            "   • Click **'Generate & Rescue Voucher'** to create an instant active pass.\n"
            "4. **Send SMS**: Copy the ready-made SMS voucher message and send it directly to the customer via SMS or WhatsApp."
            f"{lookup_result}"
        )

    # 3. Adding a new subscriber
    if any(k in text for k in ["add subscriber", "new subscriber", "register customer", "add customer", "create subscriber"]):
        return (
            "**How to Add a New Subscriber in My Net:**\n\n"
            "1. Navigate to **[Subscribers](/admin/users)** in the left sidebar.\n"
            "2. Click the blue **'+ Add Subscriber'** button at the top right.\n"
            "3. Fill in the client details:\n"
            "   • **Full Name & Phone Number** (e.g. `0712345678`)\n"
            "   • **Connection Type**: Select **PPPoE** or **Hotspot**\n"
            "   • **Package & Speed Limit**: Choose their allocated bandwidth profile (e.g. 5M/5M, 10M/10M)\n"
            "   • **Installation Address & Router**: Assign the client to your target MikroTik router\n"
            "4. Click **'Save Subscriber'**.\n"
            "5. The system automatically creates the PPPoE secret or hotspot credentials and enables billing reminders."
        )

    # 4. Hotspot voucher not working
    if any(k in text for k in ["voucher", "hotspot code", "captive portal", "voucher not working", "invalid code"]):
        return (
            "**Troubleshooting Hotspot Vouchers:**\n\n"
            "1. **Check Voucher Status**: Go to **[Network Management](/admin/network)** -> **'Vouchers & Rescue'** tab.\n"
            "2. **Search Phone or Code**: Enter the customer's phone number to verify if their voucher is `active`, `used`, or `expired`.\n"
            "3. **Re-enter Code**: Ensure the customer enters the code exactly as formatted (e.g. `MNET-ABC-123`), without spaces or extra characters.\n"
            "4. **Issue Rescue Voucher**: If the voucher expired prematurely, click **'Rescue Package'** on the top right to issue a replacement pass immediately."
        )

    # 5. Inventory & Equipment
    if any(k in text for k in ["inventory", "equipment", "onu", "cpe", "cable", "serial number"]):
        return (
            "**Inventory & Equipment Management:**\n\n"
            "You can manage your physical ISP hardware in **[Inventory & Equipment](/admin/inventory)**:\n"
            "• **Equipment Catalog**: Add routers, fiber ONUs, drop cables, SFP modules, and fusion splicers.\n"
            "• **Serial Number Tracking**: Assign serial numbers to field units and track their status (In Stock, Installed, Faulty).\n"
            "• **Technician Dispatches**: Log equipment assigned to field technicians for installations."
        )

    # 6. Overview
    overview = tool_get_system_overview()
    return (
        f"Hello! I am **My Net AI**, your intelligent ISP operations assistant.\n\n"
        f"{overview}\n\n"
        "Here are things I can assist you with right now:\n"
        "• **Router Diagnostics**: Type *'Is my router online?'* to check your connected MikroTik devices.\n"
        "• **Payment Verification**: Ask *'Customer paid but internet is inactive'* or provide an M-Pesa receipt.\n"
        "• **Platform Walkthrough**: Ask *'How do I add a new subscriber?'* or *'How to link MikroTik?'*.\n"
        "• **Hotspot Passes**: Ask about creating or managing captive portal pricing passes."
    )

# -------------------------------------------------------------
# MAIN CHAT ENDPOINT
# -------------------------------------------------------------

@router.post("/chat")
async def chat_with_assistant(request: ChatRequest):
    if not request.messages:
        return {"role": "assistant", "content": "Hello! How can I assist with your ISP network operations today?"}

    last_user_message = next((m.content for m in reversed(request.messages) if m.role == "user"), "")

    # If OpenAI client is not available, use the integrated ISP knowledge engine
    if not client:
        reply_content = generate_fallback_response(last_user_message)
        return {
            "role": "assistant",
            "content": reply_content
        }

    try:
        # Build system context including system instructions and knowledge documents
        knowledge_context = "\n\n".join(KNOWLEDGE_DOCUMENTS.values())
        full_system_prompt = f"{MY_NET_SYSTEM_INSTRUCTIONS}\n\nDETAILED ISP KNOWLEDGE BASE:\n{knowledge_context}"

        messages: List[Dict[str, Any]] = [{"role": "system", "content": full_system_prompt}]
        for msg in request.messages[-8:]: # Keep last 8 turns for conversational context
            messages.append({"role": msg.role, "content": msg.content})

        # Call OpenAI with function tools enabled
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=AI_TOOLS,
            tool_choice="auto"
        )

        response_message = response.choices[0].message

        # Handle tool calls if the model requested any live system queries
        if response_message.tool_calls:
            tool_messages = list(messages)
            tool_messages.append(response_message)

            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                args = json.loads(tool_call.function.arguments or "{}")

                tool_result = ""
                if function_name == "tool_get_routers":
                    tool_result = tool_get_routers()
                elif function_name == "tool_search_payment":
                    tool_result = tool_search_payment(args.get("query", ""))
                elif function_name == "tool_search_voucher":
                    tool_result = tool_search_voucher(args.get("query", ""))
                elif function_name == "tool_get_system_overview":
                    tool_result = tool_get_system_overview()
                else:
                    tool_result = f"Tool {function_name} not found."

                tool_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_result
                })

            # Get final synthesized answer with real tool data included
            final_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=tool_messages
            )
            return {
                "role": "assistant",
                "content": final_response.choices[0].message.content
            }

        return {
            "role": "assistant",
            "content": response_message.content or generate_fallback_response(last_user_message)
        }
    except Exception as e:
        print(f"OpenAI error in ai_assistant ({e}). Falling back to internal knowledge engine.")
        return {
            "role": "assistant",
            "content": generate_fallback_response(last_user_message)
        }
