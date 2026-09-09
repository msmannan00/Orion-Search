from uuid import uuid4
from fastapi import UploadFile
from fastapi.responses import Response
from fastapi import HTTPException

from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
from orion.api.interactive.case_manager.case_manager_helper import CaseHelperMethods
from orion.api.interactive.case_manager.models.case_models import CaseResponse
from orion.api.interactive.case_manager.models.case_models import CreateCaseRequest
from orion.api.interactive.case_manager.models.case_models import UpdateCaseRequest
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus
from orion.services.mongo_manager.shared_model.db_auth_models import db_user_account
from orion.services.mongo_manager.shared_model.db_auth_models import user_role
from orion.services.mongo_manager.shared_model.db_case_model import CaseArtifactFile, CaseStatus, CaseStatusReason, TaskStatus
from orion.services.mongo_manager.shared_model.db_case_model import CaseArtifact
from orion.services.mongo_manager.shared_model.db_case_model import CaseClosure
from orion.services.mongo_manager.shared_model.db_case_model import CaseComment
from orion.services.mongo_manager.shared_model.db_case_model import CaseEntity
from orion.services.mongo_manager.shared_model.db_case_model import CaseLink
from orion.services.mongo_manager.shared_model.db_case_model import CaseTask
from orion.services.mongo_manager.shared_model.db_case_model import db_case_model
from orion.services.mongo_manager.shared_model.db_case_model import utc_now
from orion.api.interactive.case_manager.case_artifact_helper import CaseArtifactHelper
from orion.api.interactive.case_manager.status_board_config import StatusBoardConfigManager
from orion.api.interactive.search_manager.search_model import search_model
from orion.api.interactive.search_manager.search_data_model.consolidated.search_consolidated_param_model import search_consolidated_param_model
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX
from orion.services.permission_manager.permission_models import UserPermission

