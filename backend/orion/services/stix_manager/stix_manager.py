from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Optional, Type
from orion.api.interactive.search_manager.search_data_model.defacement.search_defacement_callback_model import result_item as DefacementResultItem
from orion.api.interactive.search_manager.search_data_model.exploit.search_exploit_callback_model import result_item as ExploitResultItem
from orion.api.interactive.search_manager.search_data_model.leak.search_leak_callback_model import result_item as LeakResultItem
from orion.api.interactive.social_manager.social_models.search_social_callback_model import result_item as SocialResultItem
from orion.api.interactive.search_manager.search_data_model.general.search_general_callback_model import result_item as GeneralResultItem
from orion.api.interactive.search_manager.search_data_model.chat.search_chat_callback_model import result_item as ChatResultItem
from orion.api.interactive.search_manager.search_manager import search_manager
from orion.services.stix_manager.converters.chat_converter import chat_converter
from orion.services.stix_manager.converters.defacement_converter import defacement_converter
from orion.services.stix_manager.converters.exploit_converter import exploit_converter
from orion.services.stix_manager.converters.general_converter import general_converter
from orion.services.stix_manager.converters.leak_converter import leak_converter
from orion.services.stix_manager.converters.social_converter import social_converter


@dataclass(frozen=True)
class _stix_spec:
    fetch_method: str
    model_cls: Type[Any]
    converter_cls: Type[Any]
    missing_error: str
    accepts_lang: bool = True


class stix_manager:
    __instance: stix_manager | None = None
    _SPECS: Dict[str, _stix_spec] = {
        "defacement": _stix_spec(
            fetch_method="request_defacement_doc",
            model_cls=DefacementResultItem,
            converter_cls=defacement_converter,
            missing_error="No defacement document found",
            accepts_lang=False,
        ),
        "exploit": _stix_spec(
            fetch_method="request_exploit_doc",
            model_cls=ExploitResultItem,
            converter_cls=exploit_converter,
            missing_error="No exploit document found",
        ),
        "leak": _stix_spec(
            fetch_method="request_leak_doc",
            model_cls=LeakResultItem,
            converter_cls=leak_converter,
            missing_error="No leak document found",
        ),
        "social": _stix_spec(
            fetch_method="request_social_doc",
            model_cls=SocialResultItem,
            converter_cls=social_converter,
            missing_error="No social document found",
        ),
        "general": _stix_spec(
            fetch_method="request_general_doc",
            model_cls=GeneralResultItem,
            converter_cls=general_converter,
            missing_error="No general document found",
        ),
        "chat": _stix_spec(
            fetch_method="request_chat_doc",
            model_cls=ChatResultItem,
            converter_cls=chat_converter,
            missing_error="No chat document found",
        ),
    }

    def __init__(self) -> None:
        if stix_manager.__instance is not None:
            raise Exception("This class is a singleton!")
        self._search_model = search_manager.getInstance()
        stix_manager.__instance = self

    @staticmethod
    def get_instance() -> stix_manager:
        if stix_manager.__instance is None:
            stix_manager()
        return stix_manager.__instance  # type: ignore[return-value]

    async def _get_stix(self, kind: str, doc_id: str, lang: Optional[str] = None, tenant_name: str = "Tenant") -> Dict[str, Any]:
        spec = self._SPECS[kind]
        fetcher = getattr(self._search_model, spec.fetch_method)
        raw = await (fetcher(doc_id, lang) if spec.accepts_lang else fetcher(doc_id))
        if raw is None:
            return {"error": spec.missing_error, "doc_id": doc_id}
        return spec.converter_cls().convert(spec.model_cls(**raw), tenant_name)

    async def get_defacement_stix(self, doc_id: str, tenant_name: str = "Tenant") -> Dict[str, Any]:
        return await self._get_stix("defacement", doc_id, tenant_name=tenant_name)

    async def get_exploit_stix(self, doc_id: str, lang: Optional[str] = None, tenant_name: str = "Tenant") -> Dict[str, Any]:
        return await self._get_stix("exploit", doc_id, lang, tenant_name)

    async def get_leak_stix(self, doc_id: str, lang: Optional[str] = None, tenant_name: str = "Tenant") -> Dict[str, Any]:
        return await self._get_stix("leak", doc_id, lang, tenant_name)

    async def get_social_stix(self, doc_id: str, lang: Optional[str] = None, tenant_name: str = "Tenant") -> Dict[str, Any]:
        return await self._get_stix("social", doc_id, lang, tenant_name)

    async def get_general_stix(self, doc_id: str, lang: Optional[str] = None, tenant_name: str = "Tenant") -> Dict[str, Any]:
        return await self._get_stix("general", doc_id, lang, tenant_name)

    async def get_chat_stix(self, doc_id: str, lang: Optional[str] = None, tenant_name: str = "Tenant") -> Dict[str, Any]:
        return await self._get_stix("chat", doc_id, lang, tenant_name)
