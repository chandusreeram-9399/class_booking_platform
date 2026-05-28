import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a postgres connection
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for better compatibility
});

// Create drizzle instance
export const db = drizzle(client, { schema });

export * from './schema';
