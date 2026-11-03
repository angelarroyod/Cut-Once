import { describe, expect, it } from 'vitest';
import { floatingShelves } from './floating-shelves.ts';
import { nest } from '../nesting.ts';
import { overlappingBoxes } from './testing.ts';
import type { Design, TemplateParams } from '../types.ts';

function designOf(params: TemplateParams = {}): Design {
  const result = floatingShelves.generate(params);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.design;
}

describe('floating shelves', () => {
  it('builds each shelf from a Tapa, a Base, a front, 2 ends and a cleat', () => {
    expect(designOf().panels.map((p) => [p.id, p.length, p.width, p.qty])).toEqual([
      ['top', 800, 220, 3],
      ['bottom', 800, 220, 3],
      ['front', 764, 44, 3],
      ['end', 220, 44, 6],
      ['cleat', 760, 42, 3],
    ]);
  });

  it('stacks the shelves with the chosen clear height between them', () => {
    const d = designOf({ count: 2, spacing: 250 });
    const tops = d.placements.filter((p) => p.panelId === 'top').map((p) => p.position[1] + p.size[1] / 2);
    const bottoms = d.placements.filter((p) => p.panelId === 'bottom').map((p) => p.position[1] - p.size[1] / 2);
    expect(bottoms[1]! - tops[0]!).toBe(250);
  });

  it('leaves play around the cleat and keeps it against the wall', () => {
    const d = designOf();
    const cleat = d.placements.find((p) => p.panelId === 'cleat')!;
    expect(cleat.position[2] - cleat.size[2] / 2).toBe(-110);
    expect(cleat.size[0]).toBe(764 - 4);
    expect(cleat.size[1]).toBe(44 - 2);
  });

  it('buys screws and one more anchor than the cleat has 300 mm stretches', () => {
    expect(designOf({ count: 1 }).hardware).toEqual([
      { type: 'screw', size: '3.5x25', qty: 32 }, // 2 faces · (⌈800/150⌉ + 2·⌈220/150⌉ + ⌈800/150⌉) = 2·(6 + 4 + 6)
      { type: 'wall-anchor', size: '1/4"', qty: 4 },
    ]);
    expect(designOf({ count: 3 }).hardware[1]!.qty).toBe(12);
  });

  it('bands what shows and leaves the rest bare', () => {
    const d = designOf();
    const edges = (id: string) => d.panels.find((p) => p.id === id)!.edges;
    expect(edges('top')).toEqual({ L1: true, L2: false, A1: true, A2: true });
    expect(edges('end')).toEqual({ L1: false, L2: false, A1: true, A2: false });
    expect(edges('front')).toEqual({ L1: false, L2: false, A1: false, A2: false });
    expect(edges('cleat')).toEqual({ L1: false, L2: false, A1: false, A2: false });
  });

  it('keeps every part apart and fits every sheet across its range', () => {
    const cases: TemplateParams[] = [
      {},
      { width: 400, depth: 150, thickness: 70, count: 1 },
      { width: 1200, depth: 300, thickness: 120, count: 4, spacing: 500 },
      { thickness: 70, material: 1 },
      { thickness: 70, material: 3, spacing: 200 },
    ];
    for (const params of cases) {
      const d = designOf(params);
      expect(overlappingBoxes(d)).toEqual([]);
      expect(() => nest(d.panels)).not.toThrow();
    }
  });

  it('warns about drywall and about what the shelf can carry', () => {
    const text = designOf().steps.map((s) => s.description).join(' ');
    expect(text).toContain('tablaroca');
    expect(text).toContain('no te sientes');
  });

  it('speaks in the singular for one shelf', () => {
    const titles = designOf({ count: 1 }).steps.map((s) => s.title);
    expect(titles).toContain('Arma la caja');
    expect(titles).toContain('Monta la repisa');
    expect(designOf({ count: 2 }).steps.map((s) => s.title)).toContain('Monta las repisas');
  });
});
