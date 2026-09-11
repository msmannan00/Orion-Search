import asyncio
import time
from datetime import datetime
from typing import Any
from orion.api.interactive.profile_manager.profile_manager import ProfileManager
from orion.api.interactive.social_manager.social_model import social_model
from orion.api.interactive.profile_manager.model.models import SocialAutomationResultRequest
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.shared_model.db_social_profile_management_model import (ManagedSocialProfile, SocialPersona, SocialProfilePurpose)


class social_profile_job:
    __instance = None
    POST_TASK_TIMEOUT_SECONDS = 300
    AD_DETECTION_TASK_TIMEOUT_SECONDS = 900
    POLL_INTERVAL_SECONDS = 5

    @staticmethod
    def get_instance():
        if social_profile_job.__instance is None:
            social_profile_job()
        return social_profile_job.__instance

    def __init__(self):
        if social_profile_job.__instance is not None:
            pass
        else:
            social_profile_job.__instance = self
            self._profile_manager = ProfileManager.get_instance()
            self._posts_cache = {}
            self.is_running = False


    async def run_daily_social_profiles(self):
        if self.is_running:
            return {"status": "skipped", "message": "Already running"}
            
        self.is_running = True
        try:
            records = await self._profile_manager.get_all_social_profile_records()

            processed_profile_count = 0
            skipped_profile_count = 0
            error_count = 0
            for record in records:
                current_user = await self._profile_manager.get_user_for_social_record(record)
                if current_user is None:
                    skipped_profile_count += len(record.profiles or [])
                    continue
    
                personas = {persona.persona_id: persona for persona in record.personas}
                for profile in record.profiles:
                    try:
                        if not profile.assigned_persona_id:
                            skipped_profile_count += 1
                            continue
                        if not profile.session_id:
                            skipped_profile_count += 1
                            continue
                        if not profile.purposes:
                            skipped_profile_count += 1
                            continue
    
                        persona = personas.get(profile.assigned_persona_id)
                        if persona is None:
                            skipped_profile_count += 1
                            continue
    
                        session_state = await self._profile_manager.read_profile_session_state(current_user, profile)
                        if session_state is None:
                            skipped_profile_count += 1
                            continue
    
                        await self._run_profile_purposes(profile, persona, session_state, record.user_id)
                        processed_profile_count += 1
                    except Exception as exc:
                        error_count += 1
                        log.g().e(f"Social profile daily processing failed for profile_id={profile.profile_id}: {exc}")
    
            return {
                "status": "success",
                "mail_status": "sent",
                "message": "Social profile daily job finished.",
                "record_count": len(records),
                "processed_profile_count": processed_profile_count,
                "skipped_profile_count": skipped_profile_count,
                "error_count": error_count,
            }
        finally:
            self.is_running = False

    async def _run_and_wait(self, key: str, payload: dict, timeout_seconds: int):
        headers = social_model._social_headers(None, None)
        deadline = time.monotonic() + timeout_seconds

        while time.monotonic() < deadline:
            status_code, body = await social_model.getInstance().social_request(payload, key, headers)

            if status_code != 200 or not isinstance(body, dict):
                log.g().e(f"Social automation request failed for {key}: {status_code} {body}")
                return None

            if body.get("status") == "error":
                log.g().e(f"Social automation job failed for {key}: {body.get('message')}")
                return None

            if "result" in body:
                log.g().i(f"Social automation job {body.get('job_id')} finished")
                return body.get("result")

            log.g().i(f"Social automation job {body.get('job_id')} pending: {body.get('step', '')}")
            await asyncio.sleep(self.POLL_INTERVAL_SECONDS)

        log.g().w(f"Social automation job for {key} timed out after {timeout_seconds}s")
        return None

    async def _store_result(self, result: Any):
        if not isinstance(result, dict):
            return
        try:
            data = SocialAutomationResultRequest.model_validate(result)
            log.g().i(f"Automation Result: {data.result_type} for profile {data.profile_id}")
            await self._profile_manager.store_automation_result(data)
        except Exception as exc:
            log.g().e(f"Failed to store automation result: {exc}")

    async def _run_profile_purposes(self, profile: ManagedSocialProfile, persona: SocialPersona, session_state: dict[str, Any], user_id: str):
        import uuid
        for purpose in profile.purposes:
            run_id = str(uuid.uuid4())

            if purpose == SocialProfilePurpose.POSTING:
                await self.run_posting(profile, persona, session_state, run_id, user_id)
            elif purpose == SocialProfilePurpose.AD_MONITORING:
                await self.run_ad_monitoring(profile, persona, session_state, run_id, user_id)

    async def run_posting(self, profile: ManagedSocialProfile, persona: SocialPersona, session_state: dict[str, Any], run_id: str, user_id: str = "" ):
        log.g().i(f"Running posting for profile {profile.profile_id} on {profile.platform}")
        
        from datetime import timezone
        now = datetime.now(timezone.utc)
        created = persona.created_at.replace(tzinfo=timezone.utc) if persona.created_at.tzinfo is None else persona.created_at
        days_active = (now - created).days + 1
        day_index = ((days_active - 1) % 365) + 1
        
        gender_val = persona.gender.value if persona.gender else ""
        age_group_val = persona.age_group.value if persona.age_group else ""
        interests_list = persona.interests or []
        
        cache_key = (gender_val, age_group_val, tuple(sorted(interests_list)))
        
        if cache_key not in self._posts_cache:
            try:
                from orion.services.mongo_manager.mongo_controller import mongo_controller
                collection = mongo_controller.get_instance().get_engine().database["persona_posts"]
                query = {
                    "gender": gender_val,
                    "age_group": age_group_val,
                }
                if interests_list:
                    query["interests"] = {"$all": interests_list, "$size": len(interests_list)}
                else:
                    query["interests"] = {"$size": 0}
                    
                doc = await collection.find_one(query)
                if doc and "posts" in doc:
                    self._posts_cache[cache_key] = doc["posts"]
                else:
                    self._posts_cache[cache_key] = []
            except Exception as e:
                log.g().e(f"Failed to fetch persona posts from mongo: {e}")
                self._posts_cache[cache_key] = []

        posts_list = self._posts_cache.get(cache_key, [])
        if not posts_list:
            log.g().e(f"No post data found for persona combination {cache_key}")
            return
            
        post_data = next((p for p in posts_list if p.get("day") == day_index), None)
        if not post_data:
            idx = (day_index - 1) % len(posts_list)
            post_data = posts_list[idx]
        
        image_url = post_data.get("image_url")
        caption = post_data.get("caption")
        
        try:
            payload = {
                "run_id": run_id,
                "user_id": user_id,
                "profile_id": profile.profile_id,
                "platform": profile.platform,
                "text": caption,
                "image_url": image_url,
                "session_state": session_state,
            }
            result = await self._run_and_wait("automation/post", payload, self.POST_TASK_TIMEOUT_SECONDS)
            await self._store_result(result)

        except Exception as e:
            log.g().e(f"Failed to run posting for profile {profile.profile_id}: {e}")

    async def run_ad_monitoring(self, profile: ManagedSocialProfile, persona: SocialPersona, session_state: dict[str, Any], run_id: str, user_id: str = "" ):

        log.g().i(f"Running ad monitoring for profile {profile.profile_id} on {profile.platform}")
        
        try:
            payload = {
                "run_id": run_id,
                "user_id": user_id,
                "profile_id": profile.profile_id,
                "platform": profile.platform,
                "session_state": session_state,
            }
            result = await self._run_and_wait("automation/ad-monitor", payload, self.AD_DETECTION_TASK_TIMEOUT_SECONDS)
            await self._store_result(result)

        except Exception as e:
            log.g().e(f"Failed to run ad monitoring for profile {profile.profile_id}: {e}")

    async def run_hate_speech_monitoring(self, profile: ManagedSocialProfile, session_state: dict[str, Any]):
        print("run_hate_speech_monitoring " * 100)
        print(f"Running hate speech monitoring for profile {profile.profile_id}")
