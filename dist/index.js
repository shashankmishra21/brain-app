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
const config_2 = require("./config");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// zod schema siginup
const signupSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(4, "Username must be at least 4 characters long")
        .max(10, "maximum 10 characters long"),
    password: zod_1.z
        .string()
        .min(4, "Password must be at least 4 characters long")
        .max(20, "Password must not exceed 20 characters")
    // .regex(
    //     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/,
    //     "Password must include uppercase, lowercase, number, and special character"
    // ),
});
// zod schema for signin
const signinSchema = zod_1.z.object({
    username: zod_1.z.string().min(4).max(10),
    password: zod_1.z.string().min(4).max(20)
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
        }, config_1.JWT_SECRET);
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
// 🔄 Fixed Multer setup with proper types
const storage = multer_1.default.diskStorage({
    destination: 'uploads/documents/',
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF, DOC, DOCX, PPT, PPTX files allowed'));
        }
    }
});
// 🆕 ADD THIS LINE - Serve uploaded files
app.use('/uploads', express_1.default.static('uploads'));
// ✅ POST endpoint - for CREATING content
app.post("/api/v1/content", middleware_1.userMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { title, link, type, description } = req.body;
        const uploadedFile = req.file;
        // 🔍 DEBUG: Log what we receive
        console.log('=== BACKEND RECEIVED (POST) ===');
        console.log('Title:', title);
        console.log('Link:', link);
        console.log('Type:', type);
        console.log('Description:', description);
        console.log('Description length:', description?.length || 0);
        if (!title || !type) {
            return res.status(400).json({
                success: false,
                message: "Title and type are required",
            });
        }
        const validTypes = ['linkedin', 'twitter', 'instagram', 'youtube', 'pinterest', 'documents', 'other'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
            });
        }
        // Type-specific validation
        if (type === 'documents' && !uploadedFile && !link) {
            return res.status(400).json({
                success: false,
                message: "For documents: either upload a file OR provide a link"
            });
        }
        if (type === 'other' && !link && !description) {
            return res.status(400).json({
                success: false,
                message: "For other type: either link OR description is required"
            });
        }
        if (!['documents', 'other'].includes(type) && (!link || !description)) {
            return res.status(400).json({
                success: false,
                message: "For social media types: title, link, and description are all required"
            });
        }
        // Prepare content data
        const contentData = {
            title: title?.trim() || '',
            type,
            userId: req.userId,
            tags: [],
            description: description?.trim() || '', // Always include description
        };
        // Add link if provided
        if (link?.trim()) {
            contentData.link = link.trim();
        }
        // Add file info if uploaded
        if (uploadedFile) {
            contentData.fileName = uploadedFile.originalname;
            contentData.filePath = uploadedFile.path;
            contentData.fileSize = uploadedFile.size;
        }
        // 🔍 DEBUG: Log what we're saving
        console.log('=== SAVING TO DATABASE ===');
        console.log('Content data:', contentData);
        const content = await db_1.ContentModel.create(contentData);
        // 🔍 DEBUG: Log what was saved
        console.log('=== SAVED TO DATABASE ===');
        console.log('Saved description:', content.description);
        console.log('Has description:', !!content.description);
        return res.status(201).json({
            success: true,
            message: "Content created successfully",
            data: content
        });
    }
    catch (error) {
        console.error("Error creating content:", error);
        if (error.name === 'ValidationError') {
            console.log('Validation error details:', error.errors);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});
// ✅ GET endpoint - for FETCHING content
app.get("/api/v1/content", middleware_1.userMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { type } = req.query;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID missing",
            });
        }
        const filter = { userId };
        if (type) {
            filter.type = type;
        }
        const contents = await db_1.ContentModel.find(filter)
            .populate("userId", "username")
            .sort({ createdAt: -1 });
        // 🔍 DEBUG: Log what we're fetching from DB
        console.log('=== FETCHING FROM DATABASE (GET) ===');
        contents.forEach((content, index) => {
            console.log(`Content ${index + 1}:`, {
                title: content.title,
                description: content.description,
                hasDescription: !!content.description,
                descriptionLength: content.description?.length || 0
            });
        });
        const enhancedContents = contents.map(content => {
            const contentObj = content.toObject();
            return {
                ...contentObj,
                hasFile: !!(content.fileName),
                downloadUrl: content.fileName ?
                    `${config_2.BACKEND_URL}/api/v1/content/${content._id}/download` : null
            };
        });
        // 🔍 DEBUG: Log what we're sending to frontend
        console.log('=== SENDING TO FRONTEND ===');
        console.log('First item description:', enhancedContents[0]?.description);
        console.log('Total items:', enhancedContents.length);
        return res.status(200).json({
            success: true,
            contents: enhancedContents,
            total: contents.length
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
// ✅ MIGRATION ENDPOINT - Run once to fix existing data
app.post("/api/v1/migrate/fix-descriptions", middleware_1.userMiddleware, async (req, res) => {
    try {
        // Update content with null or undefined descriptions
        const result = await db_1.ContentModel.updateMany({
            userId: req.userId,
            $or: [
                { description: { $exists: false } },
                { description: null },
                { description: undefined }
            ]
        }, {
            $set: { description: '' }
        });
        res.json({
            success: true,
            message: `Fixed ${result.modifiedCount} content items`,
            modifiedCount: result.modifiedCount
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});
// 🔄 ENHANCED: Delete with file cleanup
app.delete("/api/v1/content", middleware_1.userMiddleware, async (req, res) => {
    try {
        const contentId = req.body.contentId;
        const userId = req.userId;
        if (!contentId) {
            return res.status(400).json({
                success: false,
                message: "Content ID is required"
            });
        }
        // 🆕 First find the content to check for files
        const content = await db_1.ContentModel.findOne({
            _id: contentId,
            userId: userId,
        });
        if (!content) {
            return res.status(404).json({
                success: false,
                message: "Content not found or unauthorized"
            });
        }
        // 🆕 Delete associated file if exists
        if (content.filePath) {
            try {
                if (fs_1.default.existsSync(content.filePath)) { // ✅ Use imported fs
                    fs_1.default.unlinkSync(content.filePath);
                    console.log(`File deleted: ${content.filePath}`);
                }
            }
            catch (fileError) {
                console.error("File deletion error:", fileError);
                // Continue with database deletion even if file deletion fails
            }
        }
        // Delete from database
        await db_1.ContentModel.deleteOne({ _id: contentId, userId: userId });
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
// 🆕 NEW: Document download endpoint
app.get("/api/v1/content/:id/download", middleware_1.userMiddleware, async (req, res) => {
    try {
        const contentId = req.params.id;
        const userId = req.userId;
        const content = await db_1.ContentModel.findOne({
            _id: contentId,
            userId: userId,
            type: 'documents'
        });
        if (!content || !content.filePath) {
            return res.status(404).json({
                success: false,
                message: "Document file not found"
            });
        }
        // Set download headers
        res.setHeader('Content-Disposition', `attachment; filename="${content.fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        // Send file for download
        res.sendFile(path_1.default.resolve(content.filePath));
    }
    catch (error) {
        console.error("Download error:", error);
        return res.status(500).json({
            success: false,
            message: "Download failed"
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
                    shareLink: `${config_2.BACKEND_URL}/api/v1/brain/${existingLink.hash}`
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
                shareLink: `${config_2.BACKEND_URL}/api/v1/brain/${hash}`
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
