# =====================================================================
# MY NET AI — ISP KNOWLEDGE BASE & SYSTEM MANUAL
# =====================================================================

MY_NET_SYSTEM_INSTRUCTIONS = """
IDENTITY & MISSION:
You are 'My Net AI', the intelligent ISP operations assistant built into the My Net ISP Management System.
My Net is a multi-tenant SaaS platform built for Internet Service Providers (ISPs), particularly small and medium-sized providers in Kenya.
Your mission is to help authorized administrators, customer support staff, accountants, technicians, and field engineers operate the platform safely and efficiently.

CORE OPERATIONAL RULES:
1. PLATFORM ACCURACY:
   - Only explain features that actually exist in the My Net system.
   - Use exact navigation paths:
     • Dashboard: /admin
     • Subscribers: /admin/users
     • Payments & Transactions: /admin/payments
     • Network Management (Routers, Hotspot, Vouchers): /admin/network
     • Inventory & Equipment: /admin/inventory
     • Payroll Control: /admin/payroll
     • Staff Management: /admin/employees
     • Support Tickets: /admin/tickets
     • Platform Billing (3% Revenue Share): /billing
     • System Settings & M-Pesa Paybill: /admin/settings
   - When explaining a procedure, provide numbered steps referencing the exact tab or button.
   - Never invent features, buttons, or capabilities that are not in the platform.

2. M-PESA & BILLING INTEGRITY:
   - Treat payments as successful ONLY when confirmed in the system database or by Safaricom Daraja / PayHero callback.
   - Never assume or claim an M-Pesa transaction was received without verification.
   - Support Paybill, Till (Buy Goods), and Bank Paybill (e.g., PayHero Channel 13240).
   - If a customer paid but has no internet, guide staff to:
     1. Search M-Pesa Receipt in /admin/payments.
     2. If missing, check /admin/network -> "Rescue Package" button to manually issue an access pass with the M-Pesa code.

3. MIKROTIK & NETWORK OPERATIONS:
   - You understand MikroTik RouterOS (v6 & v7), Hotspot Captive Portals, PPPoE Servers, IP Pools, Walled Gardens, and API Port 8728.
   - Never expose plaintext passwords or private credentials.
   - Before recommending disruptive network actions (like rebooting a router), explain the impact on connected users.
   - Prefer read-only diagnostics first.

4. MULTI-TENANT ISOLATION:
   - My Net hosts multiple independent ISP companies.
   - Never disclose one ISP's customer, payment, or router data to another ISP.

5. KENYAN CONTEXT:
   - Use Kenyan English where appropriate and Kenyan Shillings (KES / KSh).
   - Understand local fiber deployment, drop cables, ONUs/CPEs, and technician field dispatches.
   - Communication style: Professional, concise, actionable, and structured with clear bullet points.
"""

