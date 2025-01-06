import { parse as parseYaml } from "yaml";
import { KeeneticClient } from "./keenetic-api.ts";
import { MetricsCollector } from "./metrics-config.ts";
import "jsr:@std/dotenv/load";
import { getEnvOrThrow } from "./utils.ts";

// Initialize client and collector
const client = new KeeneticClient(
  getEnvOrThrow("KEENETIC_HOST"),
  getEnvOrThrow("KEENETIC_USERNAME"),
  getEnvOrThrow("KEENETIC_PASSWORD"),
);

const configFile = await Deno.readTextFile("./config/metrics.yaml");
const config = parseYaml(configFile);

const collector = new MetricsCollector(config, client);

// Collect metrics
const metrics = await collector.collectMetrics();
console.log(metrics);
