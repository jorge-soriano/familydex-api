import { Sequelize } from 'sequelize';

const dbName =
  process.env.NODE_ENV === 'test'
    ? (process.env.DB_NAME_TEST ?? 'familydex_test')
    : (process.env.DB_NAME ?? 'familydex_dev');

const ssl = process.env.DB_SSL === 'true';

export const sequelize = new Sequelize(
  dbName,
  process.env.DB_USER     ?? 'familydex',
  process.env.DB_PASSWORD ?? 'familydex',
  {
    host:    process.env.DB_HOST ?? 'localhost',
    port:    Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    ...(ssl && {
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    }),
  }
);
