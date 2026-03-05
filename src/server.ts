import './config/database';
import app from './app';
import { startAIWorker } from './queues/ai.queue';

const PORT = process.env.PORT || 3000;

startAIWorker();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));