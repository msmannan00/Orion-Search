from pathlib import Path

from fastapi import UploadFile, HTTPException
from fastapi.responses import FileResponse

from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
from orion.services.mongo_manager.shared_model.db_system_settings import AllowedKeys


class ResourceManager:
    __instance = None
    IMAGE_MAX_BYTES = 100 * 1024
    IMMUTABLE_IMAGE_CACHE_HEADERS = {
        "Cache-Control": "public, max-age=31536000, immutable"
    }
    SYSTEM_RESOURCE_FILES = {
        "logo_url_default.png",
        "logo_url_custom.png",
        "logo_wide_light_default.png",
        "logo_wide_light_custom.png",
        "logo_wide_dark_default.png",
        "logo_wide_dark_custom.png",
        "auth_dashboard_icon_default.png",
        "auth_dashboard_icon_custom.png",
    }

    def __init__(self):
        self.BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
        self.USER_DIR = self.BASE_DIR / "workspace" / "resource" / "profile"
        self.TENANT_DIR = self.BASE_DIR / "workspace" / "resource" / "tenant"
        self.SYSTEM_DIR = self.BASE_DIR / "workspace" / "resource" / "system"
        self.ROBOTS_FILE = self.BASE_DIR / "static" / "robots.txt"

        self.USER_DIR.mkdir(parents=True, exist_ok=True)
        self.TENANT_DIR.mkdir(parents=True, exist_ok=True)
        self.SYSTEM_DIR.mkdir(parents=True, exist_ok=True)

        if ResourceManager.__instance is not None:
            raise Exception("This class is a singleton!")
        ResourceManager.__instance = self

    @staticmethod
    def get_instance():
        if ResourceManager.__instance is None:
            ResourceManager.__instance = ResourceManager()
        return ResourceManager.__instance

    async def _read_limited_image(self, file: UploadFile) -> bytes:
        if getattr(file, "size", None) is not None and file.size > self.IMAGE_MAX_BYTES:
            raise HTTPException(status_code=400, detail="File too large! Maximum allowed size is 100 KB")
        contents = await file.read(self.IMAGE_MAX_BYTES + 1)
        if len(contents) > self.IMAGE_MAX_BYTES:
            raise HTTPException(status_code=400, detail="File too large! Maximum allowed size is 100 KB")
        return contents

    async def get_tenant_image(self, tenant_id):
        default_path = self.TENANT_DIR / "logo_url_default.png"
        image_path = next((path for path in self.TENANT_DIR.iterdir() if path.name == f"{tenant_id}.png" and path.is_file()), None)
        return FileResponse(image_path or default_path)

    async def uploadTenantImage(self, file: UploadFile, current_user):
        contents = await self._read_limited_image(file)

        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=415, detail="Invalid file type")

        file_name = f"{current_user.tenant_uuid}.png"
        file_path = self.TENANT_DIR / file_name
        with open(file_path, "wb") as f:
            f.write(contents)

        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            "upload_tenant_image"
        )

        return {"image": str(current_user.tenant_uuid)}

    async def get_user_image(self, user_id: str):
        default_path = self.USER_DIR / "default.png"
        image_path = next((path for path in self.USER_DIR.iterdir() if path.name == f"{user_id}.png" and path.is_file()), None)
        return FileResponse(image_path or default_path)

    @staticmethod
    def _tenant_id(tenant) -> str | None:
        if tenant is None:
            return None
        tenant_id = getattr(tenant, "id", None) or getattr(tenant, "tenant_uuid", tenant)
        return str(tenant_id) if tenant_id else None

    def get_tenant_system_dir(self, tenant) -> Path | None:
        tenant_id = self._tenant_id(tenant)
        if not tenant_id:
            return None
        # Tenant ids are Mongo ObjectIds in normal operation.  Keep the path
        # construction defensive so a route parameter can never escape the
        # system resource directory.
        if not tenant_id.replace("-", "").replace("_", "").isalnum():
            raise HTTPException(status_code=400, detail="Invalid tenant resource")
        return self.SYSTEM_DIR / tenant_id

    @classmethod
    def _default_system_filename(cls, file_name: str) -> str:
        if file_name.endswith("_custom.png"):
            return file_name.replace("_custom.png", "_default.png")
        return file_name if file_name.endswith("_default.png") else "logo_url_default.png"

    @classmethod
    def _safe_system_filename(cls, file_name: str) -> str:
        safe_name = next((name for name in cls.SYSTEM_RESOURCE_FILES if name == file_name), None)
        if safe_name is None:
            raise HTTPException(status_code=404, detail="Resource not found")
        return safe_name

    def system_resource_path(self, file_name: str, tenant=None) -> Path:
        file_name = self._safe_system_filename(file_name)

        tenant_dir = self.get_tenant_system_dir(tenant)
        if tenant_dir is not None:
            tenant_path = tenant_dir / file_name
            if tenant_path.is_file():
                return tenant_path

            # Existing deployments stored the default tenant's custom files in
            # the shared system directory.  Retain those files only for the
            # default tenant while all other tenants receive the stock asset.
            if getattr(tenant, "is_default", False):
                legacy_path = self.SYSTEM_DIR / file_name
                if legacy_path.is_file():
                    return legacy_path
        else:
            legacy_path = self.SYSTEM_DIR / file_name
            if legacy_path.is_file():
                return legacy_path

        default_path = self.SYSTEM_DIR / self._default_system_filename(file_name)
        if default_path.is_file():
            return default_path
        # Preserve the historical fallback if a non-logo default was not
        # installed in an older deployment.
        return self.SYSTEM_DIR / "logo_url_default.png"

    async def get_system_image(self, file_name: str, tenant=None):
        response_path = self.system_resource_path(file_name, tenant)
        headers = self.IMMUTABLE_IMAGE_CACHE_HEADERS if response_path.name.endswith("_default.png") else None
        return FileResponse(response_path, headers=headers)

    async def get_favicon(self, tenant=None):
        return await self.get_system_image("logo_url_custom.png", tenant)

    async def _save_image(self, file: UploadFile, file_path, check_admin: bool = False, current_user=None):
        if check_admin and current_user.role not in ["admin"]:
            return

        contents = await self._read_limited_image(file)

        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=415, detail="Invalid file type")

        with open(file_path, "wb") as f:
            f.write(contents)

    async def update_user_image(self, file: UploadFile, current_user):
        file_name = f"{current_user.id}.png"
        file_path = self.USER_DIR / file_name
        await self._save_image(file, file_path)
        return {"image": str(current_user.id)}

    async def delete_user_image(self, current_user):
        image_path = self.USER_DIR / f"{current_user.id}.png"

        if image_path.is_file():
            image_path.unlink()

        return {"user_image": "deleted"}

    async def deleteTenantImage(self, current_user):
        file_name = f"{current_user.tenant_uuid}"
        image_path = self.TENANT_DIR / f"{file_name}.png"

        if image_path.is_file():
            image_path.unlink()

        return {"tenant_image": "deleted"}

    async def delete_system_image(self, current_user, key: str, tenant=None):
        file_name = {
            AllowedKeys.LOGO_URL.value: "logo_url_custom.png",
            AllowedKeys.LOGO_WIDE_LIGHT.value: "logo_wide_light_custom.png",
            AllowedKeys.LOGO_WIDE_DARK.value: "logo_wide_dark_custom.png",
            AllowedKeys.AUTH_DASHBOARD_ICON.value: "auth_dashboard_icon_custom.png",
        }.get(key)
        if file_name is None:
            raise HTTPException(status_code=400, detail="Invalid system resource")

        resource_tenant = tenant or current_user
        system_dir = self.get_tenant_system_dir(resource_tenant)
        if system_dir is None:
            raise HTTPException(status_code=400, detail="Tenant resource unavailable")
        image_path = system_dir / file_name

        if image_path.is_file():
            image_path.unlink()
        elif getattr(resource_tenant, "is_default", False):
            # Migrate gracefully from the former shared default-tenant asset
            # location when an administrator clears an existing logo.
            legacy_path = self.SYSTEM_DIR / file_name
            if legacy_path.is_file():
                legacy_path.unlink()

        return {"system_image": "deleted"}

    async def get_robots_txt(self):
        if not self.ROBOTS_FILE.is_file():
            raise HTTPException(status_code=404, detail="robots.txt not found")

        return FileResponse(
            self.ROBOTS_FILE,
            media_type="text/plain"
        )
