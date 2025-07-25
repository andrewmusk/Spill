import express from 'express';
import pg from 'pg';
import { Connector } from '@google-cloud/cloud-sql-connector';

const { Pool } = pg;
const app = express();

/**
 * Build a PG pool that uses the Cloud SQL Node connector.
 * The connector handles IAM auth & TLS; no proxy needed.
 */
const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME; // "project:region:instance"
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;

const connector = new Connector();
const clientOpts = await connector.getOptions({
  instanceConnectionName: INSTANCE_CONNECTION_NAME,
  ipType: 'PUBLIC',               // or 'PRIVATE' if you gave the instance a private IP
});

const pool = new Pool({
  ...clientOpts,                  // → { host, port, ssl }
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  max: 5,
});

// simple health check
app.get('/', async (_, res) => {
  const { rows } = await pool.query('SELECT NOW()');
  res.json({ message: 'Spill JS backend alive!', db_time: rows[0].now });
});

app.listen(process.env.PORT || 8080, () =>
  console.log('Listening on :8080'),
);
