import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, call

import pytest
from fastapi import HTTPException

from configs.limiter_dependency import auth_rate_limit
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS


@pytest.mark.parametrize("failures, delay", [(4, 60), (5, 600), (6, 1800)])
def test_auth_rate_limit_escalates_cooldown(monkeypatch, failures, delay):
    monkeypatch.setattr("configs.limiter_dependency.time.time", lambda: 1_000)
    invoke_trigger = AsyncMock(side_effect=[None, failures, None, None])
    redis_store = SimpleNamespace(invoke_trigger=invoke_trigger)

    async def failed_login():
        raise HTTPException(status_code=401, detail="Invalid credentials")

    with pytest.raises(HTTPException) as error:
        asyncio.run(auth_rate_limit(redis_store, "user@example.com", failed_login))

    assert error.value.status_code == 429
    retry_headers = error.value.headers or {}
    assert retry_headers["Retry-After"] == str(delay)
    retry_key = invoke_trigger.await_args_list[0].args[1][0]
    assert invoke_trigger.await_args_list[-1] == call(
        REDIS_COMMANDS.S_SET_STRING,
        [retry_key, str(1_000 + delay), delay],
    )
