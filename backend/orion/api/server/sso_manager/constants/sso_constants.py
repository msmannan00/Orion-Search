import re

from orion.helper_manager.env_handler import env_handler


class SSO_CONSTANTS:
    S_CODE_TTL_SECONDS = 60
    S_SESSION_TTL_SECONDS = 30 * 60
    S_STATE_PATTERN = re.compile(r"^[A-Za-z0-9._~-]{16,256}$")
    S_CLIENT_AUTH_HEADER = "-".join(("x", "orion", "mail", "client", "secret"))
    S_CLIENT_CREDENTIAL = str(env_handler.get_instance().env("ORION_MAIL_SSO_CLIENT_SECRET", "") or "")
    S_ALLOWED_REDIRECT_URIS = {
        value.strip()
        for value in env_handler.get_instance().env(
            "ORION_MAIL_REDIRECT_URIS",
            "http://localhost:4300/auth/callback,http://mail.localhost:4200/auth/callback,https://mail.orionintelligence.org/auth/callback",
        ).split(",")
        if value.strip()
    }
