from typing import Any

from bson import ObjectId
from cryptography.fernet import Fernet

from orion.services.encryption_manager.key_manager import KeyManager
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.shared_model.db_tenant_model import IocCategory, db_tenant_model


class TenantIocService:
    async def get_iocs_of_tenant(self, tenant: db_tenant_model) -> list[IocCategory]:
        try:
            if not tenant or not tenant.iocs:
                return []

            enc = await self._tenant_fernet(tenant.id)

            iocs = []
            for ioc in tenant.iocs or []:
                iocs.append(
                    IocCategory(
                        ioc_id=(enc.decrypt(ioc.ioc_id.encode()).decode() if ioc.ioc_id else ioc.ioc_id),
                        name=(enc.decrypt(ioc.name.encode()).decode() if ioc.name else ioc.name),
                        values=[(enc.decrypt(v.encode()).decode() if v else v) for v in (ioc.values or [])],
                    )
                )
            return iocs
        except Exception as ex:
            tenant_id: Any = getattr(tenant, "id", None)
            log.g().e(f"Failed to decrypt IOCs for tenant={tenant_id}: {ex}")
        return []

    async def decrypt_tenant_for_api(self, tenant: db_tenant_model) -> db_tenant_model:
        enc = await self._tenant_fernet(tenant.id)

        tenant.name = enc.decrypt(tenant.name.encode()).decode()
        tenant.phone = enc.decrypt(tenant.phone.encode()).decode()
        tenant.country = enc.decrypt(tenant.country.encode()).decode()
        tenant.city = enc.decrypt(tenant.city.encode()).decode()
        tenant.postal_code = enc.decrypt(tenant.postal_code.encode()).decode()
        tenant.licenses = [enc.decrypt(l.encode()).decode() for l in (tenant.licenses or [])]
        tenant.email = enc.decrypt(tenant.email.encode()).decode() if tenant.email else ""

        tenant.iocs = [
            IocCategory(
                ioc_id=enc.decrypt(ioc.ioc_id.encode()).decode(),
                name=enc.decrypt((ioc.name or "").encode()).decode(),
                values=[enc.decrypt(v.encode()).decode() for v in (ioc.values or [])],
            )
            for ioc in (tenant.iocs or [])
        ]
        return tenant

    async def _tenant_fernet(self, tenant_id) -> Fernet:
        dek = await KeyManager.get_instance().get_profile_dek(ObjectId(tenant_id))
        return Fernet(dek)
