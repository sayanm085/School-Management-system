export type ProblemInput = {
  status: number;
  code: string;
  title: string;
  detail: string;
  requestId: string;
  instance: string;
  errors?: unknown[];
  /**
   * RFC 9457 extension members the throwing code wants the client to see,
   * such as the `current` version carried by a `VERSION_CONFLICT`.
   */
  extensions?: Record<string, unknown>;
};

/**
 * Members that belong to the problem document itself or to Nest's built-in
 * exception payloads; they are never copied over as extension members.
 * `code` and `detail` carry the error identity, so a server-side extras object
 * must not be able to replace them with `type`/`status`/`requestId`/`errors`
 * alongside them.
 */
const RESERVED_MEMBERS = [
  "type",
  "title",
  "status",
  "code",
  "detail",
  "requestId",
  "instance",
  "errors",
  "message",
  "error",
  "statusCode",
];

const UNSAFE_KEYS = ["__proto__", "constructor", "prototype"];

export function extensionMembers(
  source: Record<string, unknown>,
): Record<string, unknown> {
  const members: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    if (RESERVED_MEMBERS.includes(key) || UNSAFE_KEYS.includes(key)) continue;
    members[key] = value;
  }
  return members;
}

export function problemBody(input: ProblemInput) {
  return {
    // Extension members first and filtered through the reserved set, so an
    // extras object can never overwrite the error identity below it.
    ...(input.extensions ? extensionMembers(input.extensions) : {}),
    type: `https://api.baranda.local/errors/${input.code.toLowerCase()}`,
    title: input.title,
    status: input.status,
    code: input.code,
    detail: input.detail,
    requestId: input.requestId,
    instance: input.instance,
    ...(input.errors ? { errors: input.errors } : {}),
  };
}
