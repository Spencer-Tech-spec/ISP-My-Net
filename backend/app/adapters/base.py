from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime


class SubscriberProfile(BaseModel):
    username: str
    password: Optional[str] = None
    service_plan: str                       # e.g., "10Mbps-Home"
    rate_limit: Optional[str] = "10M/10M"   # upload/download
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    comment: Optional[str] = None
    server: Optional[str] = None            # e.g., "all" or specific PPPoE/Hotspot service


class SubscriberSession(BaseModel):
    username: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    uptime: Optional[str] = None
    bytes_in: Optional[int] = 0
    bytes_out: Optional[int] = 0
    signal_dbm: Optional[float] = None
    status: str = "active"


class AdapterResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    raw_error: Optional[str] = None
    timestamp: datetime = datetime.utcnow()


class BaseNetworkAdapter(ABC):
    """
    Common Network Integration Interface.
    Enables My Net ISP to manage MikroTik, SmartOLT, RADIUS, and Wireless
    through a standardized contract without vendor lock-in.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    @abstractmethod
    async def test_connection(self) -> AdapterResponse:
        """Verifies reachability and authentication to the network equipment."""
        pass

    @abstractmethod
    async def get_system_health(self) -> AdapterResponse:
        """Returns CPU, RAM, uptime, and firmware information."""
        pass

    @abstractmethod
    async def provision_subscriber(self, profile: SubscriberProfile) -> AdapterResponse:
        """Creates or registers a subscriber profile/account."""
        pass

    @abstractmethod
    async def suspend_subscriber(self, username: str) -> AdapterResponse:
        """Suspends or drops active internet session for overdue/cancelled users."""
        pass

    @abstractmethod
    async def restore_subscriber(self, username: str, rate_limit: Optional[str] = None) -> AdapterResponse:
        """Restores service after confirmation of payment."""
        pass

    @abstractmethod
    async def remove_subscriber(self, username: str) -> AdapterResponse:
        """Decommission / deletes subscriber from device."""
        pass

    @abstractmethod
    async def get_active_sessions(self) -> List[SubscriberSession]:
        """Lists active connected sessions."""
        pass
