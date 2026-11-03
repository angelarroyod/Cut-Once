import { describe, expect, it } from 'vitest';
import { desk } from './desk.ts';
import { drawerBoxClearance, overlappingBoxes } from './testing.ts';
import type { Design, TemplateParams, ValidationIssue } from '../types.ts';

function designOf(params: TemplateParams = {}): Design {
  const result = desk.generate(params);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.design;
}

function issuesOf(params: TemplateParams): ValidationIssue[] {
  const result = desk.generate(params);
  if (result.ok) throw new Error('expected validation issues');
  return result.issues;
}

const line = (d: Design, type: string, size: string) => d.hardware.find((h) => h.type === type && h.size === size)?.qty;

describe('desk', () => {
  it('builds the default: a top on two sides with a right-hand pedestal', () => {
    const d = designOf();
    expect(d.panels.slice(0, 8).map((p) => [p.id, p.length, p.width, p.qty])).toEqual([
      ['top', 1200, 600, 1],
      ['side', 732, 600, 2],
      ['rail', 746, 60, 1],
      ['modesty', 746, 350, 1],
      ['divider', 732, 600, 1],
      ['bay-top', 400, 600, 1],
      ['bottom', 400, 600, 1],
      ['plinth', 400, 70, 1],
    ]);
    const front = d.panels.find((p) => p.id === 'drawer-front')!;
    expect([front.length, front.width, front.qty]).toEqual([432, 318, 2]);
  });

  it('drops the pedestal without drawers and runs the rail side to side', () => {
    const d = designOf({ drawers: 0 });
    expect(d.panels.map((p) => p.id)).toEqual(['top', 'side', 'rail', 'modesty']);
    expect(d.panels.find((p) => p.id === 'rail')!.length).toBe(1164);
    expect(d.fittings).toEqual([]);
  });

  it('buys 2 brackets per knee wall plus one per 400 mm along the rail and the rear panel', () => {
    const d = designOf({ drawers: 0 });
    expect(line(d, 'bracket', '2" (50 mm)')).toBe(10); // 2·⌈1164/400⌉ + 4
    expect(line(d, 'screw', '3.5x13')).toBe(40);
    expect(line(d, 'confirmat', '5x50')).toBe(6);
    const withDrawers = designOf();
    expect(line(withDrawers, 'bracket', '2" (50 mm)')).toBe(8); // 2·⌈746/400⌉ + 4
    expect(line(withDrawers, 'confirmat', '5x50')).toBe(32); // 16 for the desk + 8 per drawer
  });

  it('keeps every part apart in 3D across its range', () => {
    const cases: TemplateParams[] = [{}, { drawers: 0 }, { drawers: 3, width: 1600, depth: 700 }, { drawers: 1, width: 1100, height: 720, depth: 450 }];
    for (const params of cases) {
      expect(overlappingBoxes(designOf(params))).toEqual([]);
    }
  });

  it('keeps the drawer boxes clear of the Base and the pedestal Tapa', () => {
    expect(drawerBoxClearance(designOf({ drawers: 3 }))).toBeGreaterThanOrEqual(10);
  });

  it('leaves 642 mm under the rail at the lowest desk', () => {
    const rail = designOf({ height: 720 }).placements.find((p) => p.panelId === 'rail')!;
    expect(rail.position[1] - rail.size[1] / 2).toBe(642);
  });

  it('rejects a 12 mm top', () => {
    expect(issuesOf({ material: 1 })).toEqual([expect.objectContaining({ paramKey: 'material' })]);
  });

  it('rejects a top that spans too far between the rail and the rear panel', () => {
    const [issue] = issuesOf({ material: 4, depth: 600 }); // 568 mm on melamine's 550
    expect(issue!.paramKey).toBe('depth');
    expect(issue!.message).toContain('568 mm');
    expect(designOf({ material: 4, depth: 580 }).templateId).toBe('desk'); // 548 mm
  });

  it('asks for more width when drawers leave too little room for the legs', () => {
    const [issue] = issuesOf({ width: 1000, drawers: 1 });
    expect(issue!.paramKey).toBe('drawers');
    expect(issue!.message).toContain('546 mm');
    expect(designOf({ width: 1000, drawers: 0 }).templateId).toBe('desk');
  });

  it('mentions the pedestal only when there is one', () => {
    expect(designOf().steps.map((s) => s.title)).toContain('Arma la cajonera');
    expect(designOf({ drawers: 0 }).steps.map((s) => s.title)).not.toContain('Arma la cajonera');
  });
});
