from datetime import datetime, timedelta

from orion.api.interactive.directory_manager.directory_shared_model.directory_callback_model import (
    directory_callback_link,
    directory_callback_model,
)
from orion.api.interactive.directory_manager.directory_shared_model.directory_param_model import (
    directory_param_model,
)
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_url_data_model import db_url_data_model


class directory_manager:
    __instance = None

    @staticmethod
    def getInstance():
        if directory_manager.__instance is None:
            directory_manager.__instance = directory_manager()
        return directory_manager.__instance

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()

    async def fetch_filtered_urls(self, params: directory_param_model):
        query = {}

        if params.content_type != "all":
            query["content_type"] = {"$elemMatch": {"$eq": params.content_type}}

        if params.index != "all":
            query["index_type"] = {"$elemMatch": {"$eq": params.index}}

        if params.network != "all":
            query["network_type"] = params.network

        if params.mDateRange:
            try:
                start_str, end_str = [s.strip() for s in params.mDateRange.split(",")]
                start_date = datetime.strptime(start_str, "%Y-%m-%d")
                end_date = datetime.strptime(end_str, "%Y-%m-%d") + timedelta(days=1)

                query["$or"] = [
                    {"leak_model_last_update": {"$gte": start_date, "$lt": end_date}},
                    {"geneic_model_last_update": {"$gte": start_date, "$lt": end_date}},
                ]
            except Exception as ex:
                log.g().e(f"Invalid directory date range '{params.mDateRange}': {ex}")

        total_count = await self._engine.count(db_url_data_model, query)

        page_size = 1000

        data = await self._engine.find(
            db_url_data_model,
            query,
            skip=max(0, (max(1, params.page) - 1) * page_size),
            limit=page_size,
        )

        return data, total_count

    async def invoke_directory(self, param: directory_param_model):
        results, total_count = await self.fetch_filtered_urls(param)
        return directory_callback_model(
            total_count=total_count,
            page=param.page,
            mDirectoryCallbackLinks=[directory_callback_link.from_odmantic(doc) for doc in results],
        )
