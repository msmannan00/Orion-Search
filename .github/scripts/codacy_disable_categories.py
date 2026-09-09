from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

BASE_URL = "https://api.codacy.com/api/v3"
DEFAULT_TOOLS = ("ESLint",)
DEFAULT_PATTERNS = (
    "ESLint8_@typescript-eslint_no-unnecessary-condition",
    "ESLint8_no-unused-vars",
)


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def request(path: str, auth: tuple[str, str], method: str = "GET", body: dict | None = None) -> dict:
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    header_name, token = auth
    headers = {header_name: token, "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            payload = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"{method} {path} failed with HTTP {exc.code}: {detail}") from exc
    return json.loads(payload) if payload else {}


def repository_path(args) -> str:
    return f"/analysis/organizations/{args.provider}/{args.organization}/repositories/{args.repository}"


def list_tools(args, auth: tuple[str, str]) -> list[dict]:
    return request(f"{repository_path(args)}/tools", auth).get("data") or []


def is_tool_enabled(tool: dict) -> bool:
    settings = tool.get("settings") or {}
    return bool(settings.get("isEnabled", tool.get("isEnabled", tool.get("enabled", False))))


def uses_configuration_file(tool: dict) -> bool:
    settings = tool.get("settings") or {}
    return bool(settings.get("usesConfigurationFile", False))


def credentials() -> tuple[str, str] | None:
    account_token = os.getenv("CODACY_API_TOKEN")
    if account_token:
        return "api-token", account_token
    project_token = os.getenv("CODACY_PROJECT_TOKEN")
    if project_token:
        return "project-token", project_token
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Disable selected Codacy ESLint code patterns.")
    parser.add_argument("--provider", default=os.getenv("CODACY_PROVIDER", "gh"))
    parser.add_argument("--organization", default=os.getenv("CODACY_ORGANIZATION", "Orion-Intelligence"))
    parser.add_argument("--repository", default=os.getenv("CODACY_REPOSITORY", "Orion-Intelligence"))
    parser.add_argument("--pattern", action="append", dest="patterns", default=None)
    parser.add_argument("--tool", action="append", dest="tools", default=None)
    parser.add_argument("--apply", action="store_true", help="Write the changes. Without it the script only reports.")
    parser.add_argument("--reanalyze-commit", help="Request reanalysis of this commit after applying changes.")
    args = parser.parse_args()

    auth = credentials()
    if not auth:
        print("CODACY_API_TOKEN or CODACY_PROJECT_TOKEN is not set.", file=sys.stderr)
        return 1

    patterns = args.patterns or list(DEFAULT_PATTERNS)
    wanted_tools = {normalize(name) for name in (args.tools or DEFAULT_TOOLS)}
    tools = list_tools(args, auth)
    if not tools:
        print("No tools returned for this repository. Check the provider, organization and repository names.")
        return 1

    updated_tools = 0

    for tool in tools:
        tool_uuid = tool.get("uuid")
        tool_name = tool.get("name") or tool_uuid
        if not tool_uuid or not is_tool_enabled(tool) or normalize(tool_name) not in wanted_tools:
            continue

        print(f"{tool_name}: disabling patterns {', '.join(patterns)}")
        updated_tools += 1

        if args.apply:
            if uses_configuration_file(tool):
                print(f"  - switching {tool_name} from repository configuration to Codacy pattern settings")
                request(
                    f"{repository_path(args)}/tools/{tool_uuid}",
                    auth,
                    method="PATCH",
                    body={"useConfigurationFile": False, "enabled": True},
                )
            request(
                f"{repository_path(args)}/tools/{tool_uuid}",
                auth,
                method="PATCH",
                body={
                    "enabled": True,
                    "patterns": [{"id": pattern, "enabled": False} for pattern in patterns],
                },
            )

    if not updated_tools:
        print(f"No enabled tool matched: {', '.join(args.tools or DEFAULT_TOOLS)}", file=sys.stderr)
        return 1

    print()
    if args.apply:
        print(f"Disabled {', '.join(patterns)} on {updated_tools} tool(s).")
        if args.reanalyze_commit:
            request(
                f"/organizations/{args.provider}/{args.organization}/repositories/{args.repository}/reanalyzeCommit",
                auth,
                method="POST",
                body={"commitUuid": args.reanalyze_commit},
            )
            print(f"Requested reanalysis of {args.reanalyze_commit}.")
    else:
        print(f"Dry run. Re-run with --apply to write the change on {updated_tools} tool(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
