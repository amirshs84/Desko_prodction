from __future__ import annotations

import hmac

from ...domain.entities import Device
from ...domain.errors import NotFound
from ...domain.repositories import DeviceRepository
from ..commands import RegisterDeviceCommand
from ..ports import Clock


class DeviceService:
    def __init__(self, *, devices: DeviceRepository, clock: Clock) -> None:
        self._devices = devices
        self._clock = clock

    def register(self, cmd: RegisterDeviceCommand) -> Device:
        now = self._clock.now()
        device = self._devices.get_by_token(cmd.token)
        if device is None:
            device = Device.register(
                user_id=cmd.user_id,
                platform=cmd.platform,
                token=cmd.token,
                now=now,
                app_version=cmd.app_version,
                locale=cmd.locale,
                timezone=cmd.timezone,
            )
        else:
            device.refresh(
                user_id=cmd.user_id,
                now=now,
                app_version=cmd.app_version,
                locale=cmd.locale,
                timezone=cmd.timezone,
            )
        self._devices.save(device)
        return device

    def unregister(self, user_id: int, token: str) -> None:
        device = self._devices.get_by_token(token)
        if device is None or device.user_id != user_id:
            raise NotFound("دستگاه یافت نشد.")
        device.deactivate()
        self._devices.save(device)

    def authenticate_tracking(self, device_id, secret: str) -> Device | None:
        """احراز سبک برای سرویس native که JWT ندارد."""
        device = self._devices.get(device_id)
        if device is None or not device.is_active:
            return None
        if not hmac.compare_digest(device.tracking_secret, secret or ""):
            return None
        return device
