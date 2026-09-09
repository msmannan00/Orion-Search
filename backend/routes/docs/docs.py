from pathlib import Path
import re


_DOCS_DIR_DEFAULT = Path(__file__).resolve().parent / "api_docs"
_DOCS_DIR_CANDIDATES = [
    _DOCS_DIR_DEFAULT,
    Path(__file__).resolve().parents[3] / "docs" / "api_docs",
    Path(__file__).resolve().parents[2] / "docs" / "api_docs",
]


def _resolve_docs_dir() -> Path:
    for candidate in _DOCS_DIR_CANDIDATES:
        if candidate.exists():
            return candidate
    return _DOCS_DIR_DEFAULT


_DOCS_DIR = _resolve_docs_dir()


def _read_md(rel_path: str) -> str:
    path = _DOCS_DIR / rel_path
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return f"Documentation file not found: {path}"


def _doc(rel_path: str) -> dict:
    text = _read_md(rel_path.lstrip('/'))
    match = re.search(r"^##\s*Response Description\s*\n(.*?)(?:\n##\s|\Z)", text, flags=re.MULTILINE | re.DOTALL)
    response_description = "Success"
    if match:
        block = match.group(1).strip()
        if block:
            response_description = block.splitlines()[0].strip() or "Success"
    return {"description": text, "response_description": response_description}


SYSTEM_INFO_DOCS = {"directory": _doc("system-info/directory.md"), "insight": _doc("system-info/insight.md"), }

REPORT_DOCS = {"defacement": _doc("reports/defacement.md"), "breach": _doc("reports/breach.md"), "news": _doc(
    "reports/news.md"), "exploit": _doc("reports/exploit.md"), "strategic": _doc("reports/strategic.md"), "chat": _doc(
    "reports/chat.md"), "social": _doc("reports/social.md"), "breach_screenshot": _doc(
    "reports/breach_screenshot.md"), "stix": _doc("reports/stix.md"), }

DYNAMIC_DOCS = {"dynamic_user_email": _doc("dynamic/dynamic_user_email.md"), "dynamic_cracked": _doc(
    "dynamic/dynamic_cracked.md"), "dynamic_software": _doc("dynamic/dynamic_software.md"), "dynamic_social": _doc(
    "dynamic/dynamic_social.md"), "domain_scan": _doc("dynamic/domain_scan.md"),
    "ioc_extract": _doc("dynamic/ioc_extract.md"),"apk_scan": _doc("dynamic/apk_scan.md"), "wanted_scanner" :_doc("dynamic/wanted_scan.md"),
    "dynamin_national_identity" :_doc("dynamic/dynamin_national_identity.md"),"ip_resolve": _doc("dynamic/ip_resolve.md"),
    "deep_ip_scan": _doc("dynamic/deep_ip_scan.md"),"geo_camera": _doc("dynamic/geo_camera.md"),"geo_camera_ranges": _doc("dynamic/geo_camera_ranges.md")}

CRYPTO_DOCS = {"crypto_scan": _doc("dynamic/crypto_scan.md"),}

CROSS_SEARCH_DOCS = {"cross_search": _doc("dynamic/onion_search.md"),}

SEARCH_DOCS = {"strategic": _doc("search/strategic.md"), "stealerlogs": _doc(
    "search/stealerlogs.md"), "consolidated": _doc("search/consolidated.md"), "consolidated_ranked": _doc(
    "search/consolidated_ranked.md"), "apt_intel": _doc("search/apt_intel.md"), "social": _doc("search/social.md"), "breach": _doc(
    "search/breach.md"), "exploit": _doc("search/exploit.md"), "defacement": _doc(
    "search/defacement.md"), }

SUPPORT_METHOD_DOCS={"subdomain_scan": _doc("support/subdomain_scan.md"), "dns_scan": _doc(
    "support/dns_scan.md"), "wayback_scan": _doc("support/wayback_scan.md")}
