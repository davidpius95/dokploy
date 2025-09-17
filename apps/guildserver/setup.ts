import { execAsync } from "@guildserver/server";
import { setupDirectories } from "@guildserver/server/setup/config-paths";
import { initializePostgres } from "@guildserver/server/setup/postgres-setup";
import { initializeRedis } from "@guildserver/server/setup/redis-setup";
import {
	initializeNetwork,
	initializeSwarm,
} from "@guildserver/server/setup/setup";
import {
	createDefaultMiddlewares,
	createDefaultServerTraefikConfig,
	createDefaultTraefikConfig,
	initializeStandaloneTraefik,
} from "@guildserver/server/setup/traefik-setup";

(async () => {
	try {
		setupDirectories();
		createDefaultMiddlewares();
		await initializeSwarm();
		await initializeNetwork();
		createDefaultTraefikConfig();
		createDefaultServerTraefikConfig();
		await execAsync("docker pull traefik:v3.1.2");
		await initializeStandaloneTraefik();
		await initializeRedis();
		await initializePostgres();
	} catch (e) {
		console.error("Error in guildserver setup", e);
	}
})();
