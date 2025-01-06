import { assertEquals, assertRejects } from "jsr:@std/assert";
import { delay } from "jsr:@std/async";
import { KeeneticClient, KeeneticApiException } from "./keenetic-api.ts";
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
        const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_ADMIN_ENDPOINT");
        const LOGIN = getEnvOrThrow("KEENETIC_LOGIN");
        const PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");

        assertEquals(typeof ADMIN_ENDPOINT, "string");
        assertEquals(typeof LOGIN, "string");
        assertEquals(typeof PASSWORD, "string");
    },
});

Deno.test({
    name: "KeeneticClient - Constructor Test",
    fn() {
        const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_ADMIN_ENDPOINT");
        const LOGIN = getEnvOrThrow("KEENETIC_LOGIN");
        const PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");

        const client = new KeeneticClient(ADMIN_ENDPOINT, false, LOGIN, PASSWORD);
        assertEquals(client instanceof KeeneticClient, true);
    },
});

Deno.test({
    name: "KeeneticClient - Authentication Test",
    async fn() {
        const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_ADMIN_ENDPOINT");
        const LOGIN = getEnvOrThrow("KEENETIC_LOGIN");
        const PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");

        const client = new KeeneticClient(ADMIN_ENDPOINT, false, LOGIN, PASSWORD);
        const result = await client["_auth"]();
        assertEquals(result, true);
    },
});

Deno.test({
    name: "KeeneticClient - Failed Authentication Test",
    async fn() {
        const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_ADMIN_ENDPOINT");

        const client = new KeeneticClient(ADMIN_ENDPOINT, false, "wrong_login", "wrong_password");
        await assertRejects(
            async () => {
                await client["_auth"]();
            },
            Error,
            "Keenetic authorisation failed"
        );
    },
});

Deno.test({
    name: "KeeneticClient - Skip Authentication Test",
    fn() {
        const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_ADMIN_ENDPOINT");
        const LOGIN = getEnvOrThrow("KEENETIC_LOGIN");
        const PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");

        const client = new KeeneticClient(ADMIN_ENDPOINT, true, LOGIN, PASSWORD);
        assertEquals(client["_skip_auth"], true);
    },
});

Deno.test({
    only: true,
    name: "KeeneticClient - Metric Test",
    async fn() {
        const ADMIN_ENDPOINT = getEnvOrThrow("KEENETIC_ADMIN_ENDPOINT");
        const LOGIN = getEnvOrThrow("KEENETIC_LOGIN");
        const PASSWORD = getEnvOrThrow("KEENETIC_PASSWORD");

        const client = new KeeneticClient(ADMIN_ENDPOINT, false, LOGIN, PASSWORD);
        const result = await client.metric("ip hotspot", );
        assertEquals(typeof result, "object");
    },
});

