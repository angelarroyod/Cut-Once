import { describe, expect, it } from 'vitest';
import { shoeRack } from './shoe-rack.ts';
import { nest } from '../nesting.ts';
import { overlappingBoxes } from './testing.ts';
import { FIBRACEL_3 } from '../stock.ts';
import type { Design, TemplateParams, ValidationIssue } from '../types.ts';

function designOf(params: TemplateParams = {}): Design {
  const result = shoeRack.generate(params);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.design;
}

function issuesOf(params: TemplateParams): ValidationIssue[] {
  const result = shoeRack.generate(params);
  if (result.ok) throw new Error('expected validation issues');
  return result.issues;
}

const qty = (d: Design, type: string, size?: string) =>
  d.hardware.filter((h) => h.type === type && (size === undefined || h.size === size)).reduce((n, h) => n + h.qty, 0);

describe('shoe rack', () => {
  it('builds the default: a case on a zoclo with 3 shelves, a pair of doors and a vented back', () => {
    const d = designOf();
    expect(d.panels.map((p) => [p.id, p.length, p.width, p.qty])).toEqual([
      ['side', 900, 317, 2],
      ['top', 764, 317, 1],
      ['bottom', 764, 317, 1],
      ['plinth', 764, 70, 1],
      ['shelf', 764, 317, 3],
      ['door', 826, 396, 2],
      ['back', 800, 800, 1],
    ]);
    expect(d.panels.find((p) => p.id === 'back')!.stock).toBe(FIBRACEL_3);
    expect(d.boring.length).toBeGreaterThan(0);
  });

  it('spaces the shelves evenly between the Base and the Tapa', () => {
    const shelves = designOf().placements.filter((p) => p.panelId === 'shelf').map((p) => p.position[1]);
    // gap = (900 − 70 − 36 − 54) / 4 = 185, centres 18/2 above each underside
    [282, 485, 688].forEach((y, i) => expect(shelves[i]).toBeCloseTo(y, 6));
  });

  it('leaves the top 100 mm of the back open', () => {
    const back = designOf().placements.find((p) => p.panelId === 'back')!;
    expect(back.position[1] + back.size[1] / 2).toBe(800);
  });

  it('buys the case screws and hinges', () => {
    const d = designOf();
    expect(qty(d, 'confirmat', '5x50')).toBe(22); // (3 + 2)·4 + zoclo 2
    expect(qty(d, 'screw', '3.5x16')).toBe(24); // ⌈(800 + 1600)/200⌉ + 3·⌈764/200⌉ = 12 + 12
    expect(qty(d, 'hinge')).toBe(4);
    expect(qty(d, 'handle')).toBe(2);
  });

  it('is fixed to the wall only from 1200 mm tall', () => {
    expect(qty(designOf({ height: 1190 }), 'bracket')).toBe(0);
    const tall = designOf({ height: 1200 });
    expect(qty(tall, 'bracket')).toBe(2);
    expect(tall.steps.map((s) => s.title)).toContain('Fija la zapatera al muro');
  });

  it('drops the doors and their parts', () => {
    const d = designOf({ doors: 0 });
    expect(d.panels.some((p) => p.id === 'door')).toBe(false);
    expect(d.boring).toEqual([]);
    expect(d.fittings).toEqual([]);
    expect(qty(d, 'hinge')).toBe(0);
  });

  it('keeps every part apart and fits every sheet across its range', () => {
    const cases: TemplateParams[] = [
      {},
      { doors: 0 },
      { doors: 1, width: 600 },
      { width: 500, height: 450, depth: 300, shelfCount: 1, doors: 2 },
      { width: 830, height: 1400, depth: 400, shelfCount: 6, doors: 2, material: 3 },
    ];
    for (const params of cases) {
      const d = designOf(params);
      expect(overlappingBoxes(d)).toEqual([]);
      expect(() => nest(d.panels)).not.toThrow();
    }
  });

  it('rejects shelves too close for a pair of shoes', () => {
    const [issue] = issuesOf({ height: 600, shelfCount: 3 });
    expect(issue!.paramKey).toBe('shelfCount');
    expect(issue!.message).toContain('150 mm');
  });

  it('rejects a shelf span the board cannot carry', () => {
    expect(issuesOf({ width: 800, material: 2, doors: 0 })[0]!.paramKey).toBe('width');
  });

  it('rejects a single door that is too wide and doors on a 12 mm board', () => {
    expect(issuesOf({ doors: 1, width: 800 })[0]!.paramKey).toBe('doors');
    expect(issuesOf({ material: 1, width: 500 })).toEqual([expect.objectContaining({ paramKey: 'material' })]);
    expect(designOf({ material: 1, width: 500, doors: 0 }).templateId).toBe('shoe-rack');
  });
});
