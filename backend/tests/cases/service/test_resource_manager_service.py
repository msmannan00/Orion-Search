import pytest

from orion.api.interactive.resource_manager.resource_manager import ResourceManager


@pytest.mark.anyio
async def test_system_default_images_use_long_cache_header(tmp_path, monkeypatch):
    manager: ResourceManager = ResourceManager.get_instance()
    system_dir = tmp_path / "system"
    system_dir.mkdir()
    (system_dir / "logo_wide_dark_default.png").write_bytes(b"default")
    monkeypatch.setattr(manager, "SYSTEM_DIR", system_dir)

    response = await manager.get_system_image("logo_wide_dark_default.png")

    assert response.path == system_dir / "logo_wide_dark_default.png"
    assert response.headers["Cache-Control"] == "public, max-age=31536000, immutable"


@pytest.mark.anyio
async def test_system_custom_images_do_not_use_immutable_cache_header(tmp_path, monkeypatch):
    manager: ResourceManager = ResourceManager.get_instance()
    system_dir = tmp_path / "system"
    system_dir.mkdir()
    (system_dir / "logo_url_default.png").write_bytes(b"default")
    (system_dir / "logo_wide_dark_custom.png").write_bytes(b"custom")
    monkeypatch.setattr(manager, "SYSTEM_DIR", system_dir)

    response = await manager.get_system_image("logo_wide_dark_custom.png")

    assert response.path == system_dir / "logo_wide_dark_custom.png"
    assert "Cache-Control" not in response.headers
