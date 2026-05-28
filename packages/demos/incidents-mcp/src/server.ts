/**
 * incidents-mcp — a fake MCP server for incident management.
 *
 * Exercises moment-shaped lens presets across two related domains:
 * accounts and incidents. Designed against the SPA-style incident
 * dashboard anti-pattern (tabs, six-tile metrics grid, full timeline
 * inline) — every preset breaks that into a focused chat-surface
 * moment instead.
 *
 * Read-only by design — the demo emphasises preset richness, not the
 * preference loop. Phase 0 of MCP UI Apps in Slack also gates writes
 * — keeping every tool read-only ensures every tool surfaces.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerShowLens } from '@mcp-lens/sdk';
import {
  getAccount,
  getIncident,
  getIncidentContributors,
  getIncidentImpact,
  getIncidentTimeline,
  listAccounts,
  listIncidents,
} from './data.js';
import { INCIDENT_PRESETS } from './presets.js';

const READ_ONLY = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function createIncidentsServer(): McpServer {
  const server = new McpServer(
    { name: 'incidents-mcp', version: '0.1.0' },
    {
      capabilities: { tools: {}, resources: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // ── Account tools ───────────────────────────────────────────────────────

  server.registerTool(
    'list_accounts',
    {
      title: 'List accounts',
      description:
        'List the customer accounts on this server. Returns id, name, tier, and region for each. Use get_account for the full record. After fetching, render via show_lens using the user-is-browsing-accounts preset.',
      annotations: READ_ONLY,
    },
    async () => {
      const accounts = listAccounts();
      return {
        content: [
          {
            type: 'text' as const,
            text: accounts
              .map((a) => `- ${a.id}: ${a.name} (${a.tier}, ${a.region})`)
              .join('\n'),
          },
        ],
        structuredContent: { accounts },
      };
    },
  );

  server.registerTool(
    'get_account',
    {
      title: 'Get account',
      description:
        'Fetch full details for a single account by id (tier, region, primary contact, summary). Use this before composing a lens about an account. After fetching, render via show_lens using the user-asked-about-an-account preset.',
      inputSchema: { id: z.string().describe('The account id, e.g. acct-globex.') },
      annotations: READ_ONLY,
    },
    async ({ id }) => {
      const account = getAccount(id);
      if (!account) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `No account with id "${id}". Try list_accounts to discover valid ids.`,
            },
          ],
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(account, null, 2) }],
        structuredContent: { ...account },
      };
    },
  );

  // ── Incident tools ──────────────────────────────────────────────────────

  server.registerTool(
    'list_incidents',
    {
      title: 'List incidents',
      description:
        'List incidents, optionally filtered by accountId, severity (sev0..sev3), or status (open / mitigated / resolved). Returns incident summaries newest-first. After fetching, render via show_lens using the user-is-browsing-incidents preset — and if the list is scoped to an account, combine with a compact user-asked-about-an-account header above the list.',
      inputSchema: {
        accountId: z
          .string()
          .optional()
          .describe('Filter to incidents that touched this account.'),
        severity: z
          .enum(['sev0', 'sev1', 'sev2', 'sev3'])
          .optional()
          .describe('Filter by severity.'),
        status: z
          .enum(['open', 'mitigated', 'resolved'])
          .optional()
          .describe('Filter by status.'),
      },
      annotations: READ_ONLY,
    },
    async ({ accountId, severity, status }) => {
      const incidents = listIncidents({ accountId, severity, status });
      return {
        content: [
          {
            type: 'text' as const,
            text:
              incidents.length === 0
                ? 'No incidents match those filters.'
                : incidents
                    .map(
                      (i) => `- ${i.id} · ${i.severity} · ${i.status} · ${i.title}`,
                    )
                    .join('\n'),
          },
        ],
        structuredContent: { incidents },
      };
    },
  );

  server.registerTool(
    'get_incident',
    {
      title: 'Get incident',
      description:
        'Fetch full details for a single incident by id (severity, status, IC, summary, impact KPIs, and which accounts it touches). After fetching, render via show_lens using the user-asked-about-an-incident preset — keep the summary card focused; impact / timeline / contributors are SEPARATE moments rendered by separate presets when the user clicks in.',
      inputSchema: {
        id: z.string().describe('The incident id, e.g. INC-52790.'),
      },
      annotations: READ_ONLY,
    },
    async ({ id }) => {
      const incident = getIncident(id);
      if (!incident) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `No incident with id "${id}". Try list_incidents to discover valid ids.`,
            },
          ],
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(incident, null, 2) }],
        structuredContent: { ...incident },
      };
    },
  );

  server.registerTool(
    'get_incident_timeline',
    {
      title: 'Get incident timeline',
      description:
        'Fetch the timeline (chronological events) for a specific incident. Returns events newest-first. Use `limit` (default 5) to cap the count for chat-surface rendering — the user-asked-about-incident-timeline preset shows 5 by default and offers a "Show full history" follow-up to fetch the rest. Filter by `type` (Impact / Recovery / Action / RootCauseLead / Update) if the user asked for a specific kind.',
      inputSchema: {
        incidentId: z.string(),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Cap on number of events. Default: 5 for chat surfaces.'),
        type: z
          .enum(['Impact', 'Recovery', 'Action', 'RootCauseLead', 'Update'])
          .optional()
          .describe('Filter to a single event type.'),
      },
      annotations: READ_ONLY,
    },
    async ({ incidentId, limit, type }) => {
      const incident = getIncident(incidentId);
      if (!incident) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `No incident with id "${incidentId}".`,
            },
          ],
        };
      }
      const events = getIncidentTimeline(incidentId, {
        limit: limit ?? 5,
        type,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text:
              events.length === 0
                ? 'No timeline events match.'
                : events
                    .map((e) => `- ${e.at} [${e.type}] ${e.author}: ${e.text}`)
                    .join('\n'),
          },
        ],
        structuredContent: {
          incidentId,
          events,
          // The total count regardless of `limit`, so the renderer can
          // decide whether to surface "Show full history".
          totalEvents: getIncidentTimeline(incidentId, { type }).length,
        },
      };
    },
  );

  server.registerTool(
    'get_incident_impact',
    {
      title: 'Get incident impact',
      description:
        "Fetch the impact KPIs for a specific incident (customers affected, users impacted, tickets opened, plus domain-specific metrics). After fetching, render via show_lens using the user-asked-about-incident-impact preset — choose 3–4 of the most decision-relevant KPIs, NOT all of them; six-tile dashboards are an SPA anti-pattern in chat surfaces.",
      inputSchema: { incidentId: z.string() },
      annotations: READ_ONLY,
    },
    async ({ incidentId }) => {
      const impact = getIncidentImpact(incidentId);
      if (!impact) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `No incident with id "${incidentId}".`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: impact.kpis
              .map((k) => `- ${k.label}: ${k.value}`)
              .join('\n'),
          },
        ],
        structuredContent: { ...impact },
      };
    },
  );

  server.registerTool(
    'get_incident_contributors',
    {
      title: 'Get incident contributors',
      description:
        "Fetch the people involved in a specific incident — the IC plus everyone who's authored timeline events. Returns names with role tags (IC / Author) and event counts. After fetching, render via show_lens using the user-asked-about-incident-contributors preset.",
      inputSchema: { incidentId: z.string() },
      annotations: READ_ONLY,
    },
    async ({ incidentId }) => {
      const incident = getIncident(incidentId);
      if (!incident) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `No incident with id "${incidentId}".`,
            },
          ],
        };
      }
      const contributors = getIncidentContributors(incidentId);
      return {
        content: [
          {
            type: 'text' as const,
            text: contributors
              .map(
                (c) =>
                  `- ${c.name} [${c.roles.join(', ')}] · ${c.eventCount} updates`,
              )
              .join('\n'),
          },
        ],
        structuredContent: { incidentId, contributors },
      };
    },
  );

  // ── MCP Lens wiring ─────────────────────────────────────────────────────

  registerShowLens(server, { presets: INCIDENT_PRESETS });

  return server;
}

// Short orientation paragraph. The full spec reference is delivered
// via the get_lens_guide tool at the agent's first call.
const SERVER_INSTRUCTIONS = `incidents-mcp — incident management with MCP Lens for rich presentation.

Tools (all read-only):
- list_accounts, get_account, list_incidents, get_incident: query data.
- get_incident_timeline, get_incident_impact, get_incident_contributors: drill into one incident.
- get_lens_guide: call FIRST — returns spec reference + preset index.
- get_lens_preset(name): fetch a preset's full body.
- show_lens(spec, description): render a lens.

Workflow: get_lens_guide → get_lens_preset → show_lens. Presets are organized by conversational moment (user asked about an account, user is browsing incidents, user asked about incident impact, etc.). Combine presets when the intent spans both an account and its incidents.`;
