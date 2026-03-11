import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import { filterXSS } from "xss";
import authRoutes from "./features/auth/auth.routes";
import contentRoutes from "./features/content/content.routes";
import brainRoutes from "./features/brain/brain.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimit } from "./middleware/rate-limit.middleware";


const xssMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.body) {
        const sanitize = (obj: any): any => {
            if (typeof obj === 'string') return filterXSS(obj);
            if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(key => { obj[key] = sanitize(obj[key]); });
            }
            return obj;
        };
        req.body = sanitize(req.body);
    }
    next();
};


const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());

app.use('/uploads', express.static('uploads'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// sanitization runs after body parsing, before routes
app.use(mongoSanitize());
app.use(xssMiddleware);

app.use(apiRateLimit);

app.use('/api/v1', authRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/brain', brainRoutes);

app.use(notFoundHandler);
app.use(errorHandler);


export default app;