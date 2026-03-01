import { Request, Response, NextFunction } from "express";
import { z } from "zod";

//Custom Error Class 
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

//Central Error Handler
export const errorHandler = ( err: any,req: Request, res: Response, next: NextFunction ) => {
   
    // Zod Validation Error (signup/signin schema.parse())
    if (err instanceof z.ZodError) {
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }

    // AppError (thrown manually in routes/middleware)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }

    // JWT Invalid Token (jsonwebtoken throws this)
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }

    // JWT Expired Token
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: "Token expired, please sign in again"
        });
    }

    // Mongoose Duplicate Key (signup with existing username)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            message: `${field} already exists`
        });
    }

    // Multer File Size/Type Error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: "File too large. Maximum size is 10MB"
        });
    }

    if (err.message?.includes('Only PDF')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Fallback
    console.error('Unhandled Error:', err);
    return res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
};


// 404 Handler
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`
    });
};