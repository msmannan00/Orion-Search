import asyncio
from asyncio import sleep
from pathlib import Path
from migrations.migration import migration_manager
from orion.api.interactive.backup_manager.backup_manager import BackupManager
from orion.api.interactive.social_manager.social_scanner import social_scanner
from orion.api.server.config_manager.config_controller import config_controller
from orion.helper_manager.env_handler import env_handler
from orion.helper_manager.helper_controller import helper_controller
from orion.management.managers.cronjob_manager import cronjob_manager
from orion.management.managers.test_manager import test_manager
from orion.services.arango_manager.arango_controller import arango_controller
from orion.services.elastic_manager.elastic_controller import elastic_controller
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.redis_manager.redis_controller import redis_controller
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS, REDIS_KEYS


class service_manager:
    __instance = None

    @staticmethod
    def get_instance():
        if service_manager.__instance is None:
            service_manager()
        return service_manager.__instance

    def __init__(self, url="http://elasticsearch:9400/_cluster/health"):
        if service_manager.__instance is not None:
            return

        service_manager.__instance = self
        self.__url = url
        self._is_available = False

    async def init_services(self, build_dir=None, run_migrations: bool = True):
        build_dir = build_dir or self.default_build_dir()
        while not self._is_available:
            try:
                _, writer = await asyncio.open_connection("elasticsearch", 9400)
                writer.close()
                await writer.wait_closed()

                await elastic_controller.get_instance().initialize()
                await mongo_controller.get_instance().link_connection()

                await test_manager.get_instance().reset_test_mongo_and_import_mocks()

                if run_migrations:
                    await migration_manager.get_instance().init_migration()
                await mongo_controller.get_instance().ensure_indexes()
                await mongo_controller.get_instance().initialize()

                await test_manager.get_instance().reset_test_elastic_and_import_mocks()

                await redis_controller.getInstance().initialize()
                await self.clear_test_insight_cache()
                await self.build_map_assets(build_dir)
                await config_controller.getInstance().load_config(force_db=True)
                await asyncio.sleep(5)

                await BackupManager.get_instance().resolve_interrupted_restore()

                await arango_controller.get_instance().link_connection()
                await arango_controller.get_instance().initialize()
                await test_manager.get_instance().reset_test_arango_and_import_mocks()
                await social_scanner.get_instance().resume_pending()

                self._is_available = True
                return True
            except (OSError, ConnectionRefusedError):
                await asyncio.sleep(5)

        return False

    async def init_cronjobs(self):
        if env_handler.get_instance().env("TESTING_ENABLED", "0") == "0":
            while not self._is_available:
                await sleep(5)
            await cronjob_manager.get_instance().init_jobs()

    def check_status(self):
        return self._is_available

    @staticmethod
    async def clear_test_insight_cache():
        if env_handler.get_instance().env("TESTING_ENABLED", "0") != "1":
            return

        for key in (
            REDIS_KEYS.APP_INSIGHT_KEY,
            f"{REDIS_KEYS.APP_INSIGHT_KEY}:country_v1",
            REDIS_KEYS.INSIGHT_STAT,
            REDIS_KEYS.GRAPH_INSIGHT_STAT,
        ):
            await redis_controller.getInstance().invoke_trigger(REDIS_COMMANDS.S_DELETE_KEY, [key])

    @staticmethod
    async def build_assets(build_dir):
        helper_controller.build_assets(build_dir)

    async def build_map_assets(self, build_dir):
        await helper_controller.init_map_entities_task(build_dir)
        await helper_controller.init_persona_posts_task(build_dir)

    @staticmethod
    def default_build_dir():
        return Path(__file__).resolve().parents[3] / "build"
