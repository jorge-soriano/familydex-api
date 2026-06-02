import path from 'path';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../../src/models';

const umzug = new Umzug({
  migrations: { glob: path.join(__dirname, '../../src/migrations/*.js') },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: undefined,
});

export async function migrateUp(): Promise<void>   { await umzug.up(); }
export async function migrateDown(): Promise<void>  { await umzug.down({ to: 0 }); }

/**
 * Truncates all application tables in reverse FK order.
 * CASCADE handles FK constraints automatically.
 * Update this list when new epics add tables.
 */
export async function clearAll(): Promise<void> {
  await sequelize.query(
    `TRUNCATE TABLE caught_pokemon, transactions, tasks, task_series,
     child_profiles, users, pokemon RESTART IDENTITY CASCADE`
  );
}
