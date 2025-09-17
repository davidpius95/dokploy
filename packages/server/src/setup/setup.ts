import { docker } from "../constants/docker";

const GUILDSERVER_NETWORK_NAME = "guildserver-network";

export const initializeSwarm = async () => {
	if (await dockerSwarmInitialized()) {
		console.log("Docker swarm already initialized");
		return;
	}

	await docker.swarmInit({
		AdvertiseAddr: "127.0.0.1",
		ListenAddr: "0.0.0.0",
	});
	console.log("Docker swarm initialized ✅");
};

export const dockerSwarmInitialized = async () => {
	try {
		await docker.swarmInspect();
		return true;
	} catch {
		return false;
	}
};

export const initializeNetwork = async () => {
	if (await dockerNetworkInitialized()) {
		console.log(`Docker network "${GUILDSERVER_NETWORK_NAME}" already initialized`);
		return;
	}

	await docker.createNetwork({
		Attachable: true,
		Name: GUILDSERVER_NETWORK_NAME,
		Driver: "overlay",
	});
	console.log(`Docker network "${GUILDSERVER_NETWORK_NAME}" initialized ✅`);
};

export const dockerNetworkInitialized = async () => {
	try {
		await docker.getNetwork(GUILDSERVER_NETWORK_NAME).inspect();
		return true;
	} catch {
		return false;
	}
};
