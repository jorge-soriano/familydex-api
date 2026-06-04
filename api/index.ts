import 'dotenv/config';
import 'pg';
import 'pg-hstore';
import '../src/models'; // set up Sequelize associations
import app from '../src/app';

export default app;
