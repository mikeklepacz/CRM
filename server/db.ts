// Database connection setup - supports Neon (remote) and local Postgres
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool as NodePgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function isLocalPostgresConnection(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

const connectionString = process.env.DATABASE_URL;

export const pool = isLocalPostgresConnection(connectionString)
  ? new NodePgPool({ connectionString })
  : (() => {
      neonConfig.webSocketConstructor = ws;
      return new NeonPool({ connectionString });
    })();

export const db = isLocalPostgresConnection(connectionString)
  ? drizzleNode({ client: pool as NodePgPool, schema })
  : drizzleNeon({ client: pool as NeonPool, schema });
