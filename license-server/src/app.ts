import Fastify, { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { Config } from './config';
import { openDb } from './db';
import { LicenseStore } from './licenses';
import { registerApi } from './api';
import { registerAdmin } from './admin/routes';

export function buildApp(config: Config, db: Database.Database = openDb(config.dbPath)): { app: FastifyInstance; db: Database.Database; store: LicenseStore } {
  const app = Fastify({ trustProxy: config.trustProxy, bodyLimit: 32 * 1024, logger: false });
  const store = new LicenseStore(db, config);

  // HTML forms. Parsed manually to avoid an extra dependency.
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => {
    done(null, Object.fromEntries(new URLSearchParams(body as string)));
  });

  if (config.apiEnabled) registerApi(app, store);
  if (config.adminEnabled) registerAdmin(app, db, store, config);
  return { app, db, store };
}
