import http from "node:http";
import { NextRequest } from "next/server";

type Handler = (req: NextRequest) => Promise<Response>;

/**
 * Adapts a Next.js route handler to a plain Node http server so Supertest
 * can fire real HTTP requests (including concurrent ones) at it without
 * booting the full Next.js runtime.
 */
export function toServer(handler: Handler): http.Server {
  return http.createServer(async (nodeReq, nodeRes) => {
    const chunks: Buffer[] = [];
    for await (const chunk of nodeReq) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks);

    const headers = new Headers();
    for (const [key, value] of Object.entries(nodeReq.headers)) {
      if (typeof value === "string") headers.set(key, value);
    }

    const req = new NextRequest(`http://localhost${nodeReq.url}`, {
      method: nodeReq.method,
      headers,
      body: body.length > 0 ? body : undefined,
    });

    try {
      const res = await handler(req);
      nodeRes.writeHead(res.status, Object.fromEntries(res.headers));
      nodeRes.end(Buffer.from(await res.arrayBuffer()));
    } catch (error) {
      nodeRes.writeHead(500, { "content-type": "application/json" });
      nodeRes.end(JSON.stringify({ error: String(error) }));
    }
  });
}
