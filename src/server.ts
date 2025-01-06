import "jsr:@std/dotenv/load";
import { Counter, Gauge, Registry } from "prom-client";
import { parse as parseYaml } from "yaml";
import { KeeneticClient } from "./keenetic-api.ts";
import { MetricsCollector } from "./metrics-config.ts";
import { getEnvOrThrow } from "./utils.ts";

// Load environment variables
const KEENETIC_HOST = getEnvOrThrow("KEENETIC_HOST");
const KEENETIC_USERNAME = getEnvOrThrow("KEENETIC_USERNAME");
const KEENETIC_PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");
const METRICS_PORT = parseInt(Deno.env.get("METRICS_PORT") || "9991", 10);
const METRICS_HOST = Deno.env.get("METRICS_HOST") || "localhost";
// Initialize Prometheus registry
const register = new Registry();

// Load config
const configFile = await Deno.readTextFile("./config/metrics.yaml");
const config = parseYaml(configFile);

// Initialize the client and collector
const client = new KeeneticClient(
  KEENETIC_HOST,
  KEENETIC_USERNAME,
  KEENETIC_PASSWORD,
);
const collector = new MetricsCollector(config, client);

// Create a map to store Prometheus metrics
const prometheusMetrics: Record<string, Gauge | Counter> = {};

// Function to update Prometheus metrics
async function updateMetrics() {
  try {
    const metrics = await collector.collectMetrics();

    for (const [name, data] of Object.entries(metrics)) {
      if (typeof data !== "object" || data === null) continue;

      // Create metric if it doesn't exist
      if (!prometheusMetrics[name]) {
        prometheusMetrics[name] = new Gauge({
          name,
          help: String(data.help),
          labelNames: data.values
            ? Object.keys(data.values[0]?.labels || {})
            : [],
          registers: [register],
        });
      }

      // Update metric values
      const metric = prometheusMetrics[name];
      if ("values" in data && Array.isArray(data.values)) {
        // Handle multi-value metrics with labels
        data.values.forEach((item) => {
          if (metric instanceof Gauge) {
            metric.set(item.labels || {}, item.value);
          } else if (metric instanceof Counter) {
            metric.inc(item.labels || {}, item.value);
          }
        });
      } else if ("value" in data && typeof data.value === "number") {
        // Handle single-value metrics
        if (metric instanceof Gauge) {
          metric.set(data.value);
        } else if (metric instanceof Counter) {
          metric.inc(data.value);
        }
      }
    }
  } catch (error) {
    console.error("Error updating metrics:", error);
  }
}

// Start metrics server
const server = Deno.serve({ port: METRICS_PORT }, async (request) => {
  if (
    request.method === "GET" && new URL(request.url).pathname === "/metrics"
  ) {
    try {
      await updateMetrics();
      const metrics = await register.metrics();
      return new Response(metrics, {
        headers: { "Content-Type": register.contentType },
      });
    } catch (error) {
      console.error("Error serving metrics:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});

console.log(
  `Metrics server running on http://${METRICS_HOST}:${METRICS_PORT}/metrics`,
);

// Handle server shutdown
Deno.addSignalListener("SIGINT", () => {
  server.shutdown();
  console.log("Server shutdown complete");
  Deno.exit(0);
});
