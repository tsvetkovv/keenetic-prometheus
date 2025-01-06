import { assertEquals } from "jsr:@std/assert";
import { KeeneticClient } from "./keenetic-api.ts";
import "jsr:@std/dotenv/load";

// Helper function to check environment variables
function getEnvOrThrow(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`${key} environment variable is not set`);
  }
  return value;
}

Deno.test({
  name: "Environment Variables Test",
  permissions: {
    env: true,
    read: true,
  },
  fn() {
    const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_HOST");
    const LOGIN = getEnvOrThrow("KEENETIC_USERNAME");
    const PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");

    assertEquals(typeof ADMIN_ENDPOINT, "string");
    assertEquals(typeof LOGIN, "string");
    assertEquals(typeof PASSWORD, "string");
  },
});

Deno.test({
  name: "KeeneticClient - Constructor Test",
  fn() {
    const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_HOST");
    const LOGIN = getEnvOrThrow("KEENETIC_USERNAME");
    const PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");

    const client = new KeeneticClient(ADMIN_ENDPOINT, LOGIN, PASSWORD);
    assertEquals(client instanceof KeeneticClient, true);
  },
});

Deno.test({
  name: "KeeneticClient - Authentication Test",
  async fn() {
    const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_HOST");
    const LOGIN = getEnvOrThrow("KEENETIC_USERNAME");
    const PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");

    const client = new KeeneticClient(ADMIN_ENDPOINT, LOGIN, PASSWORD);
    const result = await client["_auth"]();
    assertEquals(result, true);
  },
});

Deno.test({
  name: "KeeneticClient - Metric Test",
  async fn() {
    const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_HOST");
    const LOGIN = getEnvOrThrow("KEENETIC_USERNAME");
    const PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");

    const client = new KeeneticClient(ADMIN_ENDPOINT, LOGIN, PASSWORD);
    const result = await client.metric("ip hotspot");
    assertEquals(typeof result, "object");
  },
});
