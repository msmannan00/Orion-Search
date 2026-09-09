import asyncio
import sys

from orion.api.interactive.backup_manager.backup_manager import BackupManager
from orion.services.arango_manager.arango_controller import arango_controller
from orion.services.elastic_manager.elastic_controller import elastic_controller
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.mongo_controller import mongo_controller


async def main():
    if len(sys.argv) != 2:
        print("Usage: python restore_backup.py <backup_name>")
        sys.exit(1)

    backup_name = sys.argv[1]

    await mongo_controller.get_instance().link_connection()
    await arango_controller.get_instance().link_connection()
    await elastic_controller.get_instance().initialize()

    try:
        await BackupManager.get_instance().restore_backup(backup_name, source="cli")
        print(f"Restore completed successfully: {backup_name}")
    except Exception as exc:
        log.g().e(f"RESTORE CLI FAILED: {exc}")
        print(f"Restore failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
