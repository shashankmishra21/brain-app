import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import { AppError } from "./error.middleware";

export interface AuthRequest extends Request {
    userId?: string;
    file?: Express.Multer.File;
}

export const userMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return next(new AppError("Access token missing", 401))
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
        req.userId = decoded.userId;
        next();
    } catch (err) {
        next(err);
    }
};