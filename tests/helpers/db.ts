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

export async function clearAll(): Promise<void> {
  await sequelize.query(
    `TRUNCATE TABLE task_templates, reward_requests, caught_pokemon, transactions,
     tasks, task_series, child_profiles, users, pokemon, rewards
     RESTART IDENTITY CASCADE`
  );
}
