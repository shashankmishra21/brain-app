import { Request } from "express";

export interface AuthRequest extends Request {
    userId?: string;
    file?: Express.Multer.File;
}