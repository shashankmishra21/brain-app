import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { pineconeIndex } from "../config/pinecone";

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Generate Embedding (HuggingFace)
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

// Summarize Content (Gemini)
export const summarizeContent = async (text: string): Promise<string> => {
    try {
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash-002" });
        const result = await model.generateContent(`Summarize: ${text.slice(0, 1000)}`);
        return result.response.text();
    } catch (err: any) {
        console.log("Gemini error:", err.message);
        return "";
    }
};


// Extract Tags (Gemini)
export const extractTags = async (text: string, type: string): Promise<string[]> => {
    try {
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash-002" });
        const result = await model.generateContent(
            `Extract 3-5 relevant tags from this ${type} content. 
             Return ONLY comma-separated tags, no explanation.
             Content: ${text.slice(0, 500)}`
        );
        return result.response.text()
            .split(",")
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);
    } catch {
        return [];
    }
};

// Store Vector in Pinecone
export const storeVector = async (
    contentId: string,
    text: string,
    metadata: Record<string, string>  // change from 'object' to this
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

//Semantic Search
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