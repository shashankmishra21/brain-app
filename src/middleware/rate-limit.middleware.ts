import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";


// General API Limiter - 100 requests per minute per IP
const apiLimiter = new RateLimiterMemory({
    points: 100,       // requests allowed
    duration: 60,      // per 60 sec
});

// Auth Limiter (stricter)
// 5 attempts per 15 minutes (brute force protection)
const authLimiter = new RateLimiterMemory({
    points: 5,
    duration: 15 * 60, // 15 minutes
});

//  Middleware Factories
export const apiRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await apiLimiter.consume(req.ip as string);
        next();
    } catch {
        res.status(429).json({
            success: false,
            message: "Too many requests. Please slow down.",
            retryAfter: "60 seconds"
        });
    }
};

export const authRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await authLimiter.consume(req.ip as string);
        next();
    } catch {
        res.status(429).json({
            success: false,
            message: "Too many login attempts. Try again in 15 minutes.",
            retryAfter: "15 minutes"
        });
    }
};