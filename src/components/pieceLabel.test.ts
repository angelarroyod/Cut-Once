import { describe, expect, it } from 'vitest';
import { pieceLabel } from './pieceLabel.ts';

describe('pieceLabel', () => {
  it('keeps a short name flat and full size on a wide piece', () => {
    const l = pieceLabel('Tapa #1', '764 × 547', 764, 547);
    expect(l).toMatchObject({ rotate: false, size: 42, name: 'Tapa #1', dims: '764 × 547' });
  });

  it('turns a long name on a narrow, tall piece', () => {
    const l = pieceLabel('Frente de cajón #3', '156 × 611', 156, 611);
    expect(l.rotate).toBe(true);
    expect(l.name.length * l.size * 0.58).toBeLessThanOrEqual(611 - 48);
  });

  it('shortens a name that cannot fit even at the smallest size', () => {
    const l = pieceLabel('Frente y trasera de cajón #12', '156 × 300', 156, 300);
    expect(l.name.endsWith('…')).toBe(true);
    expect(l.name.length * l.size * 0.58).toBeLessThanOrEqual(300 - 48);
  });

  it('drops the size line when there is no room for two lines', () => {
    expect(pieceLabel('Zoclo #1', '764 × 70', 764, 70).dims).toBeNull();
  });
});
