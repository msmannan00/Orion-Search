import os
import re
import shutil
import stat
import threading
from datetime import datetime
from pathlib import Path


class SystemLogManager:
    __instance = None
    __lock = threading.Lock()

    READ_CHUNK_SIZE = 64 * 1024
    LOG_ROOT = Path(__file__).resolve().parents[4] / "workspace" / "logs"
    LOG_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    LOG_FILE_PATTERN = re.compile(r"^log_\d+\.log$")
    LOG_LINE_PATTERN = re.compile(r"^(?:\[APP-LOG\]\s*)?(?P<type>[A-Z]+) - (?P<timestamp>\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}) : (?P<message>.*)$")
    CALLER_PATTERN = re.compile(r"^(?P<message>.*) - (?P<caller>\S+ \([^()]*:\d+\))$", re.DOTALL)
    VISIBLE_LOG_TYPES = {"INFO", "SUCCESS", "WARNING", "ERROR", "CRITICAL"}

    @staticmethod
    def get_instance():
        if SystemLogManager.__instance is None:
            with SystemLogManager.__lock:
                if SystemLogManager.__instance is None:
                    SystemLogManager.__instance = SystemLogManager()
        return SystemLogManager.__instance

    def __init__(self):
        if SystemLogManager.__instance is not None:
            raise Exception("This class is a singleton!")
        SystemLogManager.__instance = self

    def get(self, log_type: str | None = None, date: str | None = None, date_range: str | None = None, page: int = 1, limit: int = 200, flushed_at: str | None = None) -> dict:
        safe_type = (log_type or "").strip().upper()
        if safe_type and safe_type not in self.VISIBLE_LOG_TYPES:
            raise ValueError("Invalid log type")
        safe_date = (date or "").strip()
        if safe_date and not self._valid_log_date(safe_date):
            raise ValueError("Invalid log date")
        safe_date_range = (date_range or "").strip()
        range_start = ""
        range_end = ""
        if safe_date_range:
            parts = [part.strip() for part in safe_date_range.split(",")]
            if len(parts) != 2 or not all(self._valid_log_date(part) for part in parts) or parts[0] > parts[1]:
                raise ValueError("Invalid log date range")
            range_start, range_end = parts

        safe_page = max(1, int(page or 1))
        safe_limit = max(1, min(int(limit or 100), 100))
        flushed_at_dt = self._parse_flushed_at(flushed_at)
        files = self._log_files(safe_date or None)
        if range_start:
            files = [path for path in files if range_start <= self._log_date(path) <= range_end]
        if flushed_at_dt:
            files = [path for path in files if self._log_file_may_have_entries_after(path, flushed_at_dt)]
        entries = []
        start = (safe_page - 1) * safe_limit
        end = start + safe_limit
        total = 0
        has_more = False
        for path in files:
            pending: list[str] = []
            for index, line in self._iter_log_lines_reverse(path):
                item = self._parse_log_line(path, line, index)
                if not item:
                    pending.append(line)
                    continue
                if pending:
                    item["raw"] = "\n".join([item["raw"], *reversed(pending)])
                    merged, trailing_caller = self._split_caller("\n".join([item["message"], *reversed(pending)]))
                    item["message"] = merged
                    item["caller"] = item["caller"] or trailing_caller
                    pending = []
                if safe_type and item["type"] != safe_type:
                    continue
                if flushed_at_dt and not self._entry_after_flush(item["timestamp"], flushed_at_dt):
                    continue
                if total >= end:
                    has_more = True
                    break
                if start <= total < end:
                    entries.append(item)
                total += 1
            if has_more:
                break

        visible_total = total + 1 if has_more else total
        all_files = self._log_files()
        if flushed_at_dt:
            all_files = [path for path in all_files if self._log_file_may_have_entries_after(path, flushed_at_dt)]

        return {
            "entries": entries,
            "total": visible_total,
            "page": safe_page,
            "limit": safe_limit,
            "page_count": safe_page + 1 if has_more else ((visible_total + safe_limit - 1) // safe_limit if visible_total else 0),
            "available_dates": sorted({self._log_date(path) for path in all_files}, reverse=True),
            "files": [self._log_file_item(path) for path in files[:safe_limit]],
        }

    def _iter_log_lines_reverse(self, path: Path):
        try:
            with path.open("rb") as file:
                file.seek(0, 2)
                position = file.tell()
                buffer = b""
                line_number = 0
                while position > 0:
                    read_size = min(self.READ_CHUNK_SIZE, position)
                    position -= read_size
                    file.seek(position)
                    buffer = file.read(read_size) + buffer
                    lines = buffer.split(b"\n")
                    buffer = lines[0]
                    for raw_line in reversed(lines[1:]):
                        if not raw_line:
                            continue
                        line_number += 1
                        yield line_number, raw_line.rstrip(b"\r").decode("utf-8", errors="replace")
                if buffer:
                    line_number += 1
                    yield line_number, buffer.rstrip(b"\r").decode("utf-8", errors="replace")
        except OSError:
            return

    def delete(self, log_date: str, file_name: str) -> bool:
        path = self._safe_log_file(log_date, file_name)
        if not path:
            return False
        path.unlink()
        self._remove_empty_dir(path.parent)
        return True

    def flush(self) -> dict:
        deleted = 0
        for root in self._log_roots():
            try:
                date_dirs = [item for item in root.iterdir() if item.is_dir() and self._valid_log_date(item.name)]
            except OSError:
                continue
            for path in date_dirs:
                try:
                    deleted += sum(1 for item in path.rglob("*") if item.is_file())
                    shutil.rmtree(path, onerror=self._make_writable_and_retry)
                except OSError:
                    continue
        return {"success": True, "deleted": deleted}

    def _valid_log_date(self, log_date: str) -> bool:
        if not self.LOG_DATE_PATTERN.fullmatch(log_date or ""):
            return False
        try:
            datetime.strptime(log_date, "%Y-%m-%d")
            return True
        except ValueError:
            return False

    def _log_files(self, log_date: str | None = None) -> list[Path]:
        files: list[Path] = []
        seen: set[Path] = set()
        for root in self._log_roots():
            date_dirs = [root / log_date] if log_date else [path for path in root.iterdir() if path.is_dir()]
            for date_dir in date_dirs:
                if not self._valid_log_date(date_dir.name) or not date_dir.is_dir():
                    continue
                for path in date_dir.rglob("*.log"):
                    if not path.is_file() or not self.LOG_FILE_PATTERN.fullmatch(path.name):
                        continue
                    if path.parent.name == "error" and (path.parent.parent / "info").is_dir():
                        continue
                    resolved = path.resolve()
                    if resolved in seen:
                        continue
                    seen.add(resolved)
                    files.append(path)
        return sorted(files, key=self._log_file_sort_key, reverse=True)

    def _log_roots(self) -> list[Path]:
        candidates = [
            self.LOG_ROOT,
            Path("/app/crawler_logs"),
            Path.cwd() / "workspace" / "logs",
            Path.cwd() / "backend" / "workspace" / "logs",
            Path.cwd().parent / "Orion-Crawler" / "app" / "logs",
        ]
        roots = []
        seen: set[Path] = set()
        for root in candidates:
            if not root.exists():
                continue
            resolved = root.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            roots.append(root)
        return roots

    def _log_file_sort_key(self, path: Path) -> tuple[str, float, int]:
        match = re.search(r"\d+", path.stem)
        return self._log_date(path), path.stat().st_mtime, int(match.group(0)) if match else 0

    def _log_file_item(self, path: Path) -> dict:
        file_stat = path.stat()
        return {
            "date": self._log_date(path),
            "file": self._log_file_name(path),
            "size": file_stat.st_size,
            "modified_at": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
        }

    def _log_date(self, path: Path) -> str:
        for parent in [path.parent, *path.parents]:
            if self._valid_log_date(parent.name):
                return parent.name
        return path.parent.name

    def _log_file_name(self, path: Path) -> str:
        log_date = self._log_date(path)
        for parent in path.parents:
            if parent.name == log_date:
                return path.relative_to(parent).as_posix()
        return path.name

    def _parse_log_line(self, path: Path, line: str, line_number: int) -> dict | None:
        match = self.LOG_LINE_PATTERN.match(line)
        if not match:
            return None
        log_type = match.group("type")
        if log_type not in self.VISIBLE_LOG_TYPES:
            return None
        message, caller = self._split_caller(match.group("message"))
        return {
            "id": f"{self._log_date(path)}:{self._log_file_name(path)}:{line_number}",
            "date": self._log_date(path),
            "file": self._log_file_name(path),
            "line": line_number,
            "type": log_type,
            "timestamp": match.group("timestamp"),
            "message": message,
            "caller": caller,
            "raw": line,
        }

    @classmethod
    def _split_caller(cls, message: str) -> tuple[str, str]:
        match = cls.CALLER_PATTERN.match(message)
        if not match:
            return message, ""
        return match.group("message"), match.group("caller")

    def _parse_flushed_at(self, flushed_at: str | None) -> datetime | None:
        if not flushed_at:
            return None
        try:
            return datetime.fromisoformat(flushed_at)
        except ValueError:
            return None

    def _log_file_may_have_entries_after(self, path: Path, flushed_at: datetime) -> bool:
        try:
            log_date = datetime.strptime(self._log_date(path), "%Y-%m-%d").date()
        except ValueError:
            return True
        return log_date >= flushed_at.date()

    @staticmethod
    def _entry_after_flush(timestamp: str, flushed_at: datetime) -> bool:
        try:
            return datetime.strptime(timestamp, "%d/%m/%Y %H:%M:%S") > flushed_at
        except ValueError:
            return True

    def _safe_log_file(self, log_date: str, file_name: str) -> Path | None:
        if not self._valid_log_date(log_date) or not file_name or ".." in Path(file_name).parts or not self.LOG_FILE_PATTERN.fullmatch(Path(file_name).name):
            return None
        for root in self._log_roots():
            path = root / log_date / file_name
            if path.is_file() and root.resolve() in path.resolve().parents:
                return path
        return None

    @staticmethod
    def _remove_empty_dir(path: Path) -> None:
        try:
            path.rmdir()
        except OSError:
            pass

    @staticmethod
    def _make_writable_and_retry(function, path, _exc_info) -> None:
        target = Path(path)
        os.chmod(target.parent, stat.S_IRWXU)
        os.chmod(target, stat.S_IRWXU)
        function(path)
