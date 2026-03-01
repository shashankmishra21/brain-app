import express from "express";
import cors from "cors";
import authRoutes from "./features/auth/auth.routes";
import contentRoutes from "./features/content/content.routes";
import brainRoutes from "./features/brain/brain.routes";

const app = express();

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/v1', authRoutes);     
app.use('/api/v1/content', contentRoutes); 
app.use('/api/v1/brain', brainRoutes);  

export default app;
