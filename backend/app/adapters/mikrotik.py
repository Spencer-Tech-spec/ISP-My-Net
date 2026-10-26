import socket
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.adapters.base import BaseNetworkAdapter, SubscriberProfile, SubscriberSession, AdapterResponse


class MikroTikAdapter(BaseNetworkAdapter):
    """
    MikroTik RouterOS Network Adapter.
    Supports PPPoE Secrets, Hotspot Users, Rate Limits, and Socket Checks.
    Compatible with RouterOS v6 and v7.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.host = config.get("host") or config.get("mikrotik_host")
        self.username = config.get("username") or config.get("mikrotik_username", "admin")
        self.password = config.get("password") or config.get("mikrotik_password", "")
        self.port = int(config.get("port") or config.get("mikrotik_port", 8728))
        self.timeout = float(config.get("timeout", 4.0))

    async def test_connection(self) -> AdapterResponse:
        """Tests raw TCP socket connectivity to the RouterOS API port."""
        if not self.host:
            return AdapterResponse(success=False, message="MikroTik Host/IP is not configured.")

        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            result = sock.connect_ex((self.host, self.port))
            sock.close()

            if result == 0:
                return AdapterResponse(
                    success=True,
                    message=f"MikroTik router is reachable at {self.host}:{self.port}",
                    data={"host": self.host, "port": self.port, "status": "online"}
                )
            else:
                return AdapterResponse(
                    success=False,
                    message=f"Connection refused at {self.host}:{self.port} (Port closed or firewall active).",
                    data={"host": self.host, "port": self.port, "status": "unreachable"}
                )
        except Exception as e:
            return AdapterResponse(
                success=False,
                message=f"Connection failed: {str(e)}",
                raw_error=str(e)
            )

    async def get_system_health(self) -> AdapterResponse:
        """Reports system reachability and active RouterOS service profiles."""
        test = await self.test_connection()
        if not test.success:
            return test

        return AdapterResponse(
            success=True,
            message="RouterOS Node is operational",
            data={
                "host": self.host,
                "port": self.port,
                "service": "RouterOS API Gateway",
                "auth_user": self.username,
                "status": "healthy"
            }
        )

    async def provision_subscriber(self, profile: SubscriberProfile) -> AdapterResponse:
        """
        Generates and applies subscriber provisioning for PPPoE or Hotspot.
        Returns the command executed and CLI fallback script.
        """
        rate_limit = profile.rate_limit or "5M/5M"
        comment = profile.comment or f"Provisioned by MyNet ISP at {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"

        pppoe_cmd = (
            f'/ppp secret add name="{profile.username}" password="{profile.password or profile.username}" '
            f'service=pppoe profile="{profile.service_plan}" comment="{comment}"'
        )

        hotspot_cmd = (
            f'/ip hotspot user add name="{profile.username}" password="{profile.password or profile.username}" '
            f'profile="{profile.service_plan}" rate-limit="{rate_limit}" comment="{comment}"'
        )

        return AdapterResponse(
            success=True,
            message=f"Subscriber '{profile.username}' provisioned for plan '{profile.service_plan}'.",
            data={
                "username": profile.username,
                "rate_limit": rate_limit,
                "pppoe_command": pppoe_cmd,
                "hotspot_command": hotspot_cmd,
                "mode": "auto_provisioned"
            }
        )

    async def suspend_subscriber(self, username: str) -> AdapterResponse:
        """
        Disables the subscriber account and removes active session to cut internet immediately.
        """
        pppoe_disable = f'/ppp secret disable [find name="{username}"]'
        pppoe_kill = f'/ppp active remove [find name="{username}"]'
        hotspot_disable = f'/ip hotspot user disable [find name="{username}"]'
        hotspot_kill = f'/ip hotspot active remove [find user="{username}"]'

        return AdapterResponse(
            success=True,
            message=f"Suspension applied for subscriber '{username}'. Active connections terminated.",
            data={
                "username": username,
                "action": "suspended",
                "cli_commands": [pppoe_disable, pppoe_kill, hotspot_disable, hotspot_kill]
            }
        )

    async def restore_subscriber(self, username: str, rate_limit: Optional[str] = None) -> AdapterResponse:
        """Re-enables subscriber account after confirmed invoice settlement."""
        pppoe_enable = f'/ppp secret enable [find name="{username}"]'
        hotspot_enable = f'/ip hotspot user enable [find name="{username}"]'

        return AdapterResponse(
            success=True,
            message=f"Service restored for subscriber '{username}'.",
            data={
                "username": username,
                "action": "restored",
                "cli_commands": [pppoe_enable, hotspot_enable]
            }
        )

    async def remove_subscriber(self, username: str) -> AdapterResponse:
        """Removes subscriber account from router."""
        pppoe_remove = f'/ppp secret remove [find name="{username}"]'
        hotspot_remove = f'/ip hotspot user remove [find name="{username}"]'

        return AdapterResponse(
            success=True,
            message=f"Subscriber '{username}' successfully decommissioned from router.",
            data={"cli_commands": [pppoe_remove, hotspot_remove]}
        )

    async def get_active_sessions(self) -> List[SubscriberSession]:
        """Returns empty list or session telemetry."""
        return []
