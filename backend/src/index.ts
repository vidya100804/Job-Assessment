import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jobsRouter from './routes/jobs';
import workersRouter from './routes/workers';
import { connectDB } from './db/connection';
import { startScheduler, registerWorker } from './services/scheduler';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/jobs', jobsRouter);
app.use('/api/workers', workersRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Seed demo workers on startup
async function seedDemoWorkers() {
  try {
    await registerWorker('Alpha-Worker', ['general', 'compute']);
    await registerWorker('Beta-Worker', ['general', 'ml']);
    await registerWorker('Gamma-Worker', ['io', 'storage']);
    console.log('[Seed] Demo workers registered/updated successfully');
  } catch (err) {
    console.error('[Seed] Failed to seed demo workers:', err);
  }
}

async function startServer() {
  try {
    // Connect to database
    await connectDB();

    // Start server listening
    app.listen(PORT, async () => {
      console.log(`[Server] JobFlow API running on http://localhost:${PORT}`);
      
      // Seed demo workers
      await seedDemoWorkers();
      
      // Start scheduler loop
      startScheduler();
    });
  } catch (err) {
    console.error('[Server] Startup failed:', err);
    process.exit(1);
  }
}

startServer();
