import path from 'path';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../../src/models';

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../../src/migrations/*.js'),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: undefined,
});

/** Applies all pending migrations (idempotent). */
export async function migrateUp(): Promise<void> {
  await umzug.up();
}

/** Rolls back all migrations — leaves an empty schema. */
export async function migrateDown(): Promise<void> {
  await umzug.down({ to: 0 });
}

/**
 * Truncates all application tables and resets sequences.
 * Update this list each time a new migration adds a table.
 */
export async function clearAll(): Promise<void> {
  await sequelize.query(
    'TRUNCATE TABLE child_profiles, users RESTART IDENTITY CASCADE'
  );
}
