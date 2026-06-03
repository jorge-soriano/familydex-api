import 'dotenv/config';
import app from './app';
import { sequelize } from './models';
import { startRecurringTasksJob } from './jobs/recurringTasks.job';
import { seedPokemon } from './seeders/pokemon.seeder';
import { seedDemo }   from './seeders/demo.seeder';

const PORT = process.env.PORT ?? 3001;

// ── OWASP A02: Fail fast if JWT_SECRET is insecure ───────────────────────────
function validateSecrets(): void {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('FATAL: JWT_SECRET environment variable is not set.');
    process.exit(1);
  }

  if (secret === 'change-me-in-production') {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: JWT_SECRET must be changed before deploying to production.');
      process.exit(1);
    }
    console.warn(
      'WARNING: Using default JWT_SECRET. ' +
      'Set a strong random value in .env before going to production.'
    );
  }

  if (secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: JWT_SECRET must be at least 32 characters long.');
      process.exit(1);
    }
    console.warn('WARNING: JWT_SECRET is shorter than 32 characters. Use a longer secret.');
  }
}

async function start(): Promise<void> {
  validateSecrets();

  await sequelize.authenticate();
  console.log('Database connected');
  // Schema managed by Sequelize CLI migrations (src/migrations/)
  await seedPokemon();
  if (process.env.NODE_ENV !== 'test') {
    await seedDemo();
    startRecurringTasksJob();
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
