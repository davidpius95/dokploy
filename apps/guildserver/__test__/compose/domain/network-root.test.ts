import { addGuildServerNetworkToRoot } from "@guildserver/server";
import { describe, expect, it } from "vitest";

describe("addGuildServerNetworkToRoot", () => {
	it("should create network object if networks is undefined", () => {
		const result = addGuildServerNetworkToRoot(undefined);
		expect(result).toEqual({ "guildserver-network": { external: true } });
	});

	it("should add network to an empty object", () => {
		const result = addGuildServerNetworkToRoot({});
		expect(result).toEqual({ "guildserver-network": { external: true } });
	});

	it("should not modify existing network configuration", () => {
		const existing = { "guildserver-network": { external: false } };
		const result = addGuildServerNetworkToRoot(existing);
		expect(result).toEqual({ "guildserver-network": { external: true } });
	});

	it("should add network alongside existing networks", () => {
		const existing = { "other-network": { external: true } };
		const result = addGuildServerNetworkToRoot(existing);
		expect(result).toEqual({
			"other-network": { external: true },
			"guildserver-network": { external: true },
		});
	});
});
