import { Router, Response, NextFunction } from "express";
import { LinkModel, UserModel } from "../../config/database";
import { ContentModel } from "../content/content.model";
import { userMiddleware } from "../../middleware/auth.middleware";
import { AuthRequest } from "../../types";
import { random } from "../../utils";
import { BACKEND_URL } from "../../config";

const router = Router();

// POST /api/v1/brain/share
router.post("/share", userMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {

    try {
        const { share } = req.body;
        if (share) {
            const existingLink = await LinkModel.findOne({ userId: req.userId });
            if (existingLink) {
                return res.json({
                    message: "Share link already exists",
                    shareLink: `${BACKEND_URL}/api/v1/brain/${existingLink.hash}`
                });
            }
            const hash = random(10);
            await LinkModel.create({ userId: req.userId, hash });
            return res.json({
                message: "Share link created",
                shareLink: `${BACKEND_URL}/api/v1/brain/${hash}`
            });
        } else {
            await LinkModel.deleteOne({ userId: req.userId });
            return res.json({ message: "Share link removed" });
        }
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/brain/:shareLink
router.get("/:shareLink", async (req, res) => {
    try {
        const link = await LinkModel.findOne({ hash: req.params.shareLink });
        if (!link) return res.status(411).json({ message: "Invalid link" });

        const [content, user] = await Promise.all([
            ContentModel.find({ userId: link.userId }),
            UserModel.findById(link.userId)
        ]);

        if (!user) return res.status(411).json({ message: "User not found" });
        res.json({ username: user.username, content });
    } catch (err) {
        res.status(500).json({ message: "Something went wrong" });
    }
});

export default router;