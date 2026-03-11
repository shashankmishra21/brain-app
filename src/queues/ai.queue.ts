import { Queue, Worker, Job } from "bullmq";
import { ContentModel } from "../features/content/content.model";
import { storeVector, summarizeContent, extractTags } from "../services/ai.service";
import logger from "../config/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const getConnection = () => {
    try {
        const url = new URL(redisUrl);
        return {
            host: url.hostname,
            port: Number(url.port) || 6379,
            password: url.password || undefined,
            tls: redisUrl.startsWith("rediss://") ? {} : undefined,
        };
    } catch {
        return { host: "localhost", port: 6379 };
    }
};

const connection = getConnection();

export const aiQueue = new Queue("ai-processing", { connection });

export const startAIWorker = () => {
    const worker = new Worker(
        "ai-processing",
        async (job: Job) => {
            const { contentId, userId } = job.data;

            const content = await ContentModel.findById(contentId);
            if (!content) return;

            const text = `${content.title} ${content.description}`.trim();
            if (!text) return;

            const [aiSummary, aiTags] = await Promise.all([
                summarizeContent(text),
                extractTags(text, content.type),
            ]);

            await storeVector(contentId, text, {
                userId,
                type: content.type,
                title: content.title,
            });

            await ContentModel.findByIdAndUpdate(contentId, {
                aiSummary,
                aiTags,
                processedAt: new Date(),
            });
        },
        { connection }
    );

    worker.on("completed", (job) => {
        logger.warn({ jobId: job.id }, "AI job completed");
    });

    worker.on("failed", (job, err) => {
        logger.error({ err, jobId: job?.id }, "AI job failed");
    });

    logger.warn("AI worker started");
    return worker;
};