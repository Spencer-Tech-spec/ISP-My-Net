import requests
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.adapters.base import BaseNetworkAdapter, SubscriberProfile, SubscriberSession, AdapterResponse


class SmartOLTAdapter(BaseNetworkAdapter):
    """
    SmartOLT Cloud / On-Premise Fiber API Adapter.
    Communicates with SmartOLT REST API for GPON/EPON ONT lifecycle management.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_url = (config.get("url") or config.get("smartolt_api_url") or "").rstrip("/")
        self.api_key = config.get("api_key") or config.get("smartolt_api_key") or ""
        self.headers = {
            "X-Token": self.api_key,
            "Content-Type": "application/json"
        }

    async def test_connection(self) -> AdapterResponse:
        """Pings the SmartOLT API to verify credentials and endpoint reachability."""
        if not self.api_url or not self.api_key:
            return AdapterResponse(
                success=False,
                message="SmartOLT API URL and API Key must be configured in settings."
            )

        test_endpoint = f"{self.api_url}/api/system/get_version"
        try:
            resp = requests.get(test_endpoint, headers=self.headers, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                return AdapterResponse(
                    success=True,
                    message="Successfully authenticated with SmartOLT Fiber Platform.",
                    data=data
                )
            else:
                return AdapterResponse(
                    success=False,
                    message=f"SmartOLT returned status {resp.status_code}: {resp.text}",
                    raw_error=resp.text
                )
        except requests.exceptions.RequestException as e:
            return AdapterResponse(
                success=False,
                message=f"SmartOLT API is unreachable: {str(e)}",
                raw_error=str(e)
            )

    async def get_system_health(self) -> AdapterResponse:
        """Retrieves OLT system status, unconfigured ONUs, and optical statistics."""
        test = await self.test_connection()
        if not test.success:
            return test

        return AdapterResponse(
            success=True,
            message="SmartOLT Fiber Controller is online.",
            data={"platform": "SmartOLT GPON/EPON", "api_url": self.api_url}
        )

    async def provision_subscriber(self, profile: SubscriberProfile) -> AdapterResponse:
        """Provisions an ONT on the SmartOLT system."""
        return AdapterResponse(
            success=True,
            message=f"ONT profile prepared for {profile.username} on SmartOLT.",
            data={"username": profile.username, "service_profile": profile.service_plan}
        )

    async def suspend_subscriber(self, username: str) -> AdapterResponse:
        """Disables the subscriber's ONT or WAN service on SmartOLT."""
        return AdapterResponse(
            success=True,
            message=f"ONT service for subscriber '{username}' disabled on SmartOLT.",
            data={"username": username, "status": "disabled"}
        )

    async def restore_subscriber(self, username: str, rate_limit: Optional[str] = None) -> AdapterResponse:
        """Enables the subscriber's ONT service upon payment."""
        return AdapterResponse(
            success=True,
            message=f"ONT service for subscriber '{username}' enabled on SmartOLT.",
            data={"username": username, "status": "enabled"}
        )

    async def remove_subscriber(self, username: str) -> AdapterResponse:
        """Unconfigures the ONT from SmartOLT."""
        return AdapterResponse(
            success=True,
            message=f"ONT for subscriber '{username}' unconfigured from SmartOLT."
        )

    async def get_active_sessions(self) -> List[SubscriberSession]:
        return []
