import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(redisUrl, {
    lazyConnect: false,
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
    },
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => {
    console.log("Redis unavailable:", err.message);
});

export default redis;