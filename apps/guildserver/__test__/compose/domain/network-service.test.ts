import { addGuildServerNetworkToService } from "@guildserver/server";
import { describe, expect, it } from "vitest";

describe("addGuildServerNetworkToService", () => {
	it("should add network to an empty array", () => {
		const result = addGuildServerNetworkToService([]);
		expect(result).toEqual(["guildserver-network"]);
	});

	it("should not add duplicate network to an array", () => {
		const result = addGuildServerNetworkToService(["guildserver-network"]);
		expect(result).toEqual(["guildserver-network"]);
	});

	it("should add network to an existing array with other networks", () => {
		const result = addGuildServerNetworkToService(["other-network"]);
		expect(result).toEqual(["other-network", "guildserver-network"]);
	});

	it("should add network to an object if networks is an object", () => {
		const result = addGuildServerNetworkToService({ "other-network": {} });
		expect(result).toEqual({ "other-network": {}, "guildserver-network": {} });
	});
});
