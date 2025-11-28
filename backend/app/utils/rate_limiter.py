"""
Rate limiter for Lurk - Prevent abuse and protect APIs
"""

import json
import time
import asyncio
from typing import Optional
import redis

class RateLimiter:
    """Redis-based rate limiter with sliding window algorithm"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.prefix = "rate_limit:"

    async def is_rate_limited(
        self,
        key: str,
        max_attempts: int = 5,
        window_minutes: int = 15,
        max_sleep_time: float = 1.0
    ) -> bool:
        """
        Check if rate limit is exceeded using sliding window algorithm

        Args:
            key: Unique identifier (IP, user_id, etc.)
            max_attempts: Maximum attempts allowed
            window_minutes: Time window in minutes
            max_sleep_time: Maximum time to wait for Redis (non-blocking)

        Returns:
            True if rate limit exceeded, False otherwise
        """
        try:
            current_time = time.time()
            window_start = current_time - (window_minutes * 60)
            rate_key = f"{self.prefix}{key}"

            # Use Redis pipeline for atomic operations
            pipe = self.redis.pipeline()

            # Remove old entries outside window
            pipe.zremrangebyscore(rate_key, 0, window_start)

            # Count current attempts
            pipe.zcard(rate_key)

            # Add current attempt
            pipe.zadd(rate_key, {str(current_time): current_time})

            # Set expiration on key
            pipe.expire(rate_key, window_minutes * 60)

            # Execute pipeline
            results = await asyncio.wait_for(
                self._execute_pipeline(pipe),
                timeout=max_sleep_time
            )

            current_attempts = results[1]

            return current_attempts > max_attempts

        except (redis.RedisError, asyncio.TimeoutError) as e:
            print(f"Rate limiter error: {e}")
            # Fail open - allow request if Redis is down
            return False
        except Exception as e:
            print(f"Unexpected rate limiter error: {e}")
            return False

    async def increment(self, key: str, ttl_seconds: int = 3600) -> int:
        """
        Increment counter for key with TTL

        Args:
            key: Counter key
            ttl_seconds: Time to live for counter

        Returns:
            Current count after increment
        """
        try:
            counter_key = f"{self.prefix}counter:{key}"
            count = self.redis.incr(counter_key)
            if count == 1:
                self.redis.expire(counter_key, ttl_seconds)
            return count
        except redis.RedisError as e:
            print(f"Rate limiter increment error: {e}")
            return 0

    async def get_remaining_time(
        self,
        key: str,
        window_minutes: int = 15
    ) -> int:
        """
        Get remaining time until rate limit resets

        Args:
            key: Rate limit key
            window_minutes: Original window size

        Returns:
            Seconds remaining until reset
        """
        try:
            rate_key = f"{self.prefix}{key}"
            current_time = time.time()
            window_start = current_time - (window_minutes * 60)

            # Get oldest attempt timestamp
            oldest_times = self.redis.zrange(rate_key, 0, 0, withscores=True)
            if oldest_times:
                oldest_timestamp = float(oldest_times[0][1])
                window_end = oldest_timestamp + (window_minutes * 60)
                remaining_seconds = max(0, int(window_end - current_time))
                return remaining_seconds
            return 0
        except redis.RedisError as e:
            print(f"Rate limiter remaining time error: {e}")
            return 0

    async def reset(self, key: str):
        """Reset rate limit for key"""
        try:
            rate_key = f"{self.prefix}{key}"
            self.redis.delete(rate_key)
            return True
        except redis.RedisError as e:
            print(f"Rate limiter reset error: {e}")
            return False

    async def _execute_pipeline(self, pipe):
        """Execute Redis pipeline with proper async handling"""
        # For synchronous redis client, run in executor
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, pipe.execute)

    async def cleanup_expired_keys(self, pattern: str = "*"):
        """Clean up expired rate limit keys"""
        try:
            keys = self.redis.keys(f"{self.prefix}{pattern}")
            if keys:
                self.redis.delete(*keys)
            return len(keys)
        except redis.RedisError as e:
            print(f"Rate limiter cleanup error: {e}")
            return 0

    # Predefined rate limit configs

    async def check_login_attempts(self, identifier: str) -> bool:
        """Check login attempts (5 per 15 minutes)"""
        return await self.is_rate_limited(
            f"login:{identifier}",
            max_attempts=5,
            window_minutes=15
        )

    async def check_password_reset(self, identifier: str) -> bool:
        """Check password reset attempts (3 per hour)"""
        return await self.is_rate_limited(
            f"password_reset:{identifier}",
            max_attempts=3,
            window_minutes=60
        )

    async def check_api_calls(self, user_id: str, tier: str = "free") -> bool:
        """Check API calls based on user tier"""
        limits = {
            "free": {"max_attempts": 100, "window_minutes": 60},
            "silver": {"max_attempts": 500, "window_minutes": 60},
            "gold": {"max_attempts": 2000, "window_minutes": 60},
            "platinum": {"max_attempts": 10000, "window_minutes": 60}
        }

        config = limits.get(tier, limits["free"])
        return await self.is_rate_limited(
            f"api:{user_id}",
            max_attempts=config["max_attempts"],
            window_minutes=config["window_minutes"]
        )

    async def check_payment_attempts(self, user_id: str) -> bool:
        """Check payment attempts (10 per minute)"""
        return await self.is_rate_limited(
            f"payment:{user_id}",
            max_attempts=10,
            window_minutes=1
        )

    async def check_kyc_attempts(self, identifier: str) -> bool:
        """Check KYC attempts (5 per day)"""
        return await self.is_rate_limited(
            f"kyc:{identifier}",
            max_attempts=5,
            window_minutes=1440  # 24 hours
        )