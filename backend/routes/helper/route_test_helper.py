from datetime import datetime, timezone
import json
from pathlib import Path
from threading import Lock
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

from orion.services.mongo_manager.shared_model.db_scan_job_model import db_scan_job_model
from orion.api.interactive.scan_job_manager.scan_job_manager import ScanJobManager
from bson import ObjectId
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from orion.helper_manager.env_handler import env_handler
from orion.api.interactive.takedown_manager.takedown_manager import TakedownManager
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName, UserStatus, db_user_account, user_role
from orion.services.mongo_manager.shared_model.db_takedown_request_model import TakedownCreateRequest, TakedownRequestStatus, db_takedown_request_model
from orion.services.mongo_manager.shared_model.db_tenant_model import TenantStatus, db_tenant_model


class TestRouteHelper:
    __test__ = False

    MOCKS_DIR = Path(__file__).resolve().parents[2] / "tests" / "mock" / "api"
    ELASTIC_MOCKS_DIR = Path(__file__).resolve().parents[2] / "tests" / "mock" / "elastic"
    _MOCK_STEPS: dict[str, int] = {}
    _MOCK_STEPS_LOCK = Lock()
    STATIC_TEST_CHAT_RESPONSE = "how may i help you"
    TAKEDOWN_TEST_PASSWORD = "".join(("1qaz", "!QAZ"))
    TAKEDOWN_TEST_TARGET_URL = "https://example.com/takedown-test"
    TAKEDOWN_TEST_TARGET_DOMAIN = "example.com"
    TAKEDOWN_TEST_ABUSE_EMAIL = "abuse@example.com"
    TAKEDOWN_TEST_TENANT_NAME = "cypress-takedown-tenant"
    TAKEDOWN_TEST_USERS = {
        "initiator": "tdinitiator01",
        "member": "tdmember01",
        "other": "tdother01",
    }

    @classmethod
    def mock_step(cls, key: str):
        with cls._MOCK_STEPS_LOCK:
            n = cls._MOCK_STEPS.get(key, 0)
            cls._MOCK_STEPS[key] = n + 1
        if n == 0:
            return {"status": "pending", "progress": 20, "step": "running"}
        return None

    @classmethod
    def load_elastic_mock(cls, filename: str):
        return json.loads((cls.ELASTIC_MOCKS_DIR / filename).read_text(encoding="utf-8"))

    @classmethod
    def load_api_mock(cls, filename: str):
        return json.loads((cls.MOCKS_DIR / filename).read_text(encoding="utf-8"))

    @classmethod
    def pending_or_api_mock(cls, step_key: str, filename: str):
        step = cls.mock_step(step_key)
        if step:
            return step
        return cls.load_api_mock(filename)

    @classmethod
    def pending_or_elastic_mock(cls, step_key: str, filename: str):
        step = cls.mock_step(step_key)
        if step:
            return step
        return cls.load_elastic_mock(filename)

    @classmethod
    def pending_or_dynamic_scan(cls, scan_type: str | None):
        scan_type = scan_type or "basic"
        step_key = f"urlscan_domain_{scan_type}"
        step = cls.mock_step(step_key)
        if step:
            return step
        filename = f"urlscan_domain_{scan_type}.json"
        return cls.load_api_mock(filename)

    @classmethod
    def scan_job_mock_response(cls, api_reference: str, payload: dict[str, Any]):
        normalized_api = api_reference.strip().lstrip("/").removeprefix("api/")
        if normalized_api in {"urlscan/domain", "urlscan/subdomains", "urlscan/dns", "urlscan/wayback"}:
            return cls.pending_or_dynamic_scan(payload.get("scanType"))
        if normalized_api == "netintel/url_vulnerability_scan":
            return cls.pending_or_dynamic_scan("vulnerability")
        if normalized_api == "social/videos":
            return cls.pending_or_elastic_mock("social_videos", "social_videos.json")
        if normalized_api == "social/shorts":
            return cls.pending_or_elastic_mock("social_shorts", "social_shorts.json")
        if normalized_api == "social/metadata":
            return cls.pending_or_elastic_mock("social_online_presence", "social_online_presence.json")
        if normalized_api == "search/stealer/ioc":
            return cls.load_elastic_mock("social_stealer_logs.json")

        mock_routes = {
            "dynamic/user": ("dynamic_user", "dynamic_user_done.json"),
            "dynamic/social": ("dynamic_social", "dynamic_social.json"),
            "dynamic/wanted": ("dynamic_wanted", "dynamic_wanted.json"),
            "dynamic/cracked": ("dynamic_cracked", "dynamic_cracked.json"),
            "dynamic/software": ("dynamic_software", "dynamic_software.json"),
            "crypto/scan": ("dynamic_crypto_scan", "dynamic_crypto_scan.json"),
            "ioc/extract": ("ioc_file_extract", "ioc_file_extract.json"),
            "apk/scan": ("ioc_apk_extract", "ioc_apk_extract.json"),
            "netintel/resolve_ip": ("netintel_resolve_ip", "netintel_resolve_ip.json"),
            "netintel/ipscanner": ("netintel_ipscanner", "netintel_ipscanner.json"),
            "netintel/iot_detect": ("netintel_camera_detect", "netintel_camera_detect.json"),
            "netintel/camera_detect_ranges": ("netintel_camera_detect", "netintel_camera_detect_ranges.json"),
        }
        if normalized_api in mock_routes:
            step_key, filename = mock_routes[normalized_api]
            return cls.pending_or_api_mock(step_key, filename)
        if normalized_api == "nexus/analyze-text":
            return cls.load_api_mock("nexus_analyze_text.json")
        return {"status": "done", "step": "complete", "result": {}}

    @staticmethod
    async def test_poll_scan_job(scan_id: str, current_user):
        manager = ScanJobManager.get_instance()

        job = await manager._engine.find_one(db_scan_job_model, (db_scan_job_model.id == ObjectId(scan_id)) & (db_scan_job_model.user_uuid == str(current_user.id)))
        if not job:
            raise HTTPException(status_code=404, detail="Scan job not found")

        response = job.response or {}
        scan_status = manager._job_status_from_response(response) if response else None
        if scan_status is None or not manager.is_terminal_status(scan_status.value):
            now = datetime.now(timezone.utc)
            mock_response = TestRouteHelper.scan_job_mock_response(job.api_reference, job.payload or {})
            job.response = mock_response if isinstance(mock_response, dict) else {"result": mock_response}
            job.updated_at = now
            computed_status = manager._job_status_from_response(job.response)
            if computed_status.value in {"partial", "done", "error"}:
                job.completed_at = now
            await manager._engine.save(job)

        return manager._build_poll_response(job)

    @classmethod
    def static_test_chat_response(cls):
        return {"result": {"response": cls.STATIC_TEST_CHAT_RESPONSE}, "status": "done"}

    @classmethod
    async def static_test_chat_stream(cls):
        yield json.dumps(
            {
                "output": {"response": cls.STATIC_TEST_CHAT_RESPONSE},
                "done": True,
                "error": False,
            },
            ensure_ascii=True,
        ) + "\n"

    @classmethod
    def static_test_chat_streaming_response(cls):
        return StreamingResponse(
            cls.static_test_chat_stream(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @classmethod
    def static_test_chat_session(cls, title: str = "New Chat", session_id: str | None = None, message_count: int = 0) -> dict[str, Any]:
        return {
            "session_id": session_id or f"cypress-ai-chat-{uuid4()}",
            "title": str(title or "New Chat").strip() or "New Chat",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message_count": message_count,
        }

    @classmethod
    def static_test_chat_detail(cls, session_id: str) -> dict[str, Any]:
        return {
            **cls.static_test_chat_session(session_id=session_id),
            "messages": [],
        }

    @classmethod
    def static_test_chat_message_response(cls, session_id: str, message: str) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        return {
            "chat": cls.static_test_chat_session(
                title=message,
                session_id=session_id,
                message_count=2,
            ),
            "user_message": {
                "id": f"cypress-user-{uuid4()}",
                "sender": "user",
                "text": message,
                "created_at": now,
            },
            "assistant_message": {
                "id": f"cypress-bot-{uuid4()}",
                "sender": "bot",
                "text": cls.STATIC_TEST_CHAT_RESPONSE,
                "created_at": now,
            },
        }

    @classmethod
    async def setup_takedown_visibility_fixture(cls):
        engine = mongo_controller.get_instance().get_engine()
        tenant_collection = engine.get_collection(db_tenant_model)
        user_collection = engine.get_collection(db_user_account)
        takedown_collection = engine.get_collection(db_takedown_request_model)

        await takedown_collection.delete_many({"target_domain": cls.TAKEDOWN_TEST_TARGET_DOMAIN})
        await user_collection.delete_many({"username": {"$in": list(cls.TAKEDOWN_TEST_USERS.values())}})
        await tenant_collection.delete_many({"name": cls.TAKEDOWN_TEST_TENANT_NAME})

        tenant = db_tenant_model(
            id=ObjectId(),
            name=cls.TAKEDOWN_TEST_TENANT_NAME,
            email=f"{cls.TAKEDOWN_TEST_TENANT_NAME}@example.com",
            phone="",
            country="",
            city="",
            postal_code="",
            verified=True,
            status=TenantStatus.ACTIVE,
            subscription=True,
            user_quota=-1,
            licenses=[LicenseName.ENTERPRISE.value, LicenseName.MAINTAINER.value],
            is_default=False,
            iocs=[],
            profile_visibility_enabled=True,
            event_management_enabled=False,
            alerts_visible_to_admin=True,
            privileged_ioc=False,
        )
        await engine.save(tenant)

        now = datetime.now(timezone.utc)
        tenant_uuid = str(tenant.id)

        async def create_user(key: str, role: user_role, licenses: list[LicenseName]):
            username = cls.TAKEDOWN_TEST_USERS[key]
            user = db_user_account(
                username=username,
                email=f"{username}@example.com",
                password=db_user_account.hash_password(cls.TAKEDOWN_TEST_PASSWORD),
                role=role,
                status=UserStatus.ACTIVE,
                subscription=True,
                licenses=licenses,
                tenant_uuid=tenant_uuid,
                account_verify_at=now,
                password_reset_required=False,
            )
            await engine.save(user)
            return user

        await create_user("initiator", user_role.ANALYST, [LicenseName.ENTERPRISE])
        await create_user("member", user_role.MEMBER, [LicenseName.ENTERPRISE, LicenseName.MAINTAINER])
        await create_user("other", user_role.ANALYST, [LicenseName.ENTERPRISE])

        return {
            "target_url": cls.TAKEDOWN_TEST_TARGET_URL,
            "target_domain": cls.TAKEDOWN_TEST_TARGET_DOMAIN,
            "abuse_email": cls.TAKEDOWN_TEST_ABUSE_EMAIL,
        }

    @classmethod
    async def takedown_fixture_user(cls, viewer: str):
        takedown_manager = TakedownManager.get_instance()
        viewer_key = str(viewer or "").strip().lower().replace("_", " ")

        if viewer_key == "admin":
            root_tenant_uuid = await takedown_manager._root_tenant_uuid()
            return SimpleNamespace(id="", tenant_uuid=root_tenant_uuid, username="admin", role=user_role.ADMIN)

        user_keys = {
            "initiator": "initiator",
            "member": "member",
            "tenant member": "member",
            "other": "other",
            "other user": "other",
        }
        user_key = user_keys.get(viewer_key)
        if not user_key:
            raise HTTPException(status_code=400, detail="Invalid takedown test viewer")

        user = await takedown_manager._engine.find_one(
            db_user_account,
            db_user_account.username == cls.TAKEDOWN_TEST_USERS[user_key],
        )
        if not user:
            raise HTTPException(status_code=404, detail="Takedown test fixture was not created")
        return user

    @classmethod
    async def create_test_takedown_request(cls, request: TakedownCreateRequest):
        takedown_manager = TakedownManager.get_instance()
        target_url = takedown_manager._normalize_target_url(request.target_url)
        target_domain = takedown_manager._target_domain(target_url)
        if target_domain != cls.TAKEDOWN_TEST_TARGET_DOMAIN:
            raise HTTPException(status_code=400, detail="Unsupported takedown test target")

        existing = await takedown_manager._engine.find_one(
            db_takedown_request_model,
            db_takedown_request_model.target_domain == target_domain,
        )
        if existing:
            return takedown_manager._existing_record_response(existing)

        root_tenant_uuid = await takedown_manager._root_tenant_uuid()
        now = datetime.now(timezone.utc)
        current_user = await cls.takedown_fixture_user("initiator")
        evidence = {
            "status": "done",
            "result": {
                "abuse_email_found": cls.TAKEDOWN_TEST_ABUSE_EMAIL,
                "html_path": "",
                "screenshot_path": "",
            },
        }
        record = db_takedown_request_model(
            tenant_uuid=root_tenant_uuid,
            requester_tenant_uuid=str(getattr(current_user, "tenant_uuid", "") or ""),
            user_uuid=str(getattr(current_user, "id", "") or ""),
            username=str(getattr(current_user, "username", "") or ""),
            report_id=request.report_id or "",
            target_url=target_url,
            target_domain=target_domain,
            abuse_email=cls.TAKEDOWN_TEST_ABUSE_EMAIL,
            status=TakedownRequestStatus.PENDING,
            evidence=evidence,
            created_at=now,
            updated_at=now,
        )
        await takedown_manager._engine.save(record)
        return takedown_manager._serialize_record(record)

    @classmethod
    async def list_test_takedown_requests(cls, viewer: str, status: str | None = None, q: str = "", page: int = 1, limit: int = 20, daterange: str = ""):
        current_user = await cls.takedown_fixture_user(viewer)
        return await TakedownManager.get_instance().list_requests(
            current_user,
            status=status,
            q=q,
            page=page,
            limit=limit,
            daterange=daterange,
        )

    @staticmethod
    def require_testing_enabled():
        if env_handler.get_instance().env("TESTING_ENABLED", "0") != "1":
            raise HTTPException(status_code=403, detail="Test routes are disabled")
        return True
