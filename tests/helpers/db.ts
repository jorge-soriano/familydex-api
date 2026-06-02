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

export async function migrateUp(): Promise<void> {
  await umzug.up();
}

export async function migrateDown(): Promise<void> {
  await umzug.down({ to: 0 });
}

/**
 * Truncates all application tables and resets sequences.
 * Tables listed in reverse FK dependency order; CASCADE handles the rest.
 * Update this list each time a new epic adds tables.
 */
export async function clearAll(): Promise<void> {
  await sequelize.query(
    `TRUNCATE TABLE transactions, tasks, task_series, child_profiles, users
     RESTART IDENTITY CASCADE`
  );
}
