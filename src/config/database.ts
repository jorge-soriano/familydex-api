import { Sequelize } from 'sequelize';

const dbName =
  process.env.NODE_ENV === 'test'
    ? (process.env.DB_TEST_NAME ?? 'familydex_test')
    : (process.env.DB_NAME ?? 'familydex');

export const sequelize = new Sequelize(
  dbName,
  process.env.DB_USER ?? 'postgres',
  process.env.DB_PASSWORD ?? '',
  {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);
