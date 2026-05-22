#!/usr/bin/env node
/**
 * HTTP entrypoint for incidents-mcp. Mirrors orders-mcp/src/http.ts —
 * one server per MCP session, keyed by the mcp-session-id header.
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createIncidentsServer } from './server.js';

const PORT = Number(process.env.PORT ?? 3004);

const transports = new Map<string, StreamableHTTPServerTransport>();

async function handleMcp(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: Buffer | null,
): Promise<void> {
  const sessionHeader = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;
  let transport = sessionId ? transports.get(sessionId) : undefined;
  if (!transport) {
    const newSessionId = randomUUID();
    const server = createIncidentsServer();
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
  await transport.handleRequest(
    req,
    res,
    body ? JSON.parse(body.toString()) : undefined,
  );
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Mcp-Session-Id, Authorization',
  );
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

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
      await handleMcp(req, res, null);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[incidents-mcp] request error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[incidents-mcp] listening on http://localhost:${PORT}/mcp`);
});
