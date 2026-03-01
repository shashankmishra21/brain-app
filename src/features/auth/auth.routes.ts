import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import bcrypt from "bcrypt";
import { UserModel } from "../../config/database";
import { JWT_SECRET } from "../../config";
import { AppError } from "../../middleware/error.middleware";
import { authRateLimit } from "../../middleware/rate-limit.middleware";

const router = Router();

const signupSchema = z.object({
    username: z.string().min(4).max(10),
    password: z.string().min(4).max(20),
});

const signinSchema = z.object({
    username: z.string().min(4).max(10),
    password: z.string().min(4).max(20),
});

// POST /signup 
router.post("/signup", async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { username, password } = signupSchema.parse(req.body);

        const existingUser = await UserModel.findOne({ username });
        if (existingUser) throw new AppError("User already exists", 403);

        const hashedPassword = await bcrypt.hash(password, 10);
        await UserModel.create({ username, password: hashedPassword });

        res.status(200).json({ success: true, message: "Sign Up Successful" });

    } catch (err) {
        next(err);
    }
});

// POST /signin
router.post("/signin", authRateLimit, async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { username, password } = signinSchema.parse(req.body);

        const user = await UserModel.findOne({ username });
        if (!user || !user.password) throw new AppError("Invalid credentials", 401);

        const isCorrect = await bcrypt.compare(password, user.password);
        if (!isCorrect) throw new AppError("Invalid credentials", 401);

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET
        );

        return res.status(200).json({ success: true, message: "Sign in successful", token });

    } catch (err) {
        next(err);
    }
});

export default router;