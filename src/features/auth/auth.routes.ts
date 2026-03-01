import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import bcrypt from "bcrypt";
import { UserModel } from "../../config/database";
import { JWT_SECRET } from "../../config";

const router = Router();

const signupSchema = z.object({
    username: z.string().min(4).max(10),
    password: z.string().min(4).max(20),
});

const signinSchema = z.object({
    username: z.string().min(4).max(10),
    password: z.string().min(4).max(20),
});

router.post("/signup", async (req, res) => {
    try {
        const { username, password } = signupSchema.parse(req.body);
        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            return res.status(403).json({ success: false, message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await UserModel.create({ username, password: hashedPassword });
        res.status(200).json({ success: true, message: "Sign Up Successful" });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(411).json({ success: false, errors: err.errors });
        }
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

router.post("/signin", async (req, res) => {
    try {
        const { username, password } = signinSchema.parse(req.body);
        const user = await UserModel.findOne({ username });
        if (!user || !user.password) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        const isCorrect = await bcrypt.compare(password, user.password);
        if (!isCorrect) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET);
        return res.status(200).json({ success: true, message: "Sign in successful", token });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(411).json({ success: false, errors: err.errors });
        }
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

export default router;