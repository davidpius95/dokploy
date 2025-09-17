import type { CreateServiceOptions } from "dockerode";
import { ensureService } from "./service-utils";
export const initializePostgres = async () => {
	const imageName = "postgres:16";
	const containerName = "guildserver-postgres";
	const settings: CreateServiceOptions = {
		Name: containerName,
		TaskTemplate: {
			ContainerSpec: {
				Image: imageName,
				Env: [
					"POSTGRES_USER=guildserver",
					"POSTGRES_DB=guildserver",
					"POSTGRES_PASSWORD=amukds4wi9001583845717ad2",
				],
				Mounts: [
					{
						Type: "volume",
						Source: "guildserver-postgres-database",
						Target: "/var/lib/postgresql/data",
					},
				],
			},
			Networks: [{ Target: "guildserver-network" }],
			Placement: {
				Constraints: ["node.role==manager"],
			},
		},
		Mode: {
			Replicated: {
				Replicas: 1,
			},
		},
		...(process.env.NODE_ENV === "development" && {
			EndpointSpec: {
				Ports: [
					{
						TargetPort: 5432,
						PublishedPort: 5432,
						Protocol: "tcp",
						PublishMode: "host",
					},
				],
			},
		}),
	};

	await ensureService({
		containerName,
		imageName,
		logLabel: "Postgres",
		settings,
	});
};
