from datetime import UTC, datetime, timedelta
from typing import Any

from orion.api.interactive.social_manager.social_manager import social_manager


class social_helper:
    @staticmethod
    def normalize_username(query: str) -> str:
        return (query or "").strip().lstrip("@").lower()

    @staticmethod
    def normalize_profiles(result: Any, profile_username: str) -> list[dict]:
        if not isinstance(result, list):
            return []
        return [social_manager.flatten_recon_profile(item, profile_username) for item in result if isinstance(item, dict)]

    @staticmethod
    def as_progress(value: Any) -> int | None:
        try:
            return max(0, min(100, int(value)))
        except (TypeError, ValueError):
            return None

    @staticmethod
    def is_stale(row: dict, stale_seconds: int) -> bool:
        heartbeat = row.get("scan_heartbeat")
        if not isinstance(heartbeat, datetime):
            return True
        if heartbeat.tzinfo is None:
            heartbeat = heartbeat.replace(tzinfo=UTC)
        return datetime.now(UTC) - heartbeat > timedelta(seconds=stale_seconds)

    @staticmethod
    def build_status_response(profile_username: str, row: dict | None) -> dict[str, Any]:
        base = {"profile_username": profile_username}
        if not row:
            return {**base, "status": "none"}
        status = row.get("status") or "complete"
        if status == "pending":
            return {**base, "status": "pending", "progress": int(row.get("scan_progress") or 5), "step": str(row.get("scan_step") or "")}
        if status == "complete":
            return {**base, "result": row.get("profiles") or []}
        return {**base, "status": status, "message": str(row.get("scan_step") or status)}
