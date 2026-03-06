import axios from "axios";
import Groq from "groq-sdk";
import { pineconeIndex } from "../config/pinecone";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

//  Generate Embedding (HuggingFace)
export const generateEmbedding = async (text: string): Promise<number[]> => {
    const response = await axios.post(
        "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
        { inputs: text },
        {
            headers: {
                Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
                "Content-Type": "application/json",
            },
        }
    );
    const data = response.data;
    return Array.isArray(data[0]) ? data[0] : data;
};

// Summarize Content
export const summarizeContent = async (text: string): Promise<string> => {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{
                role: "user",
                content: `Summarize this in 1-2 sentences, keep it concise: ${text.slice(0, 1000)}`
            }],
            max_tokens: 150,
        });
        return response.choices[0].message.content || "";
    } catch (err: any) {
        console.log("⚠️ Groq summarize error:", err.message);
        return "";
    }
};

//Extract Tags 
export const extractTags = async (text: string, type: string): Promise<string[]> => {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{
                role: "user",
                content: `Extract 3-5 relevant tags from this ${type} content.
                Return ONLY comma-separated tags, no explanation, no numbering.
                Content: ${text.slice(0, 500)}`
            }],
            max_tokens: 50,
        });
        return response.choices[0].message.content
            ?.split(",")
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0) || [];
    } catch (err: any) {
        console.log("⚠️ Groq tags error:", err.message);
        return [];
    }
};

// Store Vector in Pinecone 
export const storeVector = async (
    contentId: string,
    text: string,
    metadata: Record<string, string>
): Promise<void> => {
    const embedding = await generateEmbedding(text);
    await pineconeIndex.upsert({
        records: [{
            id: contentId,
            values: embedding,
            metadata: { ...metadata, contentId }
        }]
    });
};

// Semantic Search
export const semanticSearch = async (
    query: string,
    userId: string,
    topK: number = 5
): Promise<string[]> => {
    const queryEmbedding = await generateEmbedding(query);
    const results = await pineconeIndex.query({
        vector: queryEmbedding,
        topK,
        filter: { userId },
        includeMetadata: true
    });
    return results.matches
        .filter(m => (m.score ?? 0) > 0.5)
        .map(m => m.metadata?.contentId as string);
};

// Delete Vector
export const deleteVector = async (contentId: string): Promise<void> => {
    await pineconeIndex.deleteOne({ id: contentId });
};