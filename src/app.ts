import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { filterXSS } from "xss";
import authRoutes from "./features/auth/auth.routes";
import contentRoutes from "./features/content/content.routes";
import brainRoutes from "./features/brain/brain.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimit } from "./middleware/rate-limit.middleware";


// Custom XSS middleware
const xssMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.body) {
        const sanitize = (obj: any): any => {
            if (typeof obj === 'string') return filterXSS(obj);
            if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(key => {
                    obj[key] = sanitize(obj[key]);
                });
            }
            return obj;
        };
        req.body = sanitize(req.body);
    }
    next();
};

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors());
app.use(mongoSanitize());
app.use(xssMiddleware);
app.use('/uploads', express.static('uploads'));
app.use(apiRateLimit);

app.use('/api/v1', authRoutes);             // /api/v1/signup, /api/v1/signin   
app.use('/api/v1/content', contentRoutes);  // /api/v1/content ...
app.use('/api/v1/brain', brainRoutes);      // /api/v1/brain/:shareLink, /api/v1/brain/share


app.use(notFoundHandler);   // 404 for unknown routes
app.use(errorHandler);      // catches all errors

export default app;