import { dirname } from "node:path";
import { findServerById } from "@guildserver/server/services/server";
import type Dockerode from "dockerode";
import type { ContainerCreateOptions } from "dockerode";
import { IS_CLOUD } from "../constants";
import { findUserById } from "../services/admin";
import { getGuildServerImageTag } from "../services/settings";
import { pullImage, pullRemoteImage } from "../utils/docker/utils";
import { execAsync, execAsyncRemote } from "../utils/process/execAsync";
import { getRemoteDocker } from "../utils/servers/remote-docker";

const DEFAULT_MONITORING_CONTAINER = "guildserver-monitoring";
const DEFAULT_MONITORING_STORAGE_PATH = "/etc/guildserver/monitoring/monitoring.db";

const buildStoragePrepCommand = (storagePath: string) => {
	const directory = dirname(storagePath);
	return `mkdir -p ${directory} && touch ${storagePath}`;
};

type MetricsConfig = {
	server?: {
		port?: unknown;
	};
} | null;

export const resolveMetricsPort = (
	metricsConfig: MetricsConfig,
	context: string,
) => {
	const port = metricsConfig?.server?.port;

	if (typeof port !== "number" || Number.isNaN(port)) {
		throw new Error(`Metrics port is not configured for ${context}`);
	}

	return port;
};

const resolveImageName = () => {
	const shouldUseCanary =
		(getGuildServerImageTag() !== "latest" || process.env.NODE_ENV === "development") &&
		!IS_CLOUD;

	return shouldUseCanary ? "guildserver/monitoring:canary" : "guildserver/monitoring:latest";
};

const isStatusCodeError = (error: unknown, statusCode: number) =>
	typeof error === "object" &&
	error !== null &&
	"statusCode" in error &&
	typeof (error as { statusCode?: unknown }).statusCode === "number" &&
	(error as { statusCode: number }).statusCode === statusCode;

const buildMonitoringSettings = ({
	imageName,
	metricsConfig,
	port,
	networkMode,
	containerName = DEFAULT_MONITORING_CONTAINER,
	storagePath = DEFAULT_MONITORING_STORAGE_PATH,
}: {
	imageName: string;
	metricsConfig: unknown;
	port: number;
	networkMode?: string;
	containerName?: string;
	storagePath?: string;
}): ContainerCreateOptions => {
	const portString = port.toString();
	const serializedMetrics = JSON.stringify(metricsConfig) ?? "undefined";

	return {
		name: containerName,
		Env: [`METRICS_CONFIG=${serializedMetrics}`],
		Image: imageName,
		HostConfig: {
			RestartPolicy: { Name: "always" },
			PortBindings: {
				[`${portString}/tcp`]: [
					{
						HostPort: portString,
					},
				],
			},
			Binds: [
				"/var/run/docker.sock:/var/run/docker.sock:ro",
				"/sys:/host/sys:ro",
				"/etc/os-release:/etc/os-release:ro",
				"/proc:/host/proc:ro",
				`${storagePath}:/app/monitoring.db`,
			],
			...(networkMode ? { NetworkMode: networkMode } : {}),
		},
		ExposedPorts: {
			[`${portString}/tcp`]: {},
		},
	};
};

const ensureMonitoringContainer = async ({
	docker,
	metricsConfig,
	port,
	prepareStorage,
	pullImageFn,
	networkMode,
	context,
	containerName = DEFAULT_MONITORING_CONTAINER,
	storagePath = DEFAULT_MONITORING_STORAGE_PATH,
}: {
	docker: Dockerode;
	metricsConfig: unknown;
	port: number;
	prepareStorage: (storagePath: string) => Promise<void>;
	pullImageFn: (image: string) => Promise<void>;
	networkMode?: string;
	context: string;
	containerName?: string;
	storagePath?: string;
}) => {
	const imageName = resolveImageName();
	const settings = buildMonitoringSettings({
		imageName,
		metricsConfig,
		port,
		networkMode,
		containerName,
		storagePath,
	});

	await prepareStorage(storagePath);
	await pullImageFn(imageName);

	const container = docker.getContainer(containerName);

	try {
		await container.inspect();
		await container.remove({ force: true });
		console.log(`[Monitoring] Removed existing container (${context})`);
	} catch (error) {
		if (!isStatusCodeError(error, 404)) {
			throw error;
		}
	}

	await docker.createContainer(settings);
	const newContainer = docker.getContainer(containerName);
	await newContainer.start();

	console.log(`[Monitoring] Container started (${context}) ✅`);
};

export const setupMonitoring = async (serverId: string) => {
	const server = await findServerById(serverId);

	try {
		const port = resolveMetricsPort(server?.metricsConfig ?? null, "the server");

		const docker = await getRemoteDocker(serverId);

		await ensureMonitoringContainer({
			docker,
			metricsConfig: server.metricsConfig,
			port,
			networkMode: "host",
			prepareStorage: async (storagePath) => {
				const command = buildStoragePrepCommand(storagePath);
				await execAsyncRemote(serverId, command);
			},
			pullImageFn: (image) => pullRemoteImage(image, serverId),
			context: "remote",
		});
	} catch (error) {
		console.log("[Monitoring] Failed to setup remote monitoring", error);
	}
};

export const setupWebMonitoring = async (userId: string) => {
	const user = await findUserById(userId);

	try {
		const port = resolveMetricsPort(user?.metricsConfig ?? null, "the admin user");

		const docker = await getRemoteDocker();

		await ensureMonitoringContainer({
			docker,
			metricsConfig: user?.metricsConfig,
			port,
			prepareStorage: async (storagePath) => {
				const command = buildStoragePrepCommand(storagePath);
				await execAsync(command);
			},
			pullImageFn: pullImage,
			context: "local",
		});
	} catch (error) {
		console.log("[Monitoring] Failed to setup local monitoring", error);
	}
};
