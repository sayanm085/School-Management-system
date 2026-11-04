function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(
      entries.map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

export function canonicalize<T>(value: T): T {
  return canonical(value) as T;
}

export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(canonical(value), null, indent);
}