class CaseManager:
    __instance = None

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()
        if CaseManager.__instance is not None:
            raise Exception("Singleton!")
        self._artifact_file_helper = CaseArtifactHelper()
        CaseManager.__instance = self

    @staticmethod
    def get_instance():
        if CaseManager.__instance is None:
            CaseManager()
        return CaseManager.__instance

    async def _to_response(self, record: db_case_model, current_user) -> CaseResponse:
        enc = await CaseHelperMethods.get_case_cipher(current_user)
        CaseHelperMethods.apply_sensitive_case_values(record, lambda value: CaseHelperMethods.decrypt_value(enc, value))
        
        record.createdAt = CaseHelperMethods.as_aware_utc(record.createdAt)
        record.updatedAt = CaseHelperMethods.as_aware_utc(record.updatedAt)
        record.closedAt = CaseHelperMethods.as_aware_utc(record.closedAt) if record.closedAt else None
        record.archivedAt = CaseHelperMethods.as_aware_utc(record.archivedAt) if record.archivedAt else None

        for entity in record.entities or []:
            entity.createdAt = CaseHelperMethods.as_aware_utc(entity.createdAt)
            entity.updatedAt = CaseHelperMethods.as_aware_utc(entity.updatedAt)
        
        for artifact in record.artifacts or []:
            artifact.createdAt = CaseHelperMethods.as_aware_utc(artifact.createdAt)

            if artifact.capturedAt:
                artifact.capturedAt = CaseHelperMethods.as_aware_utc(artifact.capturedAt)

            for artifact_file in artifact.files or []:
                artifact_file.uploadedAt = CaseHelperMethods.as_aware_utc(artifact_file.uploadedAt)
        
        for task in record.tasks or []:
            task.createdAt = CaseHelperMethods.as_aware_utc(task.createdAt)
            task.updatedAt = CaseHelperMethods.as_aware_utc(task.updatedAt)

            if task.dueAt:
                task.dueAt = CaseHelperMethods.as_aware_utc(task.dueAt)

        for comment in record.comments or []:
            comment.createdAt = CaseHelperMethods.as_aware_utc(comment.createdAt)
            comment.updatedAt = CaseHelperMethods.as_aware_utc(comment.updatedAt)

        data = record.model_dump()
        data["id"] = str(record.id)
        data["viewerId"] = CaseHelperMethods.actor_id(current_user)
        data["viewerRole"] = getattr(current_user.role, "value", str(current_user.role))
        data["assignedAnalysts"] = await self._get_assigned_case_analysts(record)
        return CaseResponse(**data)

    @staticmethod
    def _has_case_management_permission(user) -> bool:
        return UserPermission.CASE_MANAGEMENT.value in [
            permission.value if hasattr(permission, "value") else permission
            for permission in (user.permissions or [])
        ]

    async def _get_tenant_analyst_ids(self, current_user) -> set[str]:
        users = await self._engine.find(
            db_user_account,
            (db_user_account.tenant_uuid == str(current_user.tenant_uuid))
            & (db_user_account.role == user_role.ANALYST)
            & (db_user_account.status == UserStatus.ACTIVE),
        )
        return {str(user.id) for user in users if self._has_case_management_permission(user)}

    async def _validate_case_analysts(self, analyst_ids: list[str], current_user) -> None:
        requested_ids = set(analyst_ids or [])
        if not requested_ids:
            return
        tenant_analyst_ids = await self._get_tenant_analyst_ids(current_user)
        invalid_ids = requested_ids - tenant_analyst_ids
        if invalid_ids:
            raise HTTPException(status_code=400, detail="Case analysts must be active analysts in this tenant")

    def _validate_work_assignments(self, tasks, allowed_analyst_ids: list[str]) -> None:
        assigned_ids = {task.assignedTo for task in tasks if task.assignedTo}
        if not assigned_ids:
            return
        allowed_ids = set(allowed_analyst_ids or [])
        invalid_ids = assigned_ids - allowed_ids
        if invalid_ids:
            raise HTTPException(status_code=400, detail="Tasks and remediation steps can only be assigned to analysts on this case")

    def _task_assignments_changed(self, record: db_case_model, tasks) -> bool:
        current_assignments = {task.taskId: task.assignedTo for task in (record.tasks or [])}
        next_assignments = {task.taskId: task.assignedTo for task in tasks}
        return current_assignments != next_assignments

    def _linked_cases_changed(self, record: db_case_model, linked_cases) -> bool:
        current_links = {
            linked_case.targetCaseId: (linked_case.relationship, linked_case.reason)
            for linked_case in (record.linkedCases or [])
        }
        next_links = {
            linked_case.targetCaseId: (linked_case.relationship, linked_case.reason)
            for linked_case in linked_cases
        }
        return current_links != next_links

    async def _validate_linked_cases(self, case_id: str, linked_cases, current_user) -> None:
        target_case_ids_list = [
            linked_case.targetCaseId
            for linked_case in linked_cases
            if linked_case.targetCaseId
        ]

        target_case_ids = set(target_case_ids_list)

        if len(target_case_ids_list) != len(target_case_ids):
            raise HTTPException(
                status_code=400,
                detail="Same case cannot be linked more than once",
            )

        if case_id in target_case_ids:
            raise HTTPException(status_code=400, detail="A case cannot be linked to itself")
        
        for target_case_id in target_case_ids:
            target_record = await self._engine.find_one(
                db_case_model,
                (db_case_model.caseId == target_case_id)
                & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
            )
            if not target_record or not CaseHelperMethods.can_view_case(target_record, current_user):
                raise HTTPException(status_code=400, detail="Linked cases must be cases you can access")

    async def get_cases(self, current_user, archived: bool = False) -> list[CaseResponse]:
        if archived and getattr(current_user.role, "value", current_user.role) == user_role.ANALYST.value:
            raise HTTPException(status_code=403, detail="Analysts cannot view archived cases")

        if CaseHelperMethods.is_maintainer(current_user):
            records = await self._engine.find(
                db_case_model, (db_case_model.tenant_uuid == str(current_user.tenant_uuid)) 
                & (db_case_model.isArchived == archived)
            )
        else:
            current_actor_id = CaseHelperMethods.actor_id(current_user)
            records = await self._engine.find(
                db_case_model,
                {
                    "tenant_uuid": str(current_user.tenant_uuid),
                    "isArchived": archived,
                    "$or": [
                        {"createdBy": current_actor_id},
                        {"assignedAnalystIds": {"$elemMatch": {"$eq": current_actor_id}}},
                    ],
                },
            )

        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"All cases retrieved: total_count={len(records)}",
        )

        return [await self._to_response(r, current_user) for r in records]

    async def create_case(self, data: CreateCaseRequest, current_user) -> CaseResponse:
        existing = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == data.caseId)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )
        if existing:
            raise HTTPException(status_code=400, detail="Case ID already exists")

        current_actor_id = CaseHelperMethods.actor_id(current_user)
        server_now = utc_now()
        await self._validate_case_analysts(data.assignedAnalystIds, current_user)
        self._validate_work_assignments(data.tasks, data.assignedAnalystIds)
        await self._validate_linked_cases(data.caseId, data.linkedCases, current_user)
        if data.closure and not (CaseHelperMethods.is_maintainer(current_user) or CaseHelperMethods.is_admin(current_user) or current_actor_id in data.assignedAnalystIds):
            raise HTTPException(status_code=403, detail="Only admins, maintainers, or the case creator can close cases")
        entities = [
            CaseEntity(
                **entity.model_dump(),
                createdBy=current_actor_id,
                updatedBy=current_actor_id,
                createdAt=server_now,
                updatedAt=server_now,
            )
            for entity in data.entities
        ]
        record = db_case_model(
            caseId=data.caseId,
            tenant_uuid=str(current_user.tenant_uuid),
            title=data.title,
            description=data.description,
            caseType=data.caseType,
            status=CaseStatus.NEW,
            severity=data.severity,
            priority=data.priority,
            intakeSource=data.intakeSource,
            caseTypeOtherValue=data.caseTypeOtherValue,
            intakeSourceOtherValue=data.intakeSourceOtherValue,
            tags=data.tags,
            createdBy=current_actor_id,
            assignedAnalystIds=data.assignedAnalystIds,
            primaryEntityId=data.primaryEntityId,
            entities=entities,
            artifacts=[
                CaseArtifact(
                    **artifact.model_dump(exclude={"artifactId"}),
                    artifactId=artifact.artifactId or str(uuid4()),
                    createdBy=current_actor_id,
                    createdAt=server_now,
                )
                for artifact in data.artifacts
            ],
            comments=[
                CaseComment(**comment.model_dump(), createdBy=current_actor_id, createdAt=server_now, updatedAt=server_now)
                for comment in data.comments
            ],
            tasks=[
                CaseTask(
                    **task.model_dump(exclude={"taskId"}),
                    taskId=task.taskId or str(uuid4()),
                    createdBy=current_actor_id,
                    createdAt=server_now,
                    updatedAt=server_now,
                )
                for task in data.tasks
            ],
            linkedCases=[
                CaseLink(**linked_case.model_dump(), createdBy=current_actor_id, createdAt=server_now)
                for linked_case in data.linkedCases
            ],
            closure=CaseClosure(**data.closure.model_dump(), closedBy=current_actor_id, closedAt=server_now) if data.closure else None,
            closedAt=server_now if data.closure else None,
        )
        enc = await CaseHelperMethods.get_case_cipher(current_user)
        CaseHelperMethods.apply_sensitive_case_values(record, lambda value: CaseHelperMethods.encrypt_value(enc, value))
        await self._engine.save(record)

        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"Case created: caseId={record.caseId}, title={data.title}, caseType={record.caseType}, status={record.status}, priority={record.priority}, severity={record.severity}, intakeSource={record.intakeSource}, entities_count={len(record.entities)}",
        )

        return await self._to_response(record, current_user)

    async def get_case_analysts(self, current_user) -> list[dict]:
        users = await self._engine.find(
            db_user_account,
            (db_user_account.tenant_uuid == str(current_user.tenant_uuid))
            & (db_user_account.role == user_role.ANALYST)
            & (db_user_account.status == UserStatus.ACTIVE),
        )
        users = [user for user in users if self._has_case_management_permission(user)]
        return [
            {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role.value if user.role else "",
                "status": user.status.value if user.status else "",
            }
            for user in users
        ]
    
    async def _get_assigned_case_analysts(self, record: db_case_model) -> list[dict]:
        assigned_ids = set(record.assignedAnalystIds or [])

        if not assigned_ids:
            return []

        users = await self._engine.find(
            db_user_account,
            (db_user_account.tenant_uuid == record.tenant_uuid)
            & (db_user_account.role == user_role.ANALYST)
            & (db_user_account.status == UserStatus.ACTIVE),
        )

        users = [
            user for user in users
            if str(user.id) in assigned_ids and self._has_case_management_permission(user)
        ]

        return [
            {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role.value if user.role else "",
                "status": user.status.value if user.status else "",
            }
            for user in users
        ]

    async def get_case_by_id(self, case_id: str, current_user) -> CaseResponse:
        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )
        if not record:
            await AuditLogManager.get_instance().register(
                str(current_user.tenant_uuid),
                str(current_user.id),
                f"Case retrieval failed: caseId={case_id}, case_not_found",
            )
            raise HTTPException(status_code=404, detail="Case not found")
        if not CaseHelperMethods.can_view_case(record, current_user):
            raise HTTPException(status_code=403, detail="Access forbidden")

        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"Case retrieved: caseId={case_id}",
        )

        return await self._to_response(record, current_user)
    
    def _has_entity_changed(self, old_entity: CaseEntity, new_entity) -> bool:
        old_data = old_entity.model_dump(exclude={"createdBy", "updatedBy", "createdAt", "updatedAt"})
        new_data = new_entity.model_dump()
        return old_data != new_data

    def _normalize_date_for_compare(self, value):
        if value is None:
            return None
        if hasattr(value, "date"):
            return value.date().isoformat()
        return str(value)[:10]

    def _has_task_changed(self, old_task: CaseTask, new_task) -> bool:
        old_data = old_task.model_dump(
            exclude={"taskId", "createdBy", "createdAt", "updatedAt", "completedAt"}
        )
        new_data = new_task.model_dump(exclude={"taskId"})

        old_data["dueAt"] = self._normalize_date_for_compare(old_data.get("dueAt"))
        new_data["dueAt"] = self._normalize_date_for_compare(new_data.get("dueAt"))

        return old_data != new_data
    
    def _task_non_status_changed_for_analyst(self, old_task: CaseTask, new_task) -> bool:
        old_data = old_task.model_dump(
            exclude={
                "status",
                "taskId",
                "createdBy",
                "createdAt",
                "updatedAt",
                "completedAt",
            }
        )
        new_data = new_task.model_dump(exclude={"status", "taskId"})

        old_data["dueAt"] = self._normalize_date_for_compare(old_data.get("dueAt"))
        new_data["dueAt"] = self._normalize_date_for_compare(new_data.get("dueAt"))

        return old_data != new_data

    def _validate_analyst_task_update(self, record: db_case_model, tasks, current_actor_id: str) -> None:
        allowed_statuses = {
            TaskStatus.IN_PROGRESS,
            TaskStatus.UNDER_REVIEW,
        }

        existing_tasks = {
            task.taskId: task
            for task in (record.tasks or [])
        }

        incoming_tasks = {
            task.taskId: task
            for task in (tasks or [])
        }

        if set(existing_tasks.keys()) != set(incoming_tasks.keys()):
            raise HTTPException(
                status_code=403,
                detail="Analysts cannot add or remove tasks"
            )

        for task_id, incoming_task in incoming_tasks.items():
            existing_task = existing_tasks[task_id]

            if self._task_non_status_changed_for_analyst(existing_task, incoming_task):
                raise HTTPException(
                    status_code=403,
                    detail="Analysts can only update task status"
                )

            if incoming_task.status == existing_task.status:
                continue

            if existing_task.assignedTo != current_actor_id:
                raise HTTPException(
                    status_code=403,
                    detail="Analysts can only update tasks assigned to them"
                )

            if incoming_task.status not in allowed_statuses:
                raise HTTPException(
                    status_code=403,
                    detail="Analysts can only change task status to in progress or under review"
                )

    def _has_comment_changed(self, old_comment: CaseComment, new_comment) -> bool:
        old_data = old_comment.model_dump(
            exclude={"commentId", "createdBy", "createdAt", "updatedAt"}
        )
        new_data = new_comment.model_dump(exclude={"commentId"})

        return old_data != new_data

    async def update_case(self, case_id: str, data: UpdateCaseRequest, current_user) -> CaseResponse:
        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )
        if not record:
            await AuditLogManager.get_instance().register(
                str(current_user.tenant_uuid),
                str(current_user.id),
                f"Case update failed: caseId={case_id}, case_not_found",
            )
            raise HTTPException(status_code=404, detail="Case not found")
        
        if record.isArchived:
            raise HTTPException(status_code=403, detail="Archived cases cannot be edited")

        current_actor_id = CaseHelperMethods.actor_id(current_user)
        server_now = utc_now()
        if not CaseHelperMethods.can_view_case(record, current_user):
            raise HTTPException(status_code=403, detail="Access forbidden")
        enc = await CaseHelperMethods.get_case_cipher(current_user)
        CaseHelperMethods.apply_sensitive_case_values(record, lambda value: CaseHelperMethods.decrypt_value(enc, value))

        analyst_limited_update = CaseHelperMethods.is_analyst(current_user)

        if analyst_limited_update:
            data.title = record.title
            data.description = record.description
            data.caseType = record.caseType
            data.status = record.status
            data.severity = record.severity
            data.priority = record.priority
            data.intakeSource = record.intakeSource
            data.caseTypeOtherValue = record.caseTypeOtherValue
            data.intakeSourceOtherValue = record.intakeSourceOtherValue
            data.tags = record.tags
            data.assignedAnalystIds = record.assignedAnalystIds
            data.primaryEntityId = record.primaryEntityId
            data.entities = record.entities
            data.artifacts = record.artifacts
            data.linkedCases = record.linkedCases
            data.closure = record.closure
        
        if analyst_limited_update:
            self._validate_analyst_task_update(record, data.tasks, current_actor_id)

        if record.closure is not None:
            raise HTTPException(status_code=403, detail="Closed cases cannot be edited")
        
        assigned_analysts_changed = data.assignedAnalystIds != (record.assignedAnalystIds or [])
        task_assignments_changed = self._task_assignments_changed(record, data.tasks)
        linked_cases_changed = self._linked_cases_changed(record, data.linkedCases)

        if assigned_analysts_changed and not CaseHelperMethods.can_manage_case_assignments(record, current_user):
            raise HTTPException(status_code=403, detail="Only admins, maintainers, or the case creator can update case analysts")

        if task_assignments_changed and not CaseHelperMethods.is_analyst(current_user) and not CaseHelperMethods.can_manage_case_assignments(record, current_user):
            raise HTTPException(status_code=403, detail="Only admins, maintainers, or the case creator can assign tasks")

        if linked_cases_changed and not CaseHelperMethods.can_manage_case_assignments(record, current_user):
            raise HTTPException(status_code=403, detail="Only admins, maintainers, or the case creator can link cases")

        if assigned_analysts_changed:
            await self._validate_case_analysts(data.assignedAnalystIds, current_user)

        self._validate_work_assignments(data.tasks, data.assignedAnalystIds)

        if linked_cases_changed:
            await self._validate_linked_cases(case_id, data.linkedCases, current_user)

        if data.comments is not None and not CaseHelperMethods.can_comment(record, current_user):
            raise HTTPException(status_code=403, detail="Only assigned analysts, admins, maintainers, or the case creator can comment on cases")
        
        closure_provided = "closure" in data.model_fields_set
        if closure_provided and not analyst_limited_update and (data.closure is not None or record.closure is not None) and not CaseHelperMethods.can_close_case(record, current_user):
            raise HTTPException(status_code=403, detail="Only admins, maintainers, or the case creator can close cases")
        
        if closure_provided and data.closure is not None and record.status != CaseStatus.RESOLVED:
            raise HTTPException(status_code=400, detail="Case cannot be closed until it reaches resolved status")
        
        existing_entities = {
            entity.entityId: entity
            for entity in record.entities
        }
        entities = []

        for entity in data.entities:
            existing_entity = existing_entities.get(entity.entityId)
            has_changed = not existing_entity or self._has_entity_changed(existing_entity, entity)

            entities.append(
                CaseEntity(
                    **entity.model_dump(exclude={"createdBy", "updatedBy", "createdAt", "updatedAt"}),
                    createdBy=existing_entity.createdBy if existing_entity else current_actor_id,
                    updatedBy=current_actor_id if has_changed else existing_entity.updatedBy,
                    createdAt=existing_entity.createdAt if existing_entity else server_now,
                    updatedAt=server_now if has_changed else existing_entity.updatedAt,
                )
            )

        is_closing_from_details = (
            data.status == CaseStatus.CLOSED
            and record.status != CaseStatus.CLOSED
            and data.closure is not None
        )

        if data.status != record.status and not is_closing_from_details:
            raise HTTPException(
                status_code=400,
                detail="Case status can only be changed from the tracking board"
            )

        record.title = data.title
        record.description = data.description
        record.caseType = data.caseType
        record.status = data.status
        record.severity = data.severity
        record.priority = data.priority
        record.intakeSource = data.intakeSource
        record.caseTypeOtherValue = data.caseTypeOtherValue
        record.intakeSourceOtherValue = data.intakeSourceOtherValue
        record.tags = data.tags
        record.assignedAnalystIds = data.assignedAnalystIds
        record.primaryEntityId = data.primaryEntityId
        record.entities = entities
        existing_artifacts = {
            artifact.artifactId: artifact
            for artifact in record.artifacts
        }
        record.artifacts = [
            CaseArtifact(
                **artifact.model_dump(exclude={"artifactId", "createdBy", "createdAt"}),
                artifactId=artifact.artifactId or str(uuid4()),
                createdBy=existing_artifacts[artifact.artifactId].createdBy if artifact.artifactId in existing_artifacts else current_actor_id,
                createdAt=existing_artifacts[artifact.artifactId].createdAt if artifact.artifactId in existing_artifacts else server_now,
            )
            for artifact in data.artifacts
        ]
        existing_tasks = {
            task.taskId: task
            for task in record.tasks
        }
        record.tasks = []

        for task in data.tasks:
            existing_task = existing_tasks.get(task.taskId)
            has_changed = not existing_task or self._has_task_changed(existing_task, task)

            record.tasks.append(
                CaseTask(
                    **task.model_dump(exclude={"taskId"}),
                    taskId=task.taskId or str(uuid4()),
                    createdBy=existing_task.createdBy if existing_task else current_actor_id,
                    createdAt=existing_task.createdAt if existing_task else server_now,
                    updatedAt=server_now if has_changed else existing_task.updatedAt,
                )
            )
        existing_linked_cases = {
            linked_case.targetCaseId: linked_case
            for linked_case in record.linkedCases
        }
        record.linkedCases = [
            CaseLink(
                **linked_case.model_dump(exclude={"createdBy", "createdAt"}),
                createdBy=existing_linked_cases[linked_case.targetCaseId].createdBy if linked_case.targetCaseId in existing_linked_cases else current_actor_id,
                createdAt=existing_linked_cases[linked_case.targetCaseId].createdAt if linked_case.targetCaseId in existing_linked_cases else server_now,
            )
            for linked_case in data.linkedCases
        ]
        if data.comments is not None:
            existing_comments = {
                comment.commentId: comment
                for comment in record.comments
            }
            record.comments = []

            for comment in data.comments:
                existing_comment = existing_comments.get(comment.commentId)
                has_changed = not existing_comment or self._has_comment_changed(existing_comment, comment)

                record.comments.append(
                    CaseComment(
                        **comment.model_dump(exclude={"commentId"}),
                        commentId=comment.commentId or str(uuid4()),
                        createdBy=existing_comment.createdBy if existing_comment else current_actor_id,
                        createdAt=existing_comment.createdAt if existing_comment else server_now,
                        updatedAt=server_now if has_changed else existing_comment.updatedAt,
                    )
                )
        if closure_provided and data.closure is not None:
            record.closure = CaseClosure(**data.closure.model_dump(), closedBy=current_actor_id, closedAt=server_now)
            record.status = CaseStatus.CLOSED
            record.closedAt = server_now
        elif closure_provided:
            record.closure = None
            record.closedAt = None
        record.updatedAt = utc_now()

        CaseHelperMethods.apply_sensitive_case_values(record, lambda value: CaseHelperMethods.encrypt_value(enc, value))
        await self._engine.save(record)

        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"Case updated: caseId={case_id}",
        )

        return await self._to_response(record, current_user)

    async def delete_case(self, case_id: str, current_user) -> dict:
        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )
        if not record:
            raise HTTPException(status_code=404, detail="Case not found")
        if record.isArchived:
            raise HTTPException(status_code=403, detail="Archived cases cannot be deleted")     
        if record.closure is not None:
            raise HTTPException(status_code=403, detail="Closed cases cannot be deleted")
        if not CaseHelperMethods.is_maintainer(current_user):
            raise HTTPException(status_code=403, detail="Only maintainers can delete cases")

        await self._engine.delete(record)
        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"Case deleted: caseId={case_id}",
        )
        return {"success": True}

    async def get_next_case_id(self, current_user) -> dict:
        case_count = await self._engine.count(
            db_case_model, db_case_model.tenant_uuid == str(current_user.tenant_uuid)
        )
        next_id = str(case_count + 1).zfill(5)
        return {"nextCaseId": next_id}
    
    async def upload_artifact_files(self, case_id: str, artifact_id: str, files: list[UploadFile], current_user) -> dict:
        record = await self._load_viewable_case(case_id, current_user)
        
        if CaseHelperMethods.is_analyst(current_user):
            raise HTTPException(status_code=403, detail="Analysts cannot upload artifact files")

        if not files:
            raise HTTPException(status_code=400, detail="No files selected")
        self._artifact_file_helper.validate_file_count(files)

        enc = await CaseHelperMethods.get_case_cipher(current_user)
        CaseHelperMethods.apply_sensitive_case_values(
            record,
            lambda value: CaseHelperMethods.decrypt_value(enc, value)
        )

        artifact = next((item for item in record.artifacts if item.artifactId == artifact_id), None)

        if artifact is None:
            raise HTTPException(status_code=404, detail="Artifact not found")

        for file in files:
            self._artifact_file_helper.validate_artifact_file(artifact.type.value, file)

        uploaded_files = []

        for file in files:
            resource_id, file_size, file_hash = await self._artifact_file_helper.save_encrypted_artifact_file(file, enc)

            artifact_file = CaseArtifactFile(
                fileId=str(uuid4()),
                fileName=file.filename or "",
                fileType=file.content_type or "",
                fileSize=file_size,
                fileResourceId=resource_id,
                fileHash=file_hash,
                integrityStatus="verified",
                uploadedAt=utc_now(),
            )

            artifact.files.append(artifact_file)

            uploaded_files.append({
                "fileId": artifact_file.fileId,
                "fileName": artifact_file.fileName,
                "fileType": artifact_file.fileType,
                "fileSize": artifact_file.fileSize,
                "fileResourceId": artifact_file.fileResourceId,
                "fileHash": artifact_file.fileHash,
                "integrityStatus": artifact_file.integrityStatus,
                "uploadedAt": artifact_file.uploadedAt,
            })

        record.updatedAt = utc_now()

        CaseHelperMethods.apply_sensitive_case_values(
            record,
            lambda value: CaseHelperMethods.encrypt_value(enc, value)
        )
        await self._engine.save(record)

        return {"files": uploaded_files}
    
    async def _load_viewable_case(self, case_id: str, current_user):
        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )

        if not record:
            raise HTTPException(status_code=404, detail="Case not found")

        if not CaseHelperMethods.can_view_case(record, current_user):
            raise HTTPException(status_code=403, detail="Access forbidden")

        return record

    @staticmethod
    def _resolve_artifact_file(record, artifact_id: str, file_id: str):
        artifact = next((item for item in record.artifacts if item.artifactId == artifact_id), None)

        if artifact is None:
            raise HTTPException(status_code=404, detail="Artifact not found")

        artifact_file = next((item for item in artifact.files if item.fileId == file_id), None)

        if artifact_file is None:
            raise HTTPException(status_code=404, detail="Artifact file not found")

        return artifact, artifact_file

    async def get_artifact_file_response(self, case_id: str, artifact_id: str, file_id: str, current_user, download: bool = True) -> Response:
        record = await self._load_viewable_case(case_id, current_user)

        enc = await CaseHelperMethods.get_case_cipher(current_user)

        CaseHelperMethods.apply_sensitive_case_values(
            record,
            lambda value: CaseHelperMethods.decrypt_value(enc, value)
        )

        _, artifact_file = self._resolve_artifact_file(record, artifact_id, file_id)

        file_resource_id = artifact_file.fileResourceId
        file_name = artifact_file.fileName or "artifact-file"
        file_type = artifact_file.fileType or "application/octet-stream"

        if not self._verify_file_integrity(artifact_file, enc):
            await AuditLogManager.get_instance().register(
                str(current_user.tenant_uuid),
                str(current_user.id),
                f"Artifact file integrity failed: caseId={case_id}, artifactId={artifact_id}, fileId={file_id}, fileName={file_name}",
            )

            record.updatedAt = utc_now()
            CaseHelperMethods.apply_sensitive_case_values(
                record,
                lambda value: CaseHelperMethods.encrypt_value(enc, value),
            )
            await self._engine.save(record)

            raise HTTPException(status_code=409, detail="File integrity check failed")

        file_data = self._artifact_file_helper.load_decrypted_artifact_file(file_resource_id, enc)

        record.updatedAt = utc_now()
        CaseHelperMethods.apply_sensitive_case_values(
            record,
            lambda value: CaseHelperMethods.encrypt_value(enc, value),
        )
        await self._engine.save(record)

        disposition = "attachment"

        return Response(
            content=file_data,
            media_type=file_type,
            headers={
                "Content-Disposition": f'{disposition}; filename="{file_name}"'
            },
        )
    
    async def delete_artifact_file_from_case(self, case_id: str, artifact_id: str, file_id: str, current_user) -> dict:
        record = await self._load_viewable_case(case_id, current_user)
        
        if CaseHelperMethods.is_analyst(current_user):
            raise HTTPException(status_code=403, detail="Analysts cannot delete artifact files")

        enc = await CaseHelperMethods.get_case_cipher(current_user)
        CaseHelperMethods.apply_sensitive_case_values(
            record,
            lambda value: CaseHelperMethods.decrypt_value(enc, value)
        )

        artifact, artifact_file = self._resolve_artifact_file(record, artifact_id, file_id)

        self._artifact_file_helper.delete_artifact_file(artifact_file.fileResourceId)

        artifact.files = [
            item for item in artifact.files
            if item.fileId != file_id
        ]

        record.updatedAt = utc_now()

        CaseHelperMethods.apply_sensitive_case_values(
            record,
            lambda value: CaseHelperMethods.encrypt_value(enc, value)
        )
        await self._engine.save(record)

        return {"success": True}
    
    def _extract_report_id(self, row: dict) -> str:
        if not isinstance(row, dict):
            return ""

        return str(
            row.get("_id")
            or row.get("m_id")
            or row.get("id")
            or row.get("m_hash")
            or row.get("doc_id")
            or ""
        )


    def _extract_report_title(self, row: dict) -> str:
        if not isinstance(row, dict):
            return ""

        return str(
            row.get("m_title")
            or row.get("title")
            or row.get("m_name")
            or row.get("name")
            or row.get("m_url")
            or row.get("m_domain")
            or "Untitled Report"
        )
    

    async def get_artifact_reports(self, source: str, _current_user, q: str = "", limit: int = 10) -> list[dict]:
        source = (source or "").strip().lower()
        q = (q or "").strip()
        limit = max(1, min(limit or 10, 50))

        param = search_consolidated_param_model(
            q=q,
            category="all",
            page=1,
            fullsearch=False,
            safe=False,
            network="all",
            matchtype="",
            content="all",
            platform_result_count=limit,
        )

        if source == "strategic":
            result = await search_model.getInstance().search_consolidated_ranked_result(
                param,
                [ELASTIC_INDEX.S_GENERIC_INDEX],
                [],
                [],
            )

        elif source == "breach":
            result = await search_model.getInstance().search_consolidated_ranked_result(
                param,
                [ELASTIC_INDEX.S_LEAK_INDEX],
                ["news"],
                ["leaks", "tracking"],
            )

        elif source == "defacement":
            param.content = "all"
            result = await search_model.getInstance().search_consolidated_ranked_result(
                param,
                [ELASTIC_INDEX.S_DEFACEMENT_INDEX],
                [],
                ["all"],
                "defacement",
            )

        elif source == "social":
            result = await search_model.getInstance().search_consolidated_ranked_result(
                param,
                [ELASTIC_INDEX.S_CHATS_INDEX, ELASTIC_INDEX.S_SOCIAL_INDEX],
                [],
                [],
            )

        elif source == "exploit":
            result = await search_model.getInstance().search_consolidated_ranked_result(
                param,
                [ELASTIC_INDEX.S_EXPLOIT_INDEX],
                [],
                ["all"],
            )

        elif source == "feed":
            result = await search_model.getInstance().search_consolidated_ranked_result(
                param,
                [ELASTIC_INDEX.S_LEAK_INDEX],
                [],
                ["news"],
            )

        elif source == "stealerlogs":
            result = await search_model.getInstance().search_consolidated_ranked_result(
                param,
                [ELASTIC_INDEX.S_LEAK_INDEX],
                [],
                ["stealerlogs", "stealer_logs", "tracking"],
            )

        else:
            raise HTTPException(status_code=400, detail="Invalid report source")

        rows = result.get("Result", []) if isinstance(result, dict) else []

        items = []
        seen_ids = set()

        for row in rows:
            report_id = self._extract_report_id(row)
            report_title = self._extract_report_title(row)

            if not report_id or not report_title or report_id in seen_ids:
                continue

            seen_ids.add(report_id)

            items.append({
                "id": report_id,
                "title": report_title,
            })

            if len(items) >= limit:
                break

        return items
    
    async def archive_case(self, case_id: str, current_user) -> dict:
        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )

        if not record:
            raise HTTPException(status_code=404, detail="Case not found")
        
        if not CaseHelperMethods.can_manage_case_assignments(record, current_user):
            raise HTTPException(
                status_code=403,
                detail="Only admins, maintainers, or the case creator can archive cases"
            )

        if not CaseHelperMethods.can_view_case(record, current_user):
            raise HTTPException(status_code=403, detail="Access forbidden")

        if record.closure is None:
            raise HTTPException(status_code=400, detail="Only closed cases can be archived")

        if record.isArchived:
            return {"success": True, "message": "Case is already archived"}

        record.isArchived = True
        record.archivedAt = utc_now()
        record.archivedBy = CaseHelperMethods.actor_id(current_user)
        record.updatedAt = utc_now()
        await self._engine.save(record)

        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"Case archived: caseId={case_id}",
        )

        return {"success": True}

    async def unarchive_case(self, case_id: str, current_user) -> dict:
        if getattr(current_user.role, "value", current_user.role) != user_role.ADMIN.value:
            raise HTTPException(status_code=403, detail="Only admins can unarchive cases")

        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )

        if not record:
            raise HTTPException(status_code=404, detail="Case not found")

        if not record.isArchived:
            return {"success": True, "message": "Case is already unarchived"}

        record.isArchived = False
        record.archivedAt = None
        record.archivedBy = ""
        record.updatedAt = utc_now()
        await self._engine.save(record)

        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"Case unarchived: caseId={case_id}",
        )

        return {"success": True}
    
    def _verify_file_integrity(self, artifact_file: CaseArtifactFile, enc) -> bool:
        is_valid = self._artifact_file_helper.verify_artifact_file_hash(
            artifact_file.fileResourceId,
            artifact_file.fileHash,
            enc,
        )

        artifact_file.integrityStatus = "verified" if is_valid else "failed"
        return is_valid
    
    async def verify_artifact_file(self, case_id: str, artifact_id: str, file_id: str, current_user) -> dict:
        record = await self._load_viewable_case(case_id, current_user)

        enc = await CaseHelperMethods.get_case_cipher(current_user)
        CaseHelperMethods.apply_sensitive_case_values(
            record,
            lambda value: CaseHelperMethods.decrypt_value(enc, value),
        )

        artifact = next((item for item in record.artifacts if item.artifactId == artifact_id), None)
        if artifact is None:
            raise HTTPException(status_code=404, detail="Artifact not found")

        artifact_file = next((item for item in artifact.files if item.fileId == file_id), None)
        if artifact_file is None:
            raise HTTPException(status_code=404, detail="Artifact file not found")

        is_valid = self._verify_file_integrity(artifact_file, enc)

        if not is_valid:
            await AuditLogManager.get_instance().register(
                str(current_user.tenant_uuid),
                str(current_user.id),
                f"Artifact file integrity failed: caseId={case_id}, artifactId={artifact_id}, fileId={file_id}, fileName={artifact_file.fileName}",
            )

        record.updatedAt = utc_now()
        CaseHelperMethods.apply_sensitive_case_values(
            record,
            lambda value: CaseHelperMethods.encrypt_value(enc, value),
        )
        await self._engine.save(record)

        return {
            "fileId": artifact_file.fileId,
            "success": is_valid,
            "status": artifact_file.integrityStatus,
        }
    
    async def update_case_status(self, case_id: str, data, current_user) -> CaseResponse:
        record = await self._engine.find_one(db_case_model, (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)))

        if not record:
            raise HTTPException(status_code=404, detail="Case not found")

        if not CaseHelperMethods.can_view_case(record, current_user):
            raise HTTPException(status_code=403, detail="Access forbidden")
        
        if not CaseHelperMethods.can_manage_case_assignments(record, current_user):
            raise HTTPException(
                status_code=403,
                detail="Only admins, maintainers, or the case creator can update case status"
            )

        if record.isArchived:
            raise HTTPException(status_code=403, detail="Archived cases cannot be updated")
        
        if record.status == "closed":
            raise HTTPException(
                status_code=400,
                detail="Closed cases cannot be moved to another status"
            )

        reason = data.reason.strip()
        if not reason:
            raise HTTPException(status_code=400, detail="Status change reason is required")

        current_status = record.status
        next_status = data.status

        config = await StatusBoardConfigManager.get_effective_config(current_user)
        active_statuses = StatusBoardConfigManager.active_status_values(config)
        if current_status not in active_statuses or next_status not in active_statuses:
            raise HTTPException(status_code=400, detail="Status is not enabled for this tracking board")

        if next_status == CaseStatus.NEW:
            raise HTTPException(
                status_code=400,
                detail="Case cannot be moved back to new"
            )

        if next_status == CaseStatus.CLOSED:
            raise HTTPException(
                status_code=400,
                detail="Case must be closed from the case details closure section"
            )

        current_index = active_statuses.index(current_status)
        next_index = active_statuses.index(next_status)
        moving_forward = next_index > current_index
        skipped_statuses = active_statuses[current_index + 1:next_index] if moving_forward else active_statuses[next_index + 1:current_index]
        skippable_by_value = {status.value: status.skippable for status in config.statuses}
        can_skip = skipped_statuses and all(skippable_by_value.get(status, False) for status in skipped_statuses)

        if abs(next_index - current_index) != 1 and not can_skip:
            raise HTTPException(
                status_code=400,
                detail="Case can only move one step forward or backward"
            )

        record.status = next_status
        record.updatedAt = utc_now()

        record.statusReasons.append(
            CaseStatusReason(
                status=next_status,
                reason=reason
            )
        )
        await self._engine.save(record)

        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"Case status changed: caseId={case_id}, from={current_status}, to={next_status}, reason={reason}",
        )

        return await self._to_response(record, current_user)
    
    async def assign_case_analyst(self, case_id: str, data, current_user) -> CaseResponse:
        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )

        if not record:
            raise HTTPException(status_code=404, detail="Case not found")

        if record.isArchived:
            raise HTTPException(status_code=403, detail="Archived cases cannot be updated")

        if not CaseHelperMethods.can_manage_case_assignments(record, current_user):
            raise HTTPException(
                status_code=403,
                detail="Only admins, maintainers, or the case creator can assign analysts"
            )

        await self._validate_case_analysts([data.analystId], current_user)

        record.assignedAnalystIds = [data.analystId]
        record.updatedAt = utc_now()
        await self._engine.save(record)

        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"Case analyst assigned: caseId={case_id}, analystId={data.analystId}",
        )

        return await self._to_response(record, current_user)
    
