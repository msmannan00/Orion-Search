from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_case_model import db_case_model
from orion.services.mongo_manager.shared_model.db_system_settings import AllowedKeys, db_system_model


class migration_1_0_3_16:

    @staticmethod
    async def migrate(version):
        engine = mongo_controller.get_instance().get_engine()

        if engine is None:
            raise Exception("MongoDB is not connected. Migration cannot proceed.")

        await migration_1_0_3_16.backfill_case_communications(engine)
        await migration_1_0_3_16.update_version(engine, version)

    @staticmethod
    async def backfill_case_communications(engine):
        case_collection = engine.get_collection(db_case_model)
        await case_collection.update_many(
            {"communications": {"$exists": False}},
            {"$set": {"communications": []}},
        )

    @staticmethod
    async def update_version(engine, version):
        existing = await engine.find_one(db_system_model, db_system_model.key == AllowedKeys.VERSION)
        if existing is None:
            await engine.save(db_system_model(key=AllowedKeys.VERSION, value=str(version)))
        else:
            existing.value = str(version)
            await engine.save(existing)
