import express from 'express';
import cors from 'cors';
import jobsRouter from './routes/jobs';
import workersRouter from './routes/workers';
import { startScheduler, registerWorker } from './services/scheduler';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/jobs', jobsRouter);
app.use('/api/workers', workersRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Seed demo workers on startup
function seedDemoWorkers() {
  registerWorker('Alpha-Worker', ['general', 'compute']);
  registerWorker('Beta-Worker', ['general', 'ml']);
  registerWorker('Gamma-Worker', ['io', 'storage']);
  console.log('[Seed] 3 demo workers registered');
}

app.listen(PORT, () => {
  console.log(`[Server] JobFlow API running on http://localhost:${PORT}`);
  seedDemoWorkers();
  startScheduler();
});
