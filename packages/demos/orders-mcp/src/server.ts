/**
 * orders-mcp — a fake MCP server for order management. Exercises the
 * buttons-as-follow-up-prompts pattern in transactional flows (cancel,
 * update), including a confirmation preset with suppressed feedback chrome.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  registerShowLens,
  registerPresets,
  registerLensSkillResource,
} from '@mcp-lens/sdk';
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

  registerShowLens(server);
  registerPresets(server, ORDER_PRESETS);
  registerLensSkillResource(server);

  return server;
}

// See the comment in shoes-mcp/server.ts: keep instructions short. The
// full lens skill is exposed via the skill://mcp-lens/show-lens resource.
const SERVER_INSTRUCTIONS = `orders-mcp — order management with MCP Lens for rich presentation.

Tools:
- list_orders, get_order: read catalog.
- cancel_order, update_shipping_address: mutations. cancel_order is DESTRUCTIVE — confirm with the user by showing a confirmation lens first; do not call cancel_order until the user's next message clearly confirms.
- show_lens, list_lens_presets, get_lens_preset: MCP Lens surface.

Before composing any lens, read the resource skill://mcp-lens/show-lens for the lens-authoring guide, then call list_lens_presets for this server's presentation precedents — they are organized around conversational moments (user asked about an order, user is browsing, user asked to cancel).`;
