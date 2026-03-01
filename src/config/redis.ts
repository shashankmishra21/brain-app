import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    lazyConnect: true,
    tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: 3,
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err.message));

export default redis;