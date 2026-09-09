import motor.motor_asyncio
from odmantic import AIOEngine
from pymongo.errors import OperationFailure

from orion.api.interactive.tenant_manager.tenant_bootstrap import tenant_boostrap
from orion.helper_manager.env_handler import env_handler
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.mongo_enums import MONGO_CONNECTIONS
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus, LicenseName
from orion.services.mongo_manager.shared_model.db_backup_job_model import db_backup_job_model
from orion.services.mongo_manager.shared_model.db_document_feedback_model import db_document_feedback_model
from orion.services.mongo_manager.shared_model.db_feeder_script_model import db_feeder_script_model
from orion.services.mongo_manager.shared_model.db_scan_job_model import db_scan_job_model
from orion.services.mongo_manager.shared_model.db_scheduler_model import db_scheduler_model
from orion.services.mongo_manager.shared_model.db_social_model import SOCIAL_COLLECTION
from orion.services.mongo_manager.shared_model.db_social_session_model import db_social_session_model
from orion.services.mongo_manager.shared_model.db_social_profile_management_model import db_social_profile_management_model
from orion.services.mongo_manager.shared_model.db_social_automation_result_model import db_social_automation_result_model
from orion.services.mongo_manager.shared_model.db_alert_connector_model import db_alert_connector_model
from orion.services.mongo_manager.shared_model.db_takedown_request_model import db_takedown_request_model
from orion.services.mongo_manager.shared_model.db_tenant_model import db_tenant_model
from orion.services.mongo_manager.shared_model.db_auth_models import db_user_account, user_role


class mongo_controller:
    __instance = None
    __m_connection = None

    @staticmethod
    def get_instance():
        if mongo_controller.__instance is None:
            mongo_controller()
        return mongo_controller.__instance

    def __init__(self):
        mongo_controller.__instance = self
        self.__m_connection = None
        self.__engine = None

    async def link_connection(self):
        try:
            mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
                MONGO_CONNECTIONS.S_MONGO_DATABASE_IP,
                MONGO_CONNECTIONS.S_MONGO_DATABASE_PORT,
                username=MONGO_CONNECTIONS.S_MONGO_USERNAME,
                password=MONGO_CONNECTIONS.S_MONGO_PASSWORD, )

            self.__m_connection = mongo_client[MONGO_CONNECTIONS.S_MONGO_DATABASE_NAME]
            self.__engine = AIOEngine(client=mongo_client, database=MONGO_CONNECTIONS.S_MONGO_DATABASE_NAME)

        except Exception as ex:
            log.g().e(f"MONGO CONNECTION ERROR: {ex}")

    async def ensure_indexes(self):
        user_collection = self.__engine.get_collection(db_user_account)

        await user_collection.create_index([("username", 1)], unique=True)

        await user_collection.create_index(
            [("role", 1)],
            unique=True,
            partialFilterExpression={"role": user_role.ADMIN.value},
            name="unique_admin_role", )

        await user_collection.create_index(
            [("tenant_uuid", 1)],
            unique=True,
            partialFilterExpression={"licenses": ["maintainer"]},
            name="unique_maintainer_per_company", )

        await self.__engine.get_collection(db_document_feedback_model).create_index("doc_id", unique=True)
        await self.__engine.get_collection(db_scan_job_model).create_index([("user_uuid", 1), ("created_at", -1)])
        await self.__engine.get_collection(db_takedown_request_model).create_index("target_domain", unique=True)
        await self.__engine.get_collection(db_scheduler_model).create_index([("job_key", 1), ("scheduled_for", 1)],unique=True)
        await self.__engine.get_collection(db_backup_job_model).create_index([("job_key", 1)], unique=True, name="unique_backup_job_key")
        await self.__engine.database[SOCIAL_COLLECTION].create_index([("user_id", 1), ("profile_username", 1), ("updated_at", -1)])
        await self.__engine.get_collection(db_social_session_model).create_index([("user_id", 1), ("platform", 1), ("created_at", -1)])
        self.__engine.get_collection(db_social_profile_management_model).create_index([("user_id", 1)], unique=True)
        await self.__engine.get_collection(db_social_automation_result_model).create_index([("user_id", 1)], unique=True, name="unique_social_automation_result_user")
        await self.__engine.get_collection(db_alert_connector_model).create_index([("connector_type", 1), ("provider", 1), ("tenant_id", 1)], unique=True, name="unique_alert_connector_scope")
        feeder_collection = self.__engine.get_collection(db_feeder_script_model)
        try:
            await feeder_collection.drop_index("name_1")
        except OperationFailure as exc:
            _ = exc
        await feeder_collection.create_index([("name", 1), ("url", 1)], unique=True, name="unique_feeder_name_url")

    def get_engine(self) -> AIOEngine:
        return self.__engine

    async def ensure_demo_user(self):
        demo_username = env_handler.get_instance().env("DEMO_USERNAME")
        demo_password = env_handler.get_instance().env("DEMO_PASSWORD")

        if not demo_username or not demo_password:
            return

        demo_user = await self.__engine.find_one(db_user_account, db_user_account.username == demo_username)
        if demo_user:
            return

        default_tenant = await self.__engine.find_one(db_tenant_model, db_tenant_model.is_default == True)
        if not default_tenant:
            return

        await self.__engine.save(db_user_account(
            username=demo_username,
            password=demo_password,
            role=user_role.DEMO,
            status=UserStatus.ACTIVE,
            subscription=True,
            licenses=[LicenseName.OSINT_BASIC],
            tenant_uuid=str(default_tenant.id), ))

    async def ensure_nexus_user(self):
        if env_handler.get_instance().env("PRODUCTION") != "0":
            return

        nexus_username = env_handler.get_instance().env("NEXUS_USERNAME")
        nexus_password = env_handler.get_instance().env("NEXUS_PASSWORD")
        if not nexus_password or await self.__engine.find_one(db_user_account, db_user_account.username == "nexus"):
            return

        default_tenant = await self.__engine.find_one(db_tenant_model, db_tenant_model.is_default == True)
        if not default_tenant:
            return

        await self.__engine.save(db_user_account(
            username=nexus_username,
            password=nexus_password,
            role=user_role.ANALYST,
            status=UserStatus.ACTIVE,
            subscription=True,
            licenses=[LicenseName.ENTERPRISE],
            tenant_uuid=str(default_tenant.id), ))

    async def initialize(self):
        await self.ensure_indexes()

        default_tenant = await self.__engine.find_one(db_tenant_model, db_tenant_model.is_default == True)
        if not default_tenant:
            await tenant_boostrap(self.__engine)
        elif getattr(default_tenant, "event_management_enabled", False) != True:
            default_tenant.event_management_enabled = True
            await self.__engine.save(default_tenant)
        await self.ensure_demo_user()
        await self.ensure_nexus_user()
