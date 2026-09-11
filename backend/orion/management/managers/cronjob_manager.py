import asyncio
from datetime import timedelta
from interface import BASE_DIR
from orion.constants.constant import allowed_key_titles
from orion.api.interactive.backup_manager.backup_manager import BackupManager
from orion.api.interactive.backup_manager.maintenance_state import maintenance_state
from orion.helper_manager.helper_controller import helper_controller
from orion.management.jobs.insight_job import insight_job
from orion.management.jobs.alert.alert_job import alert_job

from orion.management.jobs.social_profile.social_profile_job import social_profile_job

from orion.api.server.config_manager.config_controller import config_controller

from orion.api.interactive.scheduler_manager.scheduler_manager import DailySchedulerConfig, SchedulerManager
from orion.services.elastic_manager.elastic_controller import elastic_controller
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.shared_model.db_backup_model import BackupType
from orion.services.redis_manager.redis_enums import REDIS_KEYS
from orion.services.mongo_manager.shared_model.db_cronjob_status_model import CronjobName, CronjobStatus, db_cronjob_status_model
from orion.services.mongo_manager.mongo_controller import mongo_controller
from datetime import UTC, datetime

class cronjob_manager:
    __instance = None
    ALERT_TIMEZONE = "Australia/Sydney"
    DEFAULT_ALERT_HOUR = 2
    DEFAULT_ALERT_MINUTE = 0
    ALERT_JOB_KEY = "auto_alert_scan"
    DEFAULT_SOCIAL_PROFILE_HOUR = 3
    DEFAULT_SOCIAL_PROFILE_MINUTE = 0
    SOCIAL_PROFILE_JOB_KEY = "social_profile_daily"

    @staticmethod
    def get_instance():
        if cronjob_manager.__instance is None:
            cronjob_manager()
        return cronjob_manager.__instance

    def __init__(self):
        if cronjob_manager.__instance is not None:
            pass
        else:
            cronjob_manager.__instance = self
            self.build_assets()

    @staticmethod
    async def update_cronjob_status(job_name: CronjobName, status: CronjobStatus, message: str = None):
        try:
            engine = mongo_controller.get_instance().get_engine()
            record = await engine.find_one(db_cronjob_status_model, db_cronjob_status_model.job_name == job_name)
            now = datetime.now(UTC)
            if record:
                record.status = status
                if message is not None:
                    record.message = message
                record.last_run_at = now
                record.updated_at = now
                await engine.save(record)
            else:
                record = db_cronjob_status_model(job_name=job_name, status=status, message=message, last_run_at=now, updated_at=now)
                await engine.save(record)
        except Exception as e:
            log.g().e(f"Failed to update cronjob status for {job_name}: {e}")

    @staticmethod
    def build_assets():
        build_dir = BASE_DIR / "workspace" / "build"
        helper_controller.build_assets(build_dir)


    @staticmethod
    async def purge_loop():
        while True:
            if maintenance_state.get_instance().is_active():
                log.g().i("Purge loop paused: maintenance mode is active")
                await asyncio.sleep(30)
                continue
            await elastic_controller.get_instance().purge_old_records()
            await asyncio.sleep(86400)

    @staticmethod
    async def __init_handles():
        job = insight_job.get_instance()
        await job.update_trending_insights(REDIS_KEYS.INSIGHT_OLD_DAY)
        asyncio.create_task(job.update_insights(run_on_start=False))

    async def init_jobs(self):
        await self.__init_handles()
        asyncio.create_task(cronjob_manager.purge_loop())
        asyncio.create_task(cronjob_manager.iocs_alert_loop())

        asyncio.create_task(cronjob_manager.social_profile_loop())

        asyncio.create_task(cronjob_manager.backup_loop())


    @staticmethod
    async def iocs_alert_loop():
        timezone_name = cronjob_manager.ALERT_TIMEZONE
        default_job_config = DailySchedulerConfig(
            job_key=cronjob_manager.ALERT_JOB_KEY,
            hour=cronjob_manager.DEFAULT_ALERT_HOUR,
            minute=cronjob_manager.DEFAULT_ALERT_MINUTE,
            timezone_name=timezone_name,
            handler=alert_job.get_instance().run_default_scheduled_categories,
            stale_after=timedelta(minutes=15),
            heartbeat_interval=timedelta(seconds=60),
        )

        while True:
            if maintenance_state.get_instance().is_active():
                log.g().i("IOC alert loop paused: maintenance mode is active")
                await asyncio.sleep(30)
                continue

            if not allowed_key_titles:
                await asyncio.sleep(60)
                continue

            try:
                await cronjob_manager.update_cronjob_status(CronjobName.ALERT_JOB, CronjobStatus.RUNNING, "")
                await SchedulerManager.get_instance().run_due_daily_job(default_job_config, reason="startup_or_schedule_check")
                all_tenants = await alert_job.get_instance()._tenant_manager.get_all_tenant()
                for tenant in all_tenants:
                    tenant_id = str(alert_job.get_instance()._value(tenant, "id", ""))
                    custom_run_time = alert_job.get_instance().tenant_alert_run_time(tenant)
                    if not tenant_id or not custom_run_time:
                        continue

                    try:
                        hour_text, minute_text = custom_run_time.split(":", 1)
                        hour = int(hour_text)
                        minute = int(minute_text)
                    except ValueError:
                        log.g().e(f"Invalid tenant alert run time skipped: tenant_id={tenant_id}, value={custom_run_time}")
                        continue
                    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
                        log.g().e(f"Invalid tenant alert run time skipped: tenant_id={tenant_id}, value={custom_run_time}")
                        continue

                    tenant_job_config = DailySchedulerConfig(
                        job_key=f"{cronjob_manager.ALERT_JOB_KEY}:{tenant_id}",
                        hour=hour,
                        minute=minute,
                        timezone_name=timezone_name,
                        handler=lambda job_tenant=tenant: alert_job.get_instance().run_tenant_categories(job_tenant),
                        stale_after=timedelta(minutes=15),
                        heartbeat_interval=timedelta(seconds=60),
                    )
                    await SchedulerManager.get_instance().run_due_daily_job(tenant_job_config, reason="startup_or_tenant_schedule_check")
                await cronjob_manager.update_cronjob_status(CronjobName.ALERT_JOB, CronjobStatus.NOT_RUNNING)
            except Exception as e:
                log.g().e(f"IOC alert job failed: {e}")
                await cronjob_manager.update_cronjob_status(CronjobName.ALERT_JOB, CronjobStatus.FAILED, str(e))

            await asyncio.sleep(600)

    @staticmethod
    async def social_profile_loop():
        job_config = DailySchedulerConfig(
            job_key=cronjob_manager.SOCIAL_PROFILE_JOB_KEY,
            hour=cronjob_manager.DEFAULT_SOCIAL_PROFILE_HOUR,
            minute=cronjob_manager.DEFAULT_SOCIAL_PROFILE_MINUTE,
            timezone_name=cronjob_manager.ALERT_TIMEZONE,
            handler=social_profile_job.get_instance().run_daily_social_profiles,
            stale_after=timedelta(minutes=15),
            heartbeat_interval=timedelta(seconds=60),
        )

        while True:
            try:
                await cronjob_manager.update_cronjob_status(CronjobName.SOCIAL_JOB, CronjobStatus.RUNNING, "")
                await SchedulerManager.get_instance().run_due_daily_job(job_config, reason="startup_or_schedule_check")
                await cronjob_manager.update_cronjob_status(CronjobName.SOCIAL_JOB, CronjobStatus.NOT_RUNNING)
            except Exception as e:
                log.g().e(f"Social profile job failed: {e}")
                await cronjob_manager.update_cronjob_status(CronjobName.SOCIAL_JOB, CronjobStatus.FAILED, str(e))

            await asyncio.sleep(600)

    @staticmethod
    async def backup_loop():
        while True:
            try:
                if maintenance_state.get_instance().is_active():
                    log.g().i("Backup loop skipped: maintenance mode is active")
                    await asyncio.sleep(30)
                    continue

                enabled = await config_controller.getInstance()._is_backup_schedule()
                if enabled == "1":
                    await cronjob_manager.update_cronjob_status(CronjobName.BACKUP_JOB, CronjobStatus.RUNNING, "")
                    await BackupManager.get_instance().run_backup_now(BackupType.AUTO)
                    await cronjob_manager.update_cronjob_status(CronjobName.BACKUP_JOB, CronjobStatus.NOT_RUNNING)
            except Exception as e:
                log.g().e(f"Backup job failed: {e}")
                await cronjob_manager.update_cronjob_status(CronjobName.BACKUP_JOB, CronjobStatus.FAILED, str(e))

            await asyncio.sleep(259200)

