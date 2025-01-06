export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function getEnvOrThrow(key: string): string {
  const value = Deno.env.get(key);
  invariant(value, `Environment variable ${key} is not set`);
  return value;
}
