import express from "express";
import cors from "cors";
import authRoutes from "./features/auth/auth.routes";
import contentRoutes from "./features/content/content.routes";
import brainRoutes from "./features/brain/brain.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app = express();

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

app.use('/api/v1', authRoutes);             // /api/v1/signup, /api/v1/signin   
app.use('/api/v1/content', contentRoutes);  // /api/v1/content ...
app.use('/api/v1/brain', brainRoutes);      // /api/v1/brain/:shareLink, /api/v1/brain/share


app.use(notFoundHandler);   // 404 for unknown routes
app.use(errorHandler);      // catches all errors

export default app;