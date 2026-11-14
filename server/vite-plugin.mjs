import { createApiHandler } from "./api.mjs";
import { createGeminiGenerator } from "./gemini.mjs";

/** Mounts the same server-side assistant endpoint used by the production server. */
export function assistantApiPlugin() {
  const handler = createApiHandler({ generate: createGeminiGenerator() });
  return {
    name: "psi-assistant-api",
    configureServer(server) {
      server.middlewares.use("/api/assistant", (req, res) => {
        handler(req, res).catch(() => {
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
            res.end(
              JSON.stringify({
                error: {
                  code: "server_error",
                  message: "Something went wrong. Please try again.",
                  retryable: true,
                },
              }),
            );
          } else {
            res.end();
          }
        });
      });
    },
  };
}
