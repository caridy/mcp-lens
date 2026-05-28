import { describe, it, expect } from 'vitest';
import { getLensSkill } from './skill.js';

describe('getLensSkill', () => {
  it('returns a markdown document with the spec reference', () => {
    const skill = getLensSkill();
    expect(skill.length).toBeGreaterThan(1000);
    expect(skill).toMatch(/MCP Lens/);
    expect(skill).toMatch(/show_lens/);
  });

  it('includes the node vocabulary table', () => {
    const skill = getLensSkill();
    expect(skill).toMatch(/Node vocabulary/i);
    expect(skill).toMatch(/column/);
    expect(skill).toMatch(/row/);
    expect(skill).toMatch(/card/);
    expect(skill).toMatch(/button/);
    expect(skill).toMatch(/table/);
    expect(skill).toMatch(/markdown/);
  });

  it('states the 2–4 affordance rule', () => {
    const skill = getLensSkill();
    expect(skill).toMatch(/2[–-]4/);
    expect(skill).toMatch(/affordance/i);
  });

  it('calls out per-row buttons in lists', () => {
    const skill = getLensSkill();
    expect(skill).toMatch(/per[- ]row/i);
  });

  it('mentions the star/chrome behavior', () => {
    const skill = getLensSkill();
    expect(skill).toMatch(/star/i);
  });

  it('cached instance is referentially identical', () => {
    const a = getLensSkill();
    const b = getLensSkill();
    expect(a).toBe(b);
  });
});
