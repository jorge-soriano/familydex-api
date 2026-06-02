import 'dotenv/config';
import app from './app';
import { sequelize } from './models';
import { startRecurringTasksJob } from './jobs/recurringTasks.job';

const PORT = process.env.PORT ?? 3000;

async function start(): Promise<void> {
  await sequelize.authenticate();
  console.log('Database connected');
  // Schema managed by Sequelize CLI migrations (src/migrations/)
  if (process.env.NODE_ENV !== 'test') startRecurringTasksJob();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
