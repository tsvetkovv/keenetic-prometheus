import { assertEquals } from "jsr:@std/assert";

import { MetricsCollector } from "./metrics-config.ts";
import { KeeneticClient } from "./keenetic-api.ts";

// Test data that will be used across multiple tests
const testData = {
  host: [
    { id: 1, active: true, ssid: "wifi1" },
    { id: 2, active: false, ssid: "wifi2" },
    { id: 3, active: true },
    { id: 4 },
  ],
  devices: [
    { name: "dev1", connected: true },
    { name: "dev2", connected: false },
  ],
};

// Helper function to create metrics collector instance
function createMetricsCollector() {
  const mockClient = {} as KeeneticClient;
  const config = { metrics: {} };
  return new MetricsCollector(config, mockClient);
}

Deno.test("MetricsCollector.evaluateArraySelector - filter by boolean true value", () => {
  const metricsCollector = createMetricsCollector();
  const result = metricsCollector.evaluateArraySelector(
    testData,
    "host[?active===true]",
  );
  assertEquals(result.length, 2);
  assertEquals(result, [
    { id: 1, active: true, ssid: "wifi1" },
    { id: 3, active: true },
  ]);
});

Deno.test("MetricsCollector.evaluateArraySelector - filter by boolean false value", () => {
  const metricsCollector = createMetricsCollector();
  const result = metricsCollector.evaluateArraySelector(
    testData,
    "host[?active===false]",
  );
  assertEquals(result.length, 1);
  assertEquals(result, [
    { id: 2, active: false, ssid: "wifi2" },
  ]);
});

Deno.test("MetricsCollector.evaluateArraySelector - filter by field existence", () => {
  const metricsCollector = createMetricsCollector();
  const result = metricsCollector.evaluateArraySelector(
    testData,
    "host[?ssid]",
  );
  assertEquals(result.length, 2);
  assertEquals(result, [
    { id: 1, active: true, ssid: "wifi1" },
    { id: 2, active: false, ssid: "wifi2" },
  ]);
});

Deno.test("MetricsCollector.evaluateArraySelector - filter by field existence", () => {
  const metricsCollector = createMetricsCollector();
  const result = metricsCollector.evaluateArraySelector(
    testData,
    "host",
  );
  assertEquals(result.length, 4);
  assertEquals(result, [
    { id: 1, active: true, ssid: "wifi1" },
    { id: 2, active: false, ssid: "wifi2" },
    { id: 3, active: true },
    { id: 4 },
  ]);
});

Deno.test("MetricsCollector.evaluateArraySelector - handle non-existent array field", () => {
  const metricsCollector = createMetricsCollector();
  const result = metricsCollector.evaluateArraySelector(
    testData,
    "nonexistent[?active===true]",
  );
  assertEquals(result.length, 0);
});

Deno.test("MetricsCollector.evaluateArraySelector - handle invalid selector format", () => {
  const metricsCollector = createMetricsCollector();
  const result = metricsCollector.evaluateArraySelector(
    testData,
    "invalid selector",
  );
  assertEquals(result.length, 0);
});

Deno.test("MetricsCollector.evaluateArraySelector - work with different array fields", () => {
  const metricsCollector = createMetricsCollector();
  const result = metricsCollector.evaluateArraySelector(
    testData,
    "devices[?connected===true]",
  );
  assertEquals(result.length, 1);
  assertEquals(result, [
    { name: "dev1", connected: true },
  ]);
});
