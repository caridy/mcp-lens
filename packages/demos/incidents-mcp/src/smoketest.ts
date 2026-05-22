/**
 * Smoke test for incidents-mcp. Exercises every read tool plus a
 * representative show_lens call demonstrating preset combination
 * (account header + incidents list).
 */

import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { LENS_SPEC_VERSION } from '@mcp-lens/sdk';
import { createIncidentsServer } from './server.js';

async function main() {
  const server = createIncidentsServer();
  const client = new Client({ name: 'smoke', version: '0' }, { capabilities: {} });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);

  console.log('─── tools ───');
  const tools = await client.listTools();
  for (const t of tools.tools) console.log(`  ${t.name}`);

  console.log('\n─── list_accounts ───');
  const accounts = await client.callTool({ name: 'list_accounts', arguments: {} });
  const accountList = (accounts.structuredContent as { accounts: { id: string; name: string }[] }).accounts;
  console.log(`  ${accountList.length} accounts:`, accountList.map((a) => a.name).join(', '));

  console.log('\n─── get_account (acct-globex) ───');
  const account = await client.callTool({
    name: 'get_account',
    arguments: { id: 'acct-globex' },
  });
  console.log('  name:', (account.structuredContent as { name: string }).name);
  console.log('  tier:', (account.structuredContent as { tier: string }).tier);

  console.log('\n─── list_incidents ───');
  const incs = await client.callTool({ name: 'list_incidents', arguments: {} });
  const incList = (incs.structuredContent as { incidents: { id: string; severity: string; status: string }[] }).incidents;
  console.log(`  ${incList.length} incidents`);
  for (const i of incList) console.log(`    ${i.id} ${i.severity} ${i.status}`);

  console.log('\n─── list_incidents (filter: accountId=acct-globex) ───');
  const globexIncs = await client.callTool({
    name: 'list_incidents',
    arguments: { accountId: 'acct-globex' },
  });
  const globexList = (globexIncs.structuredContent as { incidents: { id: string }[] }).incidents;
  console.log(`  ${globexList.length} incidents touch Globex:`, globexList.map((i) => i.id).join(', '));

  console.log('\n─── get_incident (INC-52790) ───');
  const inc = await client.callTool({
    name: 'get_incident',
    arguments: { id: 'INC-52790' },
  });
  const incDetail = inc.structuredContent as {
    id: string;
    severity: string;
    status: string;
    impact: unknown[];
  };
  console.log('  id:', incDetail.id);
  console.log('  severity / status:', incDetail.severity, '/', incDetail.status);
  console.log('  impact KPIs:', incDetail.impact.length);

  console.log('\n─── get_incident_timeline (INC-52790, default limit=5) ───');
  const timeline = await client.callTool({
    name: 'get_incident_timeline',
    arguments: { incidentId: 'INC-52790' },
  });
  const tl = timeline.structuredContent as {
    events: { type: string; at: string; text: string }[];
    totalEvents: number;
  };
  console.log(`  ${tl.events.length} of ${tl.totalEvents} events returned`);
  for (const e of tl.events.slice(0, 3)) {
    console.log(`    [${e.type}] ${e.at}: ${e.text.slice(0, 60)}…`);
  }

  console.log('\n─── get_incident_impact (INC-52790) ───');
  const impact = await client.callTool({
    name: 'get_incident_impact',
    arguments: { incidentId: 'INC-52790' },
  });
  const im = impact.structuredContent as { kpis: { label: string; value: string }[] };
  console.log(`  ${im.kpis.length} KPIs`);
  for (const k of im.kpis) console.log(`    ${k.label}: ${k.value}`);

  console.log('\n─── get_incident_contributors (INC-52790) ───');
  const contribs = await client.callTool({
    name: 'get_incident_contributors',
    arguments: { incidentId: 'INC-52790' },
  });
  const cl = contribs.structuredContent as {
    contributors: { name: string; roles: string[]; eventCount: number }[];
  };
  console.log(`  ${cl.contributors.length} contributors`);
  for (const c of cl.contributors) {
    console.log(`    ${c.name} [${c.roles.join(', ')}] ${c.eventCount} updates`);
  }

  console.log('\n─── list_lens_presets ───');
  const presets = await client.callTool({
    name: 'list_lens_presets',
    arguments: {},
  });
  const pl = presets.structuredContent as { presets: { name: string }[] };
  console.log(`  ${pl.presets.length} presets`);
  for (const p of pl.presets) console.log(`    ${p.name}`);

  console.log('\n─── show_lens (combined account header + incidents list) ───');
  const lens = await client.callTool({
    name: 'show_lens',
    arguments: {
      spec: {
        specVersion: LENS_SPEC_VERSION,
        root: {
          type: 'column',
          gap: 'md',
          children: [
            {
              type: 'card',
              title: 'Globex',
              subtitle: 'enterprise · NA-East',
              children: [
                {
                  type: 'row',
                  gap: 'sm',
                  justify: 'end',
                  children: [
                    {
                      type: 'button',
                      label: 'Show account details',
                      prompt: 'Show me details for Globex.',
                      variant: 'ghost',
                    },
                  ],
                },
              ],
            },
            {
              type: 'list',
              divider: 'line',
              items: [
                {
                  type: 'row',
                  align: 'center',
                  justify: 'space-between',
                  children: [
                    {
                      type: 'column',
                      gap: 'xs',
                      children: [
                        {
                          type: 'text',
                          text: 'INC-52790 — EKM 500 errors / EKM latency',
                          variant: 'heading',
                        },
                        {
                          type: 'row',
                          gap: 'sm',
                          align: 'center',
                          children: [
                            { type: 'badge', label: 'sev1', tone: 'warning' },
                            { type: 'badge', label: 'Mitigated', tone: 'info' },
                            { type: 'text', text: 'opened May 8', variant: 'caption' },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'button',
                      label: 'Details',
                      prompt: 'Show details for incident INC-52790.',
                      variant: 'secondary',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      description:
        'Combined account+incidents lens for Globex: a compact account header card on top with a "Show account details" follow-up, then a list of incidents touching that account with a per-row Details button.',
    },
  });
  console.log(
    '  widgetDescription:',
    lens._meta?.['openai/widgetDescription'],
  );
  console.log(
    '  ui resource:',
    (lens._meta?.ui as { resourceUri: string } | undefined)?.resourceUri,
  );

  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
