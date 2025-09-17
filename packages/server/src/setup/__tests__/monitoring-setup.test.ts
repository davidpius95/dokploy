import assert from "node:assert/strict";
import test from "node:test";

import { resolveMetricsPort } from "../monitoring-setup";

test("resolveMetricsPort returns a numeric port when configured", () => {
	const metricsConfig = { server: { port: 9100 } };

	const port = resolveMetricsPort(metricsConfig, "test context");

	assert.equal(port, 9100);
});

test("resolveMetricsPort throws when port is missing", () => {
	assert.throws(
		() => resolveMetricsPort({ server: {} }, "missing config"),
		/Metrics port is not configured for missing config/,
	);
});

test("resolveMetricsPort throws when port is not a number", () => {
	assert.throws(
		() => resolveMetricsPort({ server: { port: "8080" } as any }, "invalid"),
		/Metrics port is not configured for invalid/,
	);
});
