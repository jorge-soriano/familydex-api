const path = require('path');
// Carga explícita desde la raíz del proyecto, independiente del cwd
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const base = {
  username: process.env.DB_USER     || 'familydex',
  password: process.env.DB_PASSWORD || 'familydex',
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5433,
  dialect:  'postgres',
  logging:  false,
};

module.exports = {
  development: {
    ...base,
    database: process.env.DB_NAME || 'familydex_dev',
  },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || 'familydex_test',
  },
  production: {
    ...base,
    database: process.env.DB_NAME,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  },
};
