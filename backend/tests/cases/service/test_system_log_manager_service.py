from pathlib import Path

from orion.api.interactive.system_log_manager.system_log_manager import SystemLogManager


def _write_log(root: Path, log_date: str) -> None:
    directory = root / log_date
    directory.mkdir(parents=True, exist_ok=True)
    day, month, year = reversed(log_date.split("-"))
    (directory / "log_1.log").write_text(
        f"INFO - {day}/{month}/{year} 12:00:00 : Entry for {log_date}\n",
        encoding="utf-8",
    )


def test_get_filters_logs_by_inclusive_date_range(tmp_path, monkeypatch):
    for log_date in ("2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"):
        _write_log(tmp_path, log_date)

    manager = SystemLogManager.get_instance()
    monkeypatch.setattr(SystemLogManager, "_log_roots", lambda self: [tmp_path])

    result = manager.get(date_range="2026-07-02,2026-07-03", limit=100)

    assert [entry["date"] for entry in result["entries"]] == ["2026-07-03", "2026-07-02"]
    assert [item["date"] for item in result["files"]] == ["2026-07-03", "2026-07-02"]