KNOWLEDGE_DOCUMENTS = {
    "dashboard_navigation": """
### DASHBOARD NAVIGATION MANUAL
- **Dashboard (/admin)**: High-level overview of active subscribers, monthly revenue, pending payments, and network health.
- **Subscribers (/admin/users)**: Manage PPPoE and Hotspot users, add new clients, view installation status, assigned IP, and PPPoE secrets.
- **Payments (/admin/payments)**: Live M-Pesa transactions, payment confirmations, manual receipts, and revenue reconciliation.
- **Network Management (/admin/network)**:
  • Tab 1: Connected Routers - Link MikroTik routers (IP, API credentials), generate RouterOS setup scripts, view Hotspot Portal links.
  • Tab 2: Hotspot Packages - Create and manage pricing passes (e.g., 30 Mins, 2 Hours, 24 Hours, Weekly, Monthly) with bandwidth limits.
  • Tab 3: Vouchers & Rescue - Search active voucher codes, rescue delayed M-Pesa payments by generating instant voucher passes with SMS templates.
- **Inventory & Equipment (/admin/inventory)**: Track routers, fiber ONUs, drop cables, serial numbers, stock movement, and technician dispatches.
- **Payroll Control (/admin/payroll)**: Staff salaries, technician commissions, overtime, and monthly disbursement records.
- **Staff Management (/admin/employees)**: Manage team members, technicians, roles, and platform permissions.
- **Support Tickets (/admin/tickets)**: Customer fault logging, technician job assignments, and ticket resolution.
- **Platform Billing (/billing)**: 3% SaaS revenue share fee payment via M-Pesa STK Push.
- **Settings (/admin/settings)**: Company profile, M-Pesa Daraja API keys, Paybill/Till numbers, and Bank Paybill configurations.
""",

    "mikrotik_hotspot_guide": """
### MIKROTIK HOTSPOT & NETWORK INTEGRATION GUIDE
1. **Linking a MikroTik Router**:
   - Go to `/admin/network` -> Click **"Link MikroTik"**.
   - Provide Router Name, Public/LAN IP, API Port (default: 8728), admin username, and password.
   - Specify Hotspot SSID (e.g. 'MyNet Hotspot WiFi') and DNS Name (e.g. 'hotspot.mynet.local').
2. **Applying Configuration Script**:
   - Click the **"Script"** button on the router card.
   - Copy the generated RouterOS configuration script.
   - Open Winbox -> New Terminal -> Paste and press Enter.
   - This automatically configures:
     • Walled garden entries for Safaricom M-Pesa (*.safaricom.co.ke) and Supabase cloud.
     • Captive portal redirect URL to your cloud hotspot portal.
     • Hotspot default profile login methods (HTTP-CHAP, HTTP-PAP, Cookie).
3. **Hotspot Captive Portal**:
   - Customers connecting to the WiFi are redirected to `/hotspot?router={router_id}`.
   - Customers choose a package, enter their M-Pesa phone number, and receive an STK Push prompt.
   - Upon payment confirmation, an instant voucher code is generated and activated.
4. **PPPoE Configuration**:
   - PPPoE service runs on `/interface pppoe-server server`.
   - Profiles define local-address, remote-address (pool), and rate-limit (Rx/Tx).
   - Subscribers are added under `/ppp secret`.
""",

    "mpesa_troubleshooting": """
### M-PESA & BILLING TROUBLESHOOTING
1. **Customer Paid via M-Pesa But Internet Is Still Inactive**:
   - Step 1: Request the customer's M-Pesa Transaction Code (e.g., `SLK872X91J`) and phone number.
   - Step 2: Open `/admin/payments` and search for the transaction code.
   - Step 3: If found and status is 'Completed', verify the customer account is activated in `/admin/users`.
   - Step 4: If the payment is missing (delayed Safaricom callback), go to `/admin/network` -> Click **"Rescue Package"**.
     • Enter customer phone number, choose the package paid for, and enter the M-Pesa receipt code.
     • Click "Generate & Rescue Voucher".
     • Copy the ready-to-send SMS and send it to the customer via SMS or WhatsApp with their voucher code.
2. **M-Pesa STK Push Not Prompting Customer**:
   - Verify customer entered a valid Safaricom number in format `07XXXXXXXX` or `2547XXXXXXXX`.
   - Check if customer's SIM card has active STK toolkit and sufficient funds.
   - Verify M-Pesa credentials under `/admin/settings`.
""",

    "general_troubleshooting": """
### GENERAL ISP FAULT DIAGNOSIS
1. **Router Shows Offline in Admin Dashboard**:
   - Verify MikroTik has active internet connectivity (Ping 8.8.8.8 from terminal).
   - Verify API service is enabled in RouterOS: `/ip service print` (ensure 'api' on port 8728 is enabled).
   - If using private IP (e.g., 192.168.88.1), router can only be managed from the local network or via VPN/tunnel.
2. **Customer Has Slow Speeds**:
   - Check bandwidth profile rate-limit on router (`/queue simple` or `/ppp profile`).
   - Check signal strength (Rx/Tx optical power for Fiber ONU between -15 dBm and -25 dBm; wireless RSSI > -65 dBm).
   - Inspect router CPU usage (`/system resource print`).
3. **Escalation**:
   - If physical line fault or fiber cut is suspected, create a ticket in `/admin/tickets` and dispatch a field technician.
"""
}
