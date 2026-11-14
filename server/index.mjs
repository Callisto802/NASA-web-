import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = path.join(rootDir, "dist");
const envPath = path.join(rootDir, ".env");

if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envPath);
  } catch {
    console.warn("[assistant] Could not load .env; set GEMINI_API_KEY in the environment instead.");
  }
}

const { createApiHandler } = await import("./api.mjs");
const { createGeminiGenerator } = await import("./gemini.mjs");

const apiHandler = createApiHandler({ generate: createGeminiGenerator() });

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  };
}

function safeFilePath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const full = path.resolve(distDir, relative);
  const rel = path.relative(distDir, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return full;
}

function sendFile(req, res, filePath) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    ...securityHeaders(),
    "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  };
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function sendText(res, status, message) {
  res.writeHead(status, {
    ...securityHeaders(),
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(message);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/api/assistant" || url.pathname === "/api/assistant/") {
    await apiHandler(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method not allowed");
    return;
  }

  if (!fs.existsSync(distDir)) {
    sendText(res, 503, "The app has not been built yet. Run `pnpm build` first.");
    return;
  }

  const filePath = safeFilePath(url.pathname);
  if (filePath && sendFile(req, res, filePath)) return;

  // SPA fallback for non-asset paths (hash routing is used, but this keeps deep links safe).
  if (!path.extname(url.pathname)) {
    const indexPath = path.join(distDir, "index.html");
    if (sendFile(req, res, indexPath)) return;
  }

  sendText(res, 404, "Not found");
});

const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || "127.0.0.1";

server.listen(port, host, () => {
  const configured = Boolean(process.env.GEMINI_API_KEY);
  console.log(`PSI Fire Safety Explorer server listening on http://${host}:${port}`);
  console.log(
    configured
      ? "Science assistant: configured (GEMINI_API_KEY is set server-side)."
      : "Science assistant: NOT configured. Set GEMINI_API_KEY in .env or the deployment environment.",
  );
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. If the site is already open, keep using it. To start another copy, set PORT=4174 and restart.`);
    process.exitCode = 1;
    return;
  }
  console.error(`The PSI Fire Safety Explorer server could not start: ${error?.message ?? "unknown error"}`);
  process.exitCode = 1;
});
