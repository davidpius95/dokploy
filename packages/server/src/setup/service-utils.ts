import type Dockerode from "dockerode";
import type { CreateServiceOptions } from "dockerode";
import { docker } from "../constants/docker";
import { pullImage } from "../utils/docker/utils";

type EnsureServiceResult = "created" | "updated" | "skipped";

interface EnsureServiceOptions {
	containerName: string;
	imageName: string;
	settings: CreateServiceOptions;
	logLabel?: string;
	dockerClient?: Dockerode;
	pullImageFn?: (imageName: string) => Promise<void>;
	onUpdateSettings?: (args: {
		inspect: ServiceInspectData;
		settings: CreateServiceOptions;
	}) => CreateServiceOptions;
}

type ServiceInspectData = {
	Version: {
		Index?: number;
	};
	Spec?: {
		TaskTemplate?: {
			ForceUpdate?: number;
		};
	};
};

const isStatusCodeError = (error: unknown, statusCode: number) => {
	return (
		typeof error === "object" &&
		error !== null &&
		"statusCode" in error &&
		typeof (error as { statusCode?: unknown }).statusCode === "number" &&
		(error as { statusCode: number }).statusCode === statusCode
	);
};

export const ensureService = async ({
	containerName,
	imageName,
	settings,
	logLabel = containerName,
	dockerClient,
	pullImageFn = pullImage,
	onUpdateSettings,
}: EnsureServiceOptions): Promise<EnsureServiceResult> => {
	const client = dockerClient ?? docker;

	await pullImageFn(imageName);

	const service = client.getService(containerName);

	let versionIndex: number | undefined;
	let inspectInfo: ServiceInspectData | undefined;

	try {
		const inspect = (await service.inspect()) as ServiceInspectData;
		inspectInfo = inspect;
		const rawIndex = inspect.Version?.Index;
		if (typeof rawIndex === "number") {
			versionIndex = rawIndex;
		} else if (rawIndex !== undefined) {
			versionIndex = Number.parseInt(`${rawIndex}`);
		}
	} catch (error) {
		if (!isStatusCodeError(error, 404)) {
			throw error;
		}
	}

	if (versionIndex !== undefined) {
		const updateSettings =
			onUpdateSettings && inspectInfo
				? onUpdateSettings({ inspect: inspectInfo, settings })
				: settings;

		await service.update({
			version: versionIndex,
			...updateSettings,
		});
		console.log(`${logLabel} service updated ✅`);
		return "updated";
	}

	try {
		await client.createService(settings);
		console.log(`${logLabel} service created ✅`);
		return "created";
	} catch (error) {
		if (isStatusCodeError(error, 409)) {
			console.log(`${logLabel} service already exists, continuing...`);
			return "skipped";
		}
		throw error;
	}
};
