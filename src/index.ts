import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { z } from "zod";
import bcrypt from "bcrypt";
import { UserModel, ContentModel } from "./db";
import { JWT_SECRET } from './config';
import { userMiddleware } from "./middleware";
import { AuthRequest } from "./middleware";

const app = express();
app.use(express.json());


// zod schema
const signupSchema = z.object({
    username: z
        .string()
        .min(3, "Username must be at least 3 characters long")
        .max(10, "Username must not exceed 10 characters"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .max(20, "Password must not exceed 20 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/,
            "Password must include uppercase, lowercase, number, and special character"
        ),
});

app.post("/api/v1/signup", async (req, res) => {

    try {
        const { username, password } = signupSchema.parse(req.body);  //Zod Validation

        // Check if user exists
        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            return res.status(403).json({
                success: false,
                message: "User already exists with this username",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await UserModel.create({
            username: username,
            password: hashedPassword
        });

        res.status(200).json({
            success: true,
            message: "Sign Up Successfull"
        })

    } catch (err) {
        if (err instanceof z.ZodError) {
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
})


// zod schema for signin
const signinSchema = z.object({
    username: z.string().min(3).max(10),
    password: z.string().min(8).max(20)
});


app.post("/api/v1/signin", async (req, res) => {

    try {
        const { username, password } = signinSchema.parse(req.body);

        // Find user in DB
        const user = await UserModel.findOne({ username });
        if (!user || !user.password) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password",
            });
        }

        // Compare password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password",
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(200).json({
            success: true,
            message: "Sign in successful",
            token,
        });

    } catch (err) {
        if (err instanceof z.ZodError) {
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
})

app.post("/api/v1/content", userMiddleware, async (req: AuthRequest, res: Response) => {

    try {
        const title = req.body.title;
        const link = req.body.link;

        if (!title || !link) {
            return res.status(400).json({
                success: false,
                message: "Title and link are required",
            });
        }

        const content = await ContentModel.create({
            title,
            link,
            userId: req.userId,
            tags: []
        })

        return res.status(201).json({
            success: true,
            message: "Content created successfully",
            data: content
        });
    } catch (err) {
        console.error("Error creating content:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
})

app.get("/api/v1/content", userMiddleware, async (req: AuthRequest, res: Response) => {

    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID missing",
            });
        }

        const contents = await ContentModel.find({ userId: userId }).populate("userId", "username");

        return res.status(200).json({
            success: true,
            contents,
        });

    } catch (error) {
        console.error("Error fetching content:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
})

app.delete("/api/v1/content", async (req: AuthRequest, res: Response) => {

    const contentId = req.body.contentId;

    await ContentModel.deleteMany({
        contentId,
        userId: req.userId
    })
    res.json({
        message: "deleted"
    })
})

app.post("/api/v1/brain/share", (req, res) => {

})

app.get("/api/v1/brain/:shareLink", (req, res) => {

})

app.listen(3000, () => {
    console.log("server is running on port 3000")
});