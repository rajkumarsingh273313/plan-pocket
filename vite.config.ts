// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
    // tr46 (via mongodb) does require("punycode/"); unenv's alias turns it into an invalid path.
    alias: { "punycode/": "punycode/punycode.js" },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      // tr46 (via mongodb) does require("punycode/"); the trailing slash breaks unenv's alias.
      alias: [{ find: /^punycode\/$/, replacement: "punycode/punycode.js" }],
    },
    plugins: [
      {
        name: "api-dev-middleware",
        apply: "serve",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith("/api/")) return next();
            try {
              const { handleApiRequest } = await server.ssrLoadModule("/src/server/api-handler.ts");
              const protocol = req.headers["x-forwarded-proto"] || "http";
              const host = req.headers.host || "localhost:8080";
              const url = `${protocol}://${host}${req.url}`;

              const chunks: Uint8Array[] = [];
              req.on("data", (chunk: Uint8Array) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
                  const webRequest = new Request(url, {
                    method: req.method,
                    headers: req.headers as unknown as HeadersInit,
                    body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
                  });

                  const webResponse: Response = await handleApiRequest(webRequest);
                  res.statusCode = webResponse.status;
                  webResponse.headers.forEach((val: string, key: string) => res.setHeader(key, val));
                  const resBody = await webResponse.arrayBuffer();
                  res.end(Buffer.from(resBody));
                } catch (e) {
                  next(e);
                }
              });
            } catch (err) {
              next(err);
            }
          });
        },
      },
    ],
  },
});
