import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "./index.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const { db, pool } = createDatabase(url);
await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
await pool.end();
