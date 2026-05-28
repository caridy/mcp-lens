/**
 * orders-mcp — a fake MCP server for order management. Exercises the
 * buttons-as-follow-up-prompts pattern in transactional flows (cancel,
 * update), including a confirmation preset with suppressed feedback chrome.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerShowLens } from '@mcp-lens/sdk';
import {
  cancelOrder,
  getOrder,
  listOrders,
  updateShippingAddress,
} from './data.js';
import { ORDER_PRESETS } from './presets.js';

export function createOrdersServer(): McpServer {
  const server = new McpServer(
    { name: 'orders-mcp', version: '0.1.0' },
    {
      capabilities: { tools: {}, resources: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // ── Domain tools ────────────────────────────────────────────────────────

  server.registerTool(
    'list_orders',
    {
      title: 'List orders',
      description:
        'List orders for the authenticated user, optionally filtered by status. Returns order summaries; use get_order for full detail.',
      inputSchema: {
        status: z
          .enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
          .optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ status }) => {
      const orders = listOrders(status ? { status } : {});
      return {
        content: [
          {
            type: 'text' as const,
            text:
              orders.length === 0
                ? 'No orders.'
                : orders
                    .map(
                      (o) =>
                        `- ${o.id} · ${o.status} · $${o.totalUsd.toFixed(2)}`,
                    )
                    .join('\n'),
          },
        ],
        structuredContent: { orders },
      };
    },
  );

  server.registerTool(
    'get_order',
    {
      title: 'Get order',
      description:
        'Fetch full details for a single order by id. Returns line items, total, shipping address, and status.',
      inputSchema: { id: z.string() },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      const order = getOrder(id);
      if (!order) {
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: `No order with id "${id}".` },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(order, null, 2),
          },
        ],
        structuredContent: { ...order },
      };
    },
  );

  server.registerTool(
    'cancel_order',
    {
      title: 'Cancel order',
      description:
        "Cancel an order that hasn't shipped yet. DESTRUCTIVE — confirm with the user first before calling. Returns the updated order on success, or an error if cancellation is not allowed.",
      inputSchema: { id: z.string() },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      const result = cancelOrder(id);
      if (!result.ok) {
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: result.reason },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: `Order ${result.order.id} cancelled.`,
          },
        ],
        structuredContent: { ...result.order },
      };
    },
  );

  server.registerTool(
    'update_shipping_address',
    {
      title: 'Update shipping address',
      description:
        'Update the shipping address on an order that has not yet shipped. Returns the updated order on success.',
      inputSchema: {
        id: z.string(),
        address: z.string().min(1),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, address }) => {
      const result = updateShippingAddress(id, address);
      if (!result.ok) {
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: result.reason },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: `Shipping address updated for ${result.order.id}.`,
          },
        ],
        structuredContent: { ...result.order },
      };
    },
  );

  // ── MCP Lens wiring ─────────────────────────────────────────────────────

  registerShowLens(server, { presets: ORDER_PRESETS });

  return server;
}

// Keep instructions short. The full spec reference is delivered via get_lens_guide.
const SERVER_INSTRUCTIONS = `orders-mcp — order management with MCP Lens for rich presentation.

Tools:
- list_orders, get_order: read catalog.
- cancel_order, update_shipping_address: mutations. cancel_order is DESTRUCTIVE — confirm with the user by showing a confirmation lens first; do not call cancel_order until the user's next message clearly confirms.
- get_lens_guide: call FIRST — returns spec reference + preset index.
- get_lens_preset(name): fetch a preset's full body.
- show_lens(spec, description): render a lens.

Workflow: get_lens_guide → get_lens_preset → show_lens. Presets are organized around conversational moments (user asked about an order, user is browsing, user asked to cancel).`;
