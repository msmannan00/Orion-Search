from datetime import datetime, UTC
from fastapi.responses import JSONResponse
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_graph_sessions_model import db_graph_sessions_model


class graphs_model:
    __instance = None

    @staticmethod
    def getInstance():
        if graphs_model.__instance is None:
            graphs_model.__instance = graphs_model()
        return graphs_model.__instance

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()

    async def get_tabs_summary(self, user_id: str, graph_type: str = "social"):
        try:
            existing = await self._engine.find_one(
                db_graph_sessions_model, {"user_id": user_id, "graph_type": graph_type}
            )

            if existing is None:
                return {
                    "user_id": user_id,
                    "graph_type": graph_type,
                    "total_tabs": 0,
                    "max_tabs_allowed": 5,
                    "tabs": [],
                    "extra": {},
                }

            tabs = existing.tabs or []

            return {
                "user_id": user_id,
                "graph_type": existing.graph_type,
                "total_tabs": len(tabs),
                "max_tabs_allowed": 5,
                "tabs": tabs,
                "extra": existing.extra or {},
            }

        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Failed to fetch tabs summary"})

    async def add_tab(self, user_id: str, graph_type: str, tab: dict):
        try:
            existing = await self._engine.find_one(
                db_graph_sessions_model, {"user_id": user_id, "graph_type": graph_type}
            )

            now_utc = datetime.now(UTC)

            safe_tab = dict(tab or {})
            safe_tab.pop("graph_type", None)

            if existing is None:
                new_doc = db_graph_sessions_model(
                    user_id=user_id,
                    graph_type=graph_type,
                    tabs=[safe_tab],
                    tab_counter=1,
                    created_at=now_utc,
                    updated_at=now_utc,
                )
                saved = await self._engine.save(new_doc)
                return {
                    "user_id": user_id,
                    "graph_type": saved.graph_type,
                    "total_tabs": len(saved.tabs or []),
                    "max_tabs_allowed": 5,
                }

            tabs = existing.tabs or []
            if len(tabs) >= 5:
                return JSONResponse(
                    status_code=400,
                    content="Maximum 5 tabs are allowed for a single user",
                )

            existing.tabs = tabs + [safe_tab]
            existing.tab_counter = existing.tab_counter + 1
            existing.updated_at = now_utc

            saved = await self._engine.save(existing)
            return {
                "user_id": user_id,
                "graph_type": saved.graph_type,
                "total_tabs": len(saved.tabs or []),
                "max_tabs_allowed": 5,
            }

        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Failed to add tab"})

    async def upsert_data(self, user_id: str, graph_type: str, data: dict):
        try:
            existing = await self._engine.find_one(
                db_graph_sessions_model, {"user_id": user_id, "graph_type": graph_type}
            )

            now_utc = datetime.now(UTC)

            safe_data = dict(data or {})
            safe_data.pop("id", None)
            safe_data.pop("_id", None)
            safe_data.pop("user_id", None)
            safe_data.pop("created_at", None)
            safe_data.pop("updated_at", None)
            safe_data.pop("graph_type", None)

            if "tabs" in safe_data:
                if safe_data["tabs"] is None:
                    safe_data["tabs"] = []
                if len(safe_data["tabs"]) > 5:
                    return JSONResponse(
                        status_code=400,
                        content="Maximum 5 tabs are allowed for a single user",
                    )

            if existing is not None:
                if "active_tab_id" in safe_data:
                    existing.active_tab_id = safe_data["active_tab_id"]
                if "tab_counter" in safe_data:
                    existing.tab_counter = safe_data["tab_counter"]
                if "tabs" in safe_data:
                    existing.tabs = safe_data["tabs"]
                if "extra" in safe_data:
                    existing.extra = safe_data["extra"]
                if "schema_version" in safe_data:
                    existing.schema_version = safe_data["schema_version"]

                existing.user_id = user_id
                existing.graph_type = graph_type
                existing.updated_at = now_utc

                if existing.tabs is None:
                    existing.tabs = []
                if len(existing.tabs) > 5:
                    return JSONResponse(
                        status_code=400,
                        content="Maximum 5 tabs are allowed for a single user",
                    )

                saved = await self._engine.save(existing)
                return saved

            new_doc = db_graph_sessions_model(
                user_id=user_id,
                graph_type=graph_type,
                created_at=now_utc,
                updated_at=now_utc,
                active_tab_id=safe_data.get("active_tab_id", None),
                tab_counter=safe_data.get("tab_counter", 1),
                tabs=safe_data.get("tabs", []),
                extra=safe_data.get("extra", {}),
                schema_version=safe_data.get("schema_version", 1),
            )

            if len(new_doc.tabs) > 5:
                return JSONResponse(
                    status_code=400,
                    content="Maximum 5 tabs are allowed for a single user",
                )

            saved = await self._engine.save(new_doc)
            return saved

        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Failed to save graph data"})
