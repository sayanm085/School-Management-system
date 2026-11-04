export function errorChain(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    parts.push(current.message);
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(" | ");
}

export function causeOf(error: unknown): Record<string, unknown> | undefined {
  if (!(error instanceof Error)) return undefined;
  const cause = (error as { cause?: unknown }).cause;
  return cause instanceof Error
    ? (cause as unknown as Record<string, unknown>)
    : undefined;
}
