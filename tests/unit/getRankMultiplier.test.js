import { describe, it, expect } from 'vitest';
import { getRankMultiplier } from '../../frontend/js/calc/damage.js';

describe('getRankMultiplier', () => {
    it('ランク0 → 1.0', () => {
        expect(getRankMultiplier(0)).toBe(1.0);
    });

    it('正ランク: +1→1.5, +2→2.0, +6→4.0', () => {
        expect(getRankMultiplier(1)).toBe(1.5);
        expect(getRankMultiplier(2)).toBe(2.0);
        expect(getRankMultiplier(6)).toBe(4.0);
    });

    it('負ランク: -1→≈0.667, -2→0.5, -6→0.25', () => {
        expect(getRankMultiplier(-1)).toBeCloseTo(2 / 3, 5);
        expect(getRankMultiplier(-2)).toBe(0.5);
        expect(getRankMultiplier(-6)).toBe(0.25);
    });
});
