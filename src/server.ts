import 'dotenv/config';
import app from './app';
import { sequelize } from './models';

const PORT = process.env.PORT ?? 3000;

async function start(): Promise<void> {
  await sequelize.authenticate();
  console.log('Database connected');
  // sequelize.sync() will be called here once models are defined
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
