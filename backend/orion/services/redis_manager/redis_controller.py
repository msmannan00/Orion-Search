import redis.asyncio as redis
from contextlib import asynccontextmanager
from redis.exceptions import LockError

from orion.services.redis_manager.redis_enums import REDIS_CONNECTIONS, REDIS_COMMANDS


class redis_controller:
    __redis = None
    __instance = None

    @staticmethod
    def getInstance():
        if redis_controller.__instance is None:
            redis_controller()
        return redis_controller.__instance

    def __init__(self):
        redis_controller.__instance = self
        self.__redis = None

    async def initialize(self):
        """Initialize the Redis connection asynchronously."""
        self.__redis = redis.Redis(
            host=REDIS_CONNECTIONS.S_DATABASE_IP,
            port=REDIS_CONNECTIONS.S_DATABASE_PORT,
            password=REDIS_CONNECTIONS.S_DATABASE_PASSWORD,
            decode_responses=True)

    @classmethod
    async def destroy_instance(cls):
        cls.__instance = None

    async def close_connection(self):
        await self.__redis.close()

    async def __set_bool(self, p_key, p_val):
        await self.__redis.set(p_key, int(p_val))

    async def __get_bool(self, p_key, p_val=None):
        exists = await self.__redis.exists(p_key)
        if not exists:
            if p_val is not None:
                await self.__set_bool(p_key, p_val)
            else:
                return None
        return bool(int(await self.__redis.get(p_key)))

    async def __set_int(self, p_key, p_val, expiry=None):
        await self.__redis.set(p_key, p_val, ex=expiry)

    async def __get_int(self, p_key, p_val, expiry=None):
        exists = await self.__redis.exists(p_key)
        if not exists:
            await self.__set_int(p_key, p_val, expiry)
        return await self.__redis.get(p_key)

    async def __set_float(self, p_key, p_val, expiry=None):
        await self.__redis.set(p_key, p_val, ex=expiry)

    async def __get_float(self, p_key, p_val, expiry=None):
        exists = await self.__redis.exists(p_key)
        if not exists:
            await self.__set_float(p_key, p_val, expiry)
        return float(await self.__redis.get(p_key))

    async def __set_string(self, p_key, p_val, expiry=None):
        await self.__redis.set(p_key, p_val, ex=expiry)

    async def __get_string(self, p_key, p_val=None, expiry=None):
        exists = await self.__redis.exists(p_key)
        if not exists:
            if p_val is not None:
                await self.__set_string(p_key, p_val)
                if expiry is not None:
                    await self.__redis.expire(p_key, expiry)
            else:
                return None
        return await self.__redis.get(p_key)

    async def __set_list(self, p_key, p_val, expiry=None):
        await self.__redis.sadd(p_key, p_val)
        if expiry is not None:
            await self.__redis.expire(p_key, expiry)

    async def __get_list(self, p_key, p_val, expiry=None):
        exists = await self.__redis.exists(p_key)
        if not exists and p_val is not None:
            await self.__set_list(p_key, p_val, expiry)
        return await self.__redis.smembers(p_key)

    async def __get_keys(self):
        return await self.__redis.keys()

    async def __flush_all(self):
        await self.__redis.flushall()

    async def __acquire_lock(self, p_key, timeout=None, blocking_timeout=None):
        async with self.__redis.lock(p_key, timeout=timeout, blocking_timeout=blocking_timeout) as lock:
            return lock.locked()

    async def __release_lock(self, p_key):
        lock = self.__redis.lock(p_key)
        if await lock.locked():
            await lock.release()

    @asynccontextmanager
    async def lock(self, key: str, timeout: int | None = None, blocking_timeout: int | None = None):
        lock = self.__redis.lock(key, timeout=timeout, blocking_timeout=blocking_timeout)
        acquired = await lock.acquire(blocking=True)
        if not acquired:
            raise TimeoutError(f"Redis lock not acquired: {key}")
        try:
            yield
        finally:
            try:
                await lock.release()
            except LockError:
                pass

    async def __delete_key(self, p_key):
        await self.__redis.delete(p_key)

    async def invoke_trigger(self, p_commands, p_data=None):
        if p_commands == REDIS_COMMANDS.S_GET_INT:
            return await self.__get_int(p_data[0], p_data[1], p_data[2])
        elif p_commands == REDIS_COMMANDS.S_SET_INT:
            return await self.__set_int(p_data[0], p_data[1], p_data[2])
        elif p_commands == REDIS_COMMANDS.S_GET_BOOL:
            return await self.__get_bool(p_data[0], p_data[1])
        elif p_commands == REDIS_COMMANDS.S_SET_BOOL:
            return await self.__set_bool(p_data[0], p_data[1])
        elif p_commands == REDIS_COMMANDS.S_GET_STRING:
            return await self.__get_string(p_data[0], p_data[1], p_data[2])
        elif p_commands == REDIS_COMMANDS.S_SET_STRING:
            return await self.__set_string(p_data[0], p_data[1], p_data[2])
        elif p_commands == REDIS_COMMANDS.S_SET_LIST:
            return await self.__set_list(p_data[0], p_data[1], p_data[2])
        elif p_commands == REDIS_COMMANDS.S_GET_LIST:
            return await self.__get_list(p_data[0], p_data[1], p_data[2])
        elif p_commands == REDIS_COMMANDS.S_GET_KEYS:
            return await self.__get_keys()
        elif p_commands == REDIS_COMMANDS.S_GET_FLOAT:
            return await self.__get_float(p_data[0], p_data[1], p_data[2])
        elif p_commands == REDIS_COMMANDS.S_SET_FLOAT:
            return await self.__set_float(p_data[0], p_data[1], p_data[2])
        elif p_commands == REDIS_COMMANDS.S_FLUSH_ALL:
            return await self.__flush_all()
        elif p_commands == REDIS_COMMANDS.S_ACQUIRE_LOCK:
            return await self.__acquire_lock(p_data[0], p_data[1], p_data[2])
        elif p_commands == REDIS_COMMANDS.S_RELEASE_LOCK:
            return await self.__release_lock(p_data[0])
        elif p_commands == REDIS_COMMANDS.S_DELETE_KEY:
            return await self.__delete_key(p_data[0])
        return None
