import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config";

export interface AuthRequest extends Request {
    userId?: string;
    file?: Express.Multer.File;
}
export const userMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
    // console.log("Authorization Header:", req.headers["authorization"]);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access token missing",
        });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        req.userId = decoded.userId; // Attach user ID to request
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
}