import pkg from "pg";
const { Pool } = pkg;

// Railway Postgres usually provides DATABASE_URL.
// If you're on Railway internal network, you can still use DATABASE_URL.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway often requires SSL for external connections; internal can be non-SSL.
  // This setting is safe in most cases; if you get SSL errors, set PGSSLMODE=disable.
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
});
