import express from 'express';
import pg from 'pg';
import { Connector } from '@google-cloud/cloud-sql-connector';

const { Pool } = pg;
const app = express();

/**
 * Environment variables expected:
 *   DB_USER, DB_PASS, DB_NAME               – always
 *   INSTANCE_CONNECTION_NAME (prod only)    – "project:region:instance"
 *
 * If INSTANCE_CONNECTION_NAME is **missing**, we assume we are on a
 * developer laptop (or CI) talking to a plain TCP Postgres running on
 * localhost:5432 – either Docker Compose or the Cloud SQL Auth Proxy.
 */

const {
  DB_USER = 'spill_app',
  DB_PASS = 'devpass',
  DB_NAME = 'spill_dev',
  INSTANCE_CONNECTION_NAME,
} = process.env;

let poolConfig;

if (INSTANCE_CONNECTION_NAME) {
  // --- Production / Cloud Run path (Unix socket) ---
  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: INSTANCE_CONNECTION_NAME,
    ipType: 'PUBLIC', // or 'PRIVATE' if you gave the instance a private IP
  });
  poolConfig = {
    ...clientOpts,          // host, port (always 5432), ssl
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    max: 5,
  };
} else {
  // --- Local dev / test path (TCP) ---
  poolConfig = {
    host: 'localhost',
    port: 5432,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    max: 5,
  };
}

const pool = new Pool(poolConfig);

// simple health check
app.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT NOW()');
    res.json({ message: 'Spill backend alive!', db_time: rows[0].now });
  } catch (err) {
    next(err);
  }
});

app.listen(process.env.PORT || 8080, () =>
  console.log('Listening on :8080'),
);
