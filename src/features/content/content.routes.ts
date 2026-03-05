import { Response, NextFunction } from "express"
import multer from "multer";
import path from "path";
import fs from "fs";
import { Router } from "express";
import { ContentModel } from "./content.model";
import { userMiddleware } from "../../middleware/auth.middleware";
import { AuthRequest } from "../../types";
import { BACKEND_URL } from "../../config";
import { AppError } from "../../middleware/error.middleware";
import { invalidateUserCache, CACHE_TTL, cacheMiddleware } from "../../middleware/cache.middleware";
import { aiQueue } from "../../queues/ai.queue";

const contentRouter = Router();

const storage = multer.diskStorage({
    destination: 'uploads/documents/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname)
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

//  POST
contentRouter.post("/", userMiddleware, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { title, link, type, description } = req.body;
        const uploadedFile = req.file;


        if (!title || !type) throw new AppError("Title and type are required", 400);

        const validTypes = ['linkedin', 'twitter', 'instagram', 'youtube', 'pinterest', 'documents', 'other']

        if (!validTypes.includes(type)) throw new AppError(`Invalid type. Must be one of: ${validTypes.join(', ')}`, 400);

        if (type === 'documents' && !uploadedFile && !link) throw new AppError("Documents require a file or link", 400);

        if (type === 'other' && !link && !description) throw new AppError("Other type requires link or description", 400);

        if (!['documents', 'other'].includes(type) && (!link || !description)) throw new AppError("Social media types require link and description", 400);

        const contentData: any = {
            title: title?.trim() || '',
            type,
            userId: req.userId,
            tags: [],
            description: description?.trim() || '',
        };

        if (link?.trim()) contentData.link = link.trim();

        if (uploadedFile) {
            contentData.fileName = uploadedFile.originalname
            contentData.filePath = uploadedFile.path
            contentData.fileSize = uploadedFile.size
        }

        const content = await ContentModel.create(contentData)

        await aiQueue.add("process-content", {
            contentId: content._id.toString(),
            userId: req.userId
        });

        console.log(`AI job queued for: ${content.title}`);

        await invalidateUserCache(req.userId as string);  // Invalidate cache after new content added
        return res.status(201).json({ success: true, message: "Content created successfully", data: content });

    } catch (error) {
        next(error)
    }
});

// GET 
contentRouter.get("/", userMiddleware, cacheMiddleware(CACHE_TTL.CONTENT_LIST), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        const { type, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        if (!userId) throw new AppError("Unauthorized", 401);

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
        next(error);
    }
});

// DELETE
contentRouter.delete("/", userMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { contentId } = req.body;
        const userId = req.userId;

        if (!contentId) throw new AppError("Content ID is required", 400);

        const content = await ContentModel.findOne({ _id: contentId, userId });
        if (!content) throw new AppError("Content not found or unauthorized", 404);

        if (content.filePath && fs.existsSync(content.filePath)) {
            fs.unlinkSync(content.filePath);
        }

        await ContentModel.deleteOne({ _id: contentId, userId });

        await invalidateUserCache(req.userId as string);  // invalidae cache after delete
        return res.json({ success: true, message: "Content deleted successfully" });

    } catch (error) {
        next(error);
    }
});

// Search - GET /api/v1/content/search?q=youtube&type=twitter&page=1&limit=10
contentRouter.get("/search", userMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { q, type, page = 1, limit = 10 } = req.query;
        const userId = req.userId;
        const skip = (Number(page) - 1) * Number(limit);

        if (!q || (q as string).trim().length === 0) {
            throw new AppError("Search query 'q' is required", 400);
        }

        // Build Filter
        const filter: any = {
            userId,
            $text: { $search: q as string }  // uses text index on title+description
        };

        if (type) filter.type = type;

        // Execute Search with Score 
        const [results, total] = await Promise.all([
            ContentModel.find(
                filter,
                { score: { $meta: "textScore" } }   // relevance score
            )
                .select('-filePath')
                .sort({ score: { $meta: "textScore" } })  // best match first
                .skip(skip)
                .limit(Number(limit)),
            ContentModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            query: q,
            results,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });

    } catch (error) {
        next(error);
    }
});

// GET /:id/download 
contentRouter.get("/:id/download", userMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const content = await ContentModel.findOne({
            _id: req.params.id,
            userId: req.userId,
            type: 'documents'
        }).select('+filePath');

        if (!content?.filePath) throw new AppError("Document not found", 404);

        res.setHeader('Content-Disposition', `attachment; filename="${content.fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.sendFile(path.resolve(content.filePath));

    } catch (error) {
        next(error);
    }
});

export default contentRouter;