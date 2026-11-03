import { describe, expect, it } from 'vitest';
import { bedBase } from './bed-base.ts';
import { nest } from '../nesting.ts';
import { drawerBoxClearance, overlappingBoxes } from './testing.ts';
import type { Design, TemplateParams, ValidationIssue } from '../types.ts';

function designOf(params: TemplateParams = {}): Design {
  const result = bedBase.generate(params);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.design;
}

function issuesOf(params: TemplateParams): ValidationIssue[] {
  const result = bedBase.generate(params);
  if (result.ok) throw new Error('expected validation issues');
  return result.issues;
}

const panel = (d: Design, id: string) => d.panels.find((p) => p.id === id)!;
const qty = (d: Design, type: string, size: string) => d.hardware.find((h) => h.type === type && h.size === size)?.qty;

describe('bed base', () => {
  it('sizes itself from the mattress', () => {
    for (const [mattress, W, L] of [
      [1, 1000, 1900],
      [2, 1350, 1900],
      [3, 1500, 2000],
      [4, 1900, 2000],
    ] as const) {
      const d = designOf({ mattress });
      expect(panel(d, 'side').length).toBe(L);
      expect(panel(d, 'deck').length).toBe(W - 36);
    }
  });

  it('builds without drawers: a foot rail, a full spine and 4 strips on 3 pairs of ribs', () => {
    const d = designOf({ drawers: 0 });
    expect(d.panels.map((p) => [p.id, p.length, p.width, p.qty])).toEqual([
      ['side', 1900, 400, 2],
      ['head-rail', 1314, 382, 1],
      ['foot-rail', 1314, 382, 1],
      ['spine', 1864, 382, 1],
      ['rib', 648, 80, 6],
      ['deck', 1314, 475, 4],
    ]);
    expect(d.fittings).toEqual([]);
  });

  it('swaps the foot rail for two drawers under front rails', () => {
    const d = designOf();
    expect(d.panels.some((p) => p.id === 'foot-rail')).toBe(false);
    expect(panel(d, 'spine').length).toBe(1882); // runs to the foot
    expect(panel(d, 'deck-foot').width).toBe(439); // the drawer zone plus half a rib
    expect(panel(d, 'front-rail').qty).toBe(2);
    expect(panel(d, 'drawer-front').qty).toBe(2);
    expect(qty(d, 'slide', '16" (406 mm)')).toBe(2);
  });

  it('never leaves a deck strip over 600 mm, or over the stock span', () => {
    for (const mattress of [1, 2, 3, 4]) {
      for (const drawers of [0, 1]) {
        expect(panel(designOf({ mattress, drawers }), 'deck').width).toBeLessThanOrEqual(600);
        expect(panel(designOf({ mattress, drawers, material: 4 }), 'deck').width).toBeLessThanOrEqual(550);
      }
    }
  });

  it('counts its screws', () => {
    const d = designOf({ drawers: 0 });
    // head 4, spine 2 + 2, foot 4, ribs 2·6, deck ends 4·4
    expect(qty(d, 'confirmat', '5x50')).toBe(40);
    // ⌈1864/300⌉ + (head, foot, 3 seams)·⌈1314/300⌉ = 7 + 5·5
    expect(qty(d, 'screw', '3.5x40')).toBe(32);
  });

  it('keeps every part apart and fits every sheet, across mattresses, heights and materials', () => {
    for (const mattress of [1, 2, 3, 4]) {
      for (const drawers of [0, 1]) {
        for (const params of [{ height: 300 }, { height: 500, material: 2 }, { height: 400, material: 4 }] as TemplateParams[]) {
          const d = designOf({ mattress, drawers, ...params });
          expect(overlappingBoxes(d)).toEqual([]);
          expect(() => nest(d.panels)).not.toThrow();
        }
      }
    }
  });

  it('keeps the drawer boxes clear of the Base', () => {
    expect(drawerBoxClearance(designOf({ height: 300 }))).toBeGreaterThanOrEqual(10);
  });

  it('keeps the drawer zone free of ribs', () => {
    const d = designOf();
    const rib = Math.max(...d.placements.filter((p) => p.panelId === 'rib').map((p) => p.position[2] + p.size[2] / 2));
    expect(rib).toBeLessThanOrEqual(1900 / 2 - 430);
  });

  it('rejects a 12 mm board', () => {
    expect(issuesOf({ material: 1 })).toEqual([expect.objectContaining({ paramKey: 'material' })]);
  });

  it('only talks about drawers when it has them', () => {
    expect(designOf().steps.map((s) => s.title)).toContain('Arma el hueco de los cajones');
    expect(designOf({ drawers: 0 }).steps.map((s) => s.title)).not.toContain('Arma el hueco de los cajones');
  });
});
