from datetime import date, timedelta

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from configs.app_dependency import get_current_user, license_required, role_required, status_required
from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
from orion.api.interactive.scan_job_manager.scan_job_manager import ScanJobManager
from orion.api.interactive.search_manager.search_data_model.consolidated.search_consolidated_param_model import search_consolidated_param_model
from orion.api.interactive.search_manager.search_data_model.map_entities.search_map_entities_param_model import search_map_entities_param_model
from orion.api.interactive.search_manager.search_model import search_model
from orion.api.server.crawl_manager.class_model.ip_scan_request_model import GeoCameraDetectRangesRequest, GeoCameraDetectRequest
from orion.api.server.geo_fencing_manager.class_model.satellite_request_models import (
    SatelliteAnomalyRequest,
    SatelliteCompareRequest,
    SatelliteFacilitiesRequest,
    SatelliteGeocodeRequest,
    SatelliteImageRequest,
    SatelliteLiveTrackerAircraftIcaoRequest,
    SatelliteLiveTrackerAircraftTrackRequest,
    SatelliteLiveTrackerBBoxRequest,
    SatelliteLiveTrackerShipMmsiRequest,
    SatelliteLiveTrackerStatusRequest,
)
from orion.api.server.geo_fencing_manager.geo_fencing_manager import geo_fencing_manager
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus, user_role

geo_fencing_routes = APIRouter(dependencies=[Depends(status_required([UserStatus.ACTIVE]))])
SCAN_ROLE_DEPS = [user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]
SATELLITE_INTEL_DEPS = [Depends(role_required(SCAN_ROLE_DEPS)), Depends(license_required("geo_fencing", bypass_roles=[user_role.ADMIN]))]
SATELLITE_INTEL_SHIPS_TEST_DEPS = SATELLITE_INTEL_DEPS


def _enforce_demo_safe_search(param: search_consolidated_param_model, current_user, is_free: bool = False) -> None:
    if current_user and getattr(current_user, "role", None) == user_role.DEMO and is_free:
        param.safe = True


@geo_fencing_routes.post(
    "/api/search/map-entities/stream",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def stream_map_entities(param: search_map_entities_param_model = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    try:
        stream = await geo_fencing_manager.get_instance().stream_map_entities_points(chunk_size=param.size)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to stream map entities") from exc
    return StreamingResponse(
        stream,
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@geo_fencing_routes.post(
    "/api/search/map-entities/by-ids",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("module:general", bypass_licenses=["maintainer"])),
    ],
)
async def get_map_entities_by_ids(param: list[str] = Body(...)):
    return await geo_fencing_manager.get_instance().request_map_entities_by_ids(param)


@geo_fencing_routes.post(
    "/api/threat/lens",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def search_threat_lens_news(param: search_consolidated_param_model = Body(...), current_user=Depends(get_current_user)):
    _enforce_demo_safe_search(param, current_user)
    end_date = date.today()
    param.daterange = f"{(end_date - timedelta(days=240)):%Y-%m-%d},{end_date:%Y-%m-%d}"
    if param.platform_result_count is None or "platform_result_count" not in param.model_fields_set:
        param.platform_result_count = 500
    param.sort_latest = True
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    return await search_model.getInstance().search_consolidated_result(param)


@geo_fencing_routes.post(
    "/api/netintel/iot_detect",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def geo_camera_detect(param: GeoCameraDetectRequest = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().search_audit(current_user, "iot_detect", param.coordinates)
    return await ScanJobManager.get_instance().run_tracked_scan(
        current_user=current_user,
        api_reference="netintel/iot_detect",
        payload=param.model_dump(),
        metadata={"title": "Geo Camera Scan", "target": param.coordinates},
        runner=lambda: search_model.getInstance().network_intel(param, "iot_detect", user_id=str(current_user.id)),
        force_new=force_new,
    )


@geo_fencing_routes.post(
    "/api/netintel/camera_detect_ranges",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def geo_camera_detect_ranges(param: GeoCameraDetectRangesRequest = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().search_audit(current_user, "camera_detect_ranges", ",".join(param.ip_ranges))
    return await ScanJobManager.get_instance().run_tracked_scan(
        current_user=current_user,
        api_reference="netintel/camera_detect_ranges",
        payload=param.model_dump(),
        metadata={"title": "Geo Camera Range Scan", "target": ", ".join(param.ip_ranges[:3])},
        runner=lambda: search_model.getInstance().network_intel(param, "camera_detect_ranges", user_id=str(current_user.id)),
        force_new=force_new,
    )


@geo_fencing_routes.post(
    "/api/satellite/geocode",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def satellite_geocode(payload: SatelliteGeocodeRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().geocode(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/facilities",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def satellite_facilities(payload: SatelliteFacilitiesRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().facilities(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/sentinel/image",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def satellite_sentinel_image(payload: SatelliteImageRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().sentinel_image(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/anomaly",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def satellite_anomaly(payload: SatelliteAnomalyRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().anomaly(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/compare",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def satellite_compare(payload: SatelliteCompareRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().compare(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/livetrack/aircraft",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def satellite_livetrack_aircraft_bbox(payload: SatelliteLiveTrackerBBoxRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().livetrack_aircraft_bbox(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/livetrack/aircraft/icao",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def satellite_livetrack_aircraft_icao(payload: SatelliteLiveTrackerAircraftIcaoRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().livetrack_aircraft_icao(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/livetrack/aircraft/track",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def satellite_livetrack_aircraft_track(payload: SatelliteLiveTrackerAircraftTrackRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().livetrack_aircraft_track(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/livetrack/ships",
    status_code=200,
    dependencies=SATELLITE_INTEL_SHIPS_TEST_DEPS,
)
async def satellite_livetrack_ships_bbox(payload: SatelliteLiveTrackerBBoxRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().livetrack_ships_bbox(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/livetrack/ships/mmsi",
    status_code=200,
    dependencies=SATELLITE_INTEL_SHIPS_TEST_DEPS,
)
async def satellite_livetrack_ships_mmsi(payload: SatelliteLiveTrackerShipMmsiRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().livetrack_ships_mmsi(payload, user_id=str(current_user.id))


@geo_fencing_routes.post(
    "/api/satellite/livetrack/status",
    status_code=200,
    dependencies=SATELLITE_INTEL_DEPS,
)
async def satellite_livetrack_status(payload: SatelliteLiveTrackerStatusRequest = Body(...), current_user=Depends(get_current_user)):
    return await geo_fencing_manager.get_instance().livetrack_status(payload, user_id=str(current_user.id))
