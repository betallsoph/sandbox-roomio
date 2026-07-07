import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	console.error('DATABASE_URL is required before running migrations.');
	process.exit(1);
}

const pool = new Pool({
	connectionString,
	max: 1
});

try {
	const db = drizzle(pool);
	await migrate(db, { migrationsFolder: './drizzle' });
	console.log('Database migrations are up to date.');
} finally {
	await pool.end();
}
