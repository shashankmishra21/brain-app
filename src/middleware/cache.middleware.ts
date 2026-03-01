import { Response, NextFunction } from "express";
import redis from "../config/redis";
import { AuthRequest } from "../types";

// Cache duration constants
export const CACHE_TTL = {
    CONTENT_LIST: 300,   // 5 minutes
    CONTENT_ITEM: 600 // 10 minutes
};

// Cache Middleware
export const cacheMiddleware = (ttl: number) => {

    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            // Unique key per user + url + query params
            const cacheKey = `cache:${req.userId}:${req.originalUrl}`;

            const cached = await redis.get(cacheKey);
            if (cached) {
                console.log(`Cache HIT: ${cacheKey}`);
                return res.status(200).json(JSON.parse(cached));
            }

            console.log(` Cache MISS: ${cacheKey}`);

            // Intercept res.json to store response in cache
            const originalJson = res.json.bind(res);

            res.json = (body: any) => {
                // Only cache successful responses
                if (res.statusCode === 200 || res.statusCode === 201) {
                    redis.setex(cacheKey, ttl, JSON.stringify(body))
                        .catch(err => console.error("Cache store error:", err));
                }
                return originalJson(body);
            };

            next();
        } catch (err) {

            console.error("Cache middleware error:", err);
            next();  // If Redis fails, just skip cache (don't crash app)
        }
    };
};

// invalidtion - Call this after POST / DELETE to clear stale cache
export const invalidateUserCache = async (userId: string) => {
    try {
        // Find all keys for this user
        const keys = await redis.keys(`cache:${userId}:*`);
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`Cache cleared for user: ${userId} (${keys.length} keys)`);
        }
    } catch (err) {
        console.error("Cache invalidation error:", err);
    }
};