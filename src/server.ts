import './config/database';
import app from './app';
import { startAIWorker } from './queues/ai.queue';
import logger from './config/logger';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.warn(`Server running on port ${PORT}`);
    try {
        startAIWorker();
    } catch (err) {
        logger.error({ err }, "AI worker failed to start");
    }
});