import type { FastifyInstance } from "fastify";

export function registerRequestId(fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
}
