import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { getLensSkill, LENS_SKILL_URI, registerLensSkillResource } from './skill.js';

describe('getLensSkill', () => {
  it('returns a markdown document', () => {
    const skill = getLensSkill();
    expect(skill.length).toBeGreaterThan(1000);
    expect(skill).toMatch(/MCP Lens/);
    expect(skill).toMatch(/show_lens/);
  });

  it('mentions key concepts from the design', () => {
    const skill = getLensSkill();
    // Key vocabulary the agent must understand.
    expect(skill).toMatch(/specVersion/);
    expect(skill).toMatch(/description/);
    expect(skill).toMatch(/follow-up prompt/i);
    // Memorialization is server-defined now — the skill describes the
    // discovery flow ("read tool descriptions, names vary") rather than
    // hard-coding `memorialize_lens`.
    expect(skill).toMatch(/star/i);
    expect(skill).toMatch(/list_lens_presets/);
    expect(skill).toMatch(/comparison/);
  });

  it('frames lenses as next-turn suggestion surfaces', () => {
    // Regression for the moment-shaped reframe (2026-05-10). The skill must
    // teach the agent that a lens is a *suggestion surface for the user's
    // next turn*, not just "render the data nicely."
    const skill = getLensSkill();
    expect(skill).toMatch(/next turn/i);
    expect(skill).toMatch(/affordance/i);
    // The 2-4 affordance rule is the new core invariant.
    expect(skill).toMatch(/2[–-]4/);
  });

  it('explicitly calls out per-row buttons in lists', () => {
    // The most observable failure mode pre-reframe was lists without
    // per-row follow-up buttons — forcing the user to type each
    // drill-down. The skill must explicitly tell the agent to put
    // buttons on every list row.
    const skill = getLensSkill();
    expect(skill).toMatch(/per[- ]row/i);
    expect(skill).toMatch(/list/i);
  });

  it('cached instance is referentially identical', () => {
    const a = getLensSkill();
    const b = getLensSkill();
    expect(a).toBe(b);
  });
});

describe('registerLensSkillResource', () => {
  it('exposes the skill as an MCP resource', async () => {
    const server = new McpServer(
      { name: 'test-server', version: '0.0.0' },
      { capabilities: { resources: {} } },
    );
    registerLensSkillResource(server);
    const client = new Client(
      { name: 'test-client', version: '0.0.0' },
      { capabilities: {} },
    );
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(st), client.connect(ct)]);
    const list = await client.listResources();
    expect(list.resources.map((r) => r.uri)).toContain(LENS_SKILL_URI);
    const read = await client.readResource({ uri: LENS_SKILL_URI });
    expect(read.contents[0]?.mimeType).toBe('text/markdown');
    expect((read.contents[0]?.text as string)).toMatch(/MCP Lens/);
  });
});
