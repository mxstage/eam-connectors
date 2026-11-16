// A minimal HTTP harness around handleMaximoProxy (MX Stage tests the same relay through its whole bridge server).
import { createServer, request as httpRequest, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { handleMaximoProxy, type MaximoProxyOptions } from "../src/node/mx.ts";

export interface TestBridge {
  port: number;
  server: Server;
}

const running: Server[] = [];

export interface TestBridgeOptions extends Partial<MaximoProxyOptions> {
  upstreamTimeoutMs?: number;
}

export async function startTestBridge(opts: TestBridgeOptions = {}): Promise<TestBridge> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (!url.pathname.startsWith("/mx/")) {
      res.writeHead(404).end();
      return;
    }
    handleMaximoProxy(req, res, url, {
      allowedHosts: opts.allowedHosts ?? [],
      insecure: opts.insecure ?? false,
      requestImpl: opts.requestImpl,
      timeoutMs: opts.upstreamTimeoutMs ?? opts.timeoutMs,
      saved: opts.saved,
      writeGuard: opts.writeGuard,
      isReservedHost: opts.isReservedHost,
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  running.push(server);
  return { port: (server.address() as AddressInfo).port, server };
}

export async function stopAll(): Promise<void> {
  for (const s of running.splice(0)) {
    s.closeAllConnections();
    await new Promise<void>((done) => s.close(() => done()));
  }
}

export interface RawResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

export function rawRequest(bridge: TestBridge, path: string, opts: { method?: string; headers?: Record<string, string>; body?: string | Buffer } = {}): Promise<RawResponse> {
  return new Promise((done, failed) => {
    const req = httpRequest(
      { host: "127.0.0.1", port: bridge.port, path, method: opts.method ?? "GET", headers: { host: `127.0.0.1:${bridge.port}`, ...opts.headers } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => done({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
      },
    );
    req.on("error", failed);
    if (opts.body !== undefined) req.write(opts.body);
    req.end();
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

export async function waitFor(cond: () => boolean | Promise<boolean>, timeoutMs = 3_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    if (await cond()) return;
    if (Date.now() > until) throw new Error("条件が時間内に満たされませんでした");
    await sleep(5);
  }
}
