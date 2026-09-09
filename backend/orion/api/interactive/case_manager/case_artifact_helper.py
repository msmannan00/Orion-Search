from uuid import uuid4
import hashlib
from cryptography.fernet import Fernet
from fastapi import HTTPException, UploadFile

from orion.constants.constant import CONSTANTS


class CaseArtifactHelper:
    MAX_FILE_COUNT = 5
    MAX_FILE_SIZE = 100 * 1024 * 1024
    MAX_FILE_SIZE_MB = 100
    READ_CHUNK_SIZE = 1024 * 1024

    def __init__(self):
        self.resource_dir = CONSTANTS.S_CASE_ARTIFACT_RESOURCE_DIR

    def _ensure_resource_dir(self) -> None:
        try:
            self.resource_dir.mkdir(parents=True, exist_ok=True)
        except OSError as error:
            raise HTTPException(status_code=500, detail="Case artifact storage is unavailable") from error

    def validate_file_count(self, files: list[UploadFile]) -> None:
        if len(files) > self.MAX_FILE_COUNT:
            raise HTTPException(status_code=413, detail=f"Maximum {self.MAX_FILE_COUNT} files are allowed")

    def validate_artifact_file(self, artifact_type: str, file: UploadFile) -> None:
        if artifact_type == "screenshot":
            if file.content_type not in CONSTANTS.S_CASE_ARTIFACT_SCREENSHOT_ALLOWED:
                raise HTTPException(status_code=400, detail="Screenshot must be PNG only")
            return

        if artifact_type == "file":
            if file.content_type not in CONSTANTS.S_CASE_ARTIFACT_FILE_ALLOWED:
                raise HTTPException(status_code=400, detail="Allowed file types: PDF, JPG, PNG, TXT, DOCX")
            return

        raise HTTPException(status_code=400, detail="This artifact type does not accept file uploads")
    
    async def read_limited_file(self, file: UploadFile) -> bytes:
        if getattr(file, "size", None) is not None and file.size > self.MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large! Maximum allowed size is {self.MAX_FILE_SIZE_MB} MB")

        chunks = []
        total_size = 0
        while True:
            chunk = await file.read(self.READ_CHUNK_SIZE)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > self.MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail=f"File too large! Maximum allowed size is {self.MAX_FILE_SIZE_MB} MB")
            chunks.append(chunk)
        return b"".join(chunks)

    async def save_encrypted_artifact_file(self, file: UploadFile, enc: Fernet) -> tuple[str, int, str]:
        self._ensure_resource_dir()
        resource_id = str(uuid4())
        target_path = self.resource_dir / f"{resource_id}.enc"

        raw = await self.read_limited_file(file)
        file_hash = hashlib.sha256(raw).hexdigest()

        target_path.write_bytes(enc.encrypt(raw))

        return resource_id, len(raw), file_hash
    
    def verify_artifact_file_hash(self, resource_id: str, expected_hash: str, enc: Fernet) -> bool:
        try:
            raw = self.load_decrypted_artifact_file(resource_id, enc)
            return hashlib.sha256(raw).hexdigest() == expected_hash
        except Exception:
            return False

    def load_decrypted_artifact_file(self, resource_id: str, enc: Fernet) -> bytes:
        path = self.resource_dir / f"{resource_id}.enc"

        if not path.exists():
            raise HTTPException(status_code=404, detail="Artifact file not found")

        return enc.decrypt(path.read_bytes())

    def delete_artifact_file(self, resource_id: str) -> None:
        if not resource_id:
            return

        path = self.resource_dir / f"{resource_id}.enc"

        if path.exists():
            path.unlink()
