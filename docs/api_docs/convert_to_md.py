#!/usr/bin/env python3
"""Lossless export of docs.py dicts to a Markdown folder structure.

Usage:
    python convert_to_md.py /path/to/docs.py /path/to/output_dir
"""
from __future__ import annotations
import sys, shutil
from pathlib import Path

def main():
    if len(sys.argv) != 3:
        print("Usage: python convert_to_md.py DOCS_PY OUTPUT_DIR")
        raise SystemExit(2)

    docs_py = Path(sys.argv[1]).expanduser().resolve()
    out_dir = Path(sys.argv[2]).expanduser().resolve()

    text = docs_py.read_text(encoding="utf-8")
    ns = {"__builtins__": {"True": True, "False": False, "None": None}}
    exec(text, ns)

    SYSTEM_INFO_DOCS: dict = ns.get("SYSTEM_INFO_DOCS", {})
    REPORT_DOCS: dict = ns.get("REPORT_DOCS", {})
    SEARCH_DOCS: dict = ns.get("SEARCH_DOCS", {})
    DYNAMIC_DOCS: dict = ns.get("DYNAMIC_DOCS", {})

    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    (out_dir / "source_docs.py").write_text(text, encoding="utf-8")

    def write_endpoint(section: str, prefix: str, key: str, endpoint_doc: dict):
        sec = out_dir / section
        sec.mkdir(parents=True, exist_ok=True)
        md_path = sec / f"{key}.md"
        desc = (endpoint_doc.get("description") or "").rstrip()
        resp = (endpoint_doc.get("response_description") or "").rstrip()
        md = f"# {prefix}: {key}\n\n## Description\n\n{desc}\n\n## Response\n\n{resp}\n"
        md_path.write_text(md, encoding="utf-8")

    for k,v in SYSTEM_INFO_DOCS.items():
        write_endpoint("system-info", "System Info", k, v)
    for k,v in REPORT_DOCS.items():
        write_endpoint("reports", "Report", k, v)
    for k,v in SEARCH_DOCS.items():
        write_endpoint("search", "Search", k, v)
    for k,v in DYNAMIC_DOCS.items():
        write_endpoint("dynamic", "Dynamic", k, v)

    # ALL.md
    parts = []
    for section_name, dct in [
        ("System Info", SYSTEM_INFO_DOCS),
        ("Reports", REPORT_DOCS),
        ("Search", SEARCH_DOCS),
        ("Dynamic", DYNAMIC_DOCS),
    ]:
        parts.append(f"# {section_name}\n")
        for k, doc in dct.items():
            parts.append(f"## {k}\n")
            parts.append("### Description\n")
            parts.append((doc.get("description") or "").rstrip() + "\n")
            parts.append("\n### Response\n")
            parts.append((doc.get("response_description") or "").rstrip() + "\n")
            parts.append("\n---\n")
    (out_dir / "ALL.md").write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8")

    # README
    readme = out_dir / "README.md"
    readme.write_text(
        "# Orion API Documentation (Markdown export)\n\n"
        "This folder is a **lossless** Markdown export generated from docs.py.\n\n"
        "## Single-file bundle\n\n"
        "- ALL.md\n",
        encoding="utf-8",
    )

    print(f"Wrote Markdown docs to: {out_dir}")

if __name__ == "__main__":
    main()
