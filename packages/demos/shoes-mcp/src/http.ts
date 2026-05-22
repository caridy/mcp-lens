#!/usr/bin/env node
/**
 * HTTP entrypoint — exposes shoes-mcp via streamable HTTP so ChatGPT Apps
 * and similar hosts can connect. Listens on PORT (default 3001).
 *
 * Endpoints:
 *   POST /mcp   — MCP JSON-RPC with streaming support (per MCP Streamable HTTP).
 *   GET /mcp    — the same endpoint for the server-sent events leg.
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createShoesServer } from './server.js';

const PORT = Number(process.env.PORT ?? 3001);

// One transport per session; keyed by mcp-session-id header.
const transports = new Map<string, StreamableHTTPServerTransport>();

async function handleMcp(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: Buffer | null,
): Promise<void> {
  const sessionHeader = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(sessionHeader)
    ? sessionHeader[0]
    : sessionHeader;

  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    // New session. Create server + transport on demand.
    const newSessionId = randomUUID();
    const server = createShoesServer();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
      onsessioninitialized: (id) => {
        transports.set(id, transport!);
      },
    });
    transport.onclose = () => {
      if (transport?.sessionId) transports.delete(transport.sessionId);
    };
    await server.connect(transport);
  }

  await transport.handleRequest(req, res, body ? JSON.parse(body.toString()) : undefined);
}

const server = http.createServer(async (req, res) => {
  // CORS for local development.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, DELETE, OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Mcp-Session-Id, Authorization',
  );
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Mcp-Session-Id',
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  if (!req.url || !req.url.startsWith('/mcp')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  try {
    if (req.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c);
      await handleMcp(req, res, Buffer.concat(chunks));
    } else {
      // GET / DELETE — no body.
      await handleMcp(req, res, null);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[shoes-mcp] request error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[shoes-mcp] listening on http://localhost:${PORT}/mcp`);
});
