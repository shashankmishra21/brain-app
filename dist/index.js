"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("./db");
const config_1 = require("./config");
const middleware_1 = require("./middleware");
const utils_1 = require("./utils");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// zod schema
const signupSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, "Username must be at least 3 characters long")
        .max(10, "Username must not exceed 10 characters"),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .max(20, "Password must not exceed 20 characters")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, "Password must include uppercase, lowercase, number, and special character"),
});
app.post("/api/v1/signup", async (req, res) => {
    try {
        const { username, password } = signupSchema.parse(req.body); //Zod Validation
        // Check if user exists
        const existingUser = await db_1.UserModel.findOne({ username });
        if (existingUser) {
            return res.status(403).json({
                success: false,
                message: "User already exists with this username",
            });
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        await db_1.UserModel.create({
            username: username,
            password: hashedPassword
        });
        res.status(200).json({
            success: true,
            message: "Sign Up Successfull"
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(411).json({
                success: false,
                message: "Validation Error",
                errors: err.errors,
            });
        }
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});
// zod schema for signin
const signinSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(10),
    password: zod_1.z.string().min(8).max(20)
});
app.post("/api/v1/signin", async (req, res) => {
    try {
        const { username, password } = signinSchema.parse(req.body);
        // Find user in DB
        const user = await db_1.UserModel.findOne({ username });
        if (!user || !user.password) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password",
            });
        }
        // Compare password
        const isPasswordCorrect = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password",
            });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            userId: user._id,
            username: user.username,
        }, config_1.JWT_SECRET, { expiresIn: "1h" });
        return res.status(200).json({
            success: true,
            message: "Sign in successful",
            token,
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(411).json({
                success: false,
                message: "Validation Error",
                errors: err.errors,
            });
        }
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});
app.post("/api/v1/content", middleware_1.userMiddleware, async (req, res) => {
    try {
        const title = req.body.title;
        const link = req.body.link;
        const type = req.body.type;
        if (!title || !link || !type) {
            return res.status(400).json({
                success: false,
                message: "Title, link and type are required",
            });
        }
        const content = await db_1.ContentModel.create({
            title,
            link,
            type,
            userId: req.userId,
            tags: []
        });
        return res.status(201).json({
            success: true,
            message: "Content created successfully",
            data: content
        });
    }
    catch (err) {
        console.error("Error creating content:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});
app.get("/api/v1/content", middleware_1.userMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID missing",
            });
        }
        const contents = await db_1.ContentModel.find({ userId: userId }).populate("userId", "username");
        return res.status(200).json({
            success: true,
            contents,
        });
    }
    catch (error) {
        console.error("Error fetching content:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});
app.delete("/api/v1/content", async (req, res) => {
    try {
        const contentId = req.body.contentId;
        const userId = req.userId;
        if (!contentId) {
            return res.status(400).json({ success: false, message: "Content ID is required" });
        }
        // Delete content only if it belongs to the authenticated user
        const result = await db_1.ContentModel.deleteOne({
            _id: contentId,
            userId: userId,
        });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Content not found or unauthorized" });
        }
        res.json({
            success: true,
            message: "Content deleted successfully",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});
app.post("/api/v1/brain/share", middleware_1.userMiddleware, async (req, res) => {
    try {
        const { share } = req.body;
        if (share) {
            const existingLink = await db_1.LinkModel.findOne({
                userId: req.userId
            });
            if (existingLink) {
                // Return the existing share link
                return res.json({
                    message: "Share link already exists",
                    shareLink: `http://localhost:3000/api/v1/brain/${existingLink.hash}`
                });
            }
            // Create a new share link
            const hash = (0, utils_1.random)(10);
            const newLink = await db_1.LinkModel.create({
                userId: req.userId,
                hash
            });
            res.json({
                message: "Share link created successfully",
                shareLink: `http://localhost:3000/api/v1/brain/${hash}`
            });
        }
        else {
            // If share is false, delete the existing link
            await db_1.LinkModel.deleteOne({ userId: req.userId });
            res.json({
                message: "Share link removed successfully"
            });
        }
    }
    catch (error) {
        console.error("Error updating share link:", error);
        res.status(500).json({
            message: "An error occurred while updating the share link"
        });
    }
});
app.get("/api/v1/brain/:shareLink", async (req, res) => {
    try {
        const hash = req.params.shareLink;
        const link = await db_1.LinkModel.findOne({ hash });
        if (!link) {
            return res.status(411).json({
                message: "Sorry, input is invalid"
            });
        }
        const content = await db_1.ContentModel.find({ userId: link.userId });
        const user = await db_1.UserModel.findById(link.userId);
        if (!user) {
            return res.status(411).json({
                message: "User not found"
            });
        }
        res.json({
            username: user.username,
            content: content
        });
    }
    catch (err) {
        console.error("Error fetching shared content:", err);
        res.status(500).json({ message: "Something went wrong" });
    }
});
app.listen(3000, () => {
    console.log("server is running on port 3000");
});
