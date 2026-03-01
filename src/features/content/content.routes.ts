import { Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Router } from "express";
import { ContentModel } from "./content.model";
import { userMiddleware } from "../../middleware/auth.middleware";
import { AuthRequest } from "../../types";
import { BACKEND_URL } from "../../config";

const contentRouter = Router();

const storage = multer.diskStorage({
    destination: 'uploads/documents/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only PDF, DOC, DOCX, PPT, PPTX files allowed'));
    }
});

// POST /api/v1/content
contentRouter.post("/", userMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        const { title, link, type, description } = req.body;
        const uploadedFile = req.file;

        if (!title || !type) {
            return res.status(400).json({ success: false, message: "Title and type are required" });
        }

        const validTypes = ['linkedin', 'twitter', 'instagram', 'youtube', 'pinterest', 'documents', 'other'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ success: false, message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
        }

        if (type === 'documents' && !uploadedFile && !link) {
            return res.status(400).json({ success: false, message: "Documents require a file or link" });
        }

        if (type === 'other' && !link && !description) {
            return res.status(400).json({ success: false, message: "Other type requires link or description" });
        }

        if (!['documents', 'other'].includes(type) && (!link || !description)) {
            return res.status(400).json({ success: false, message: "Social media types require link and description" });
        }

        const contentData: any = {
            title: title?.trim() || '',
            type,
            userId: req.userId,
            tags: [],
            description: description?.trim() || '',
        };

        if (link?.trim()) contentData.link = link.trim();

        if (uploadedFile) {
            contentData.fileName = uploadedFile.originalname;
            contentData.filePath = uploadedFile.path;
            contentData.fileSize = uploadedFile.size;
        }

        const content = await ContentModel.create(contentData);

        return res.status(201).json({ success: true, message: "Content created successfully", data: content });

    } catch (error: any) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// GET /api/v1/content
// Supports: ?type=youtube  ?page=1  ?limit=20
contentRouter.get("/", userMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { type, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const filter: any = { userId };
        if (type) filter.type = type;

        const [contents, total] = await Promise.all([
            ContentModel.find(filter)
                .select('-filePath')
                .populate("userId", "username")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            ContentModel.countDocuments(filter)
        ]);

        const enhancedContents = contents.map(content => ({
            ...content.toObject(),
            hasFile: !!content.fileName,
            downloadUrl: content.fileName
                ? `${BACKEND_URL}/api/v1/content/${content._id}/download`
                : null
        }));

        return res.status(200).json({
            success: true,
            contents: enhancedContents,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// DELETE 
// /POST/api/v1/content
contentRouter.delete("/", userMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { contentId } = req.body;
        const userId = req.userId;

        if (!contentId) {
            return res.status(400).json({ success: false, message: "Content ID is required" });
        }

        const content = await ContentModel.findOne({ _id: contentId, userId });
        if (!content) {
            return res.status(404).json({ success: false, message: "Content not found or unauthorized" });
        }

        // Delete physical file if exists
        if (content.filePath && fs.existsSync(content.filePath)) {
            fs.unlinkSync(content.filePath);
        }

        await ContentModel.deleteOne({ _id: contentId, userId });

        return res.json({ success: true, message: "Content deleted successfully" });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// GET /:id/download
contentRouter.get("/:id/download", userMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const content = await ContentModel.findOne({
            _id: req.params.id,
            userId: req.userId,
            type: 'documents'
        }).select('+filePath');

        if (!content?.filePath) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${content.fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.sendFile(path.resolve(content.filePath));

    } catch (error) {
        return res.status(500).json({ success: false, message: "Download failed" });
    }
});

export default contentRouter;