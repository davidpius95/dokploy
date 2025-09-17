import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const migration = async () => {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		console.warn("DATABASE_URL is not set. Skipping migrations.");
		return;
	}

	const sql = postgres(connectionString, { max: 1 });
	const db = drizzle(sql);

	try {
		await migrate(db, { migrationsFolder: "drizzle" });
		console.log("Migration complete");
	} catch (error) {
		console.log("Migration failed", error);
		throw error;
	} finally {
		await sql.end();
	}
};
