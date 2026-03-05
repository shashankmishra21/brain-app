import { Queue, Worker, Job } from "bullmq";
import { ContentModel } from "../features/content/content.model";
import { storeVector, summarizeContent, extractTags } from "../services/ai.service";

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

        // Queue (Producer) 
export const aiQueue = new Queue("ai-processing", { connection });

            // Worker (Consumer) 
export const startAIWorker = () => {
    const worker = new Worker(
        "ai-processing",
        async (job: Job) => {
            const { contentId, userId } = job.data;
            console.log(`Processing AI job for: ${contentId}`);

            const content = await ContentModel.findById(contentId);
            if (!content) return;

            const text = `${content.title} ${content.description}`.trim();
            if (!text) return;

            const aiSummary = await summarizeContent(text);
            const aiTags = await extractTags(text, content.type);

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

            console.log(`AI done: ${content.title}`);
            console.log(`   Summary: ${aiSummary}`);
            console.log(`   Tags: ${aiTags.join(', ')}`);
        },
        { connection }
    );

    worker.on("completed", (job) => console.log(`Job ${job.id} completed`));
    worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err.message));

    console.log("AI Worker started");
    return worker;
};