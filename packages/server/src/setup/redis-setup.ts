import type { CreateServiceOptions } from "dockerode";
import { ensureService } from "./service-utils";

export const initializeRedis = async () => {
	const imageName = "redis:7";
	const containerName = "guildserver-redis";

	const settings: CreateServiceOptions = {
		Name: containerName,
		TaskTemplate: {
			ContainerSpec: {
				Image: imageName,
				Mounts: [
					{
						Type: "volume",
						Source: "redis-data-volume",
						Target: "/data",
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
						TargetPort: 6379,
						PublishedPort: 6379,
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
		logLabel: "Redis",
		settings,
	});
};
