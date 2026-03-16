import { describe, it, expect } from 'vitest';
import { pokeRound } from '../../frontend/js/calc/damage.js';

describe('pokeRound (五捨五超入)', () => {
    it('小数部が0.5以下 → 切り捨て', () => {
        expect(pokeRound(10.5)).toBe(10);
        expect(pokeRound(10.0)).toBe(10);
        expect(pokeRound(10.3)).toBe(10);
    });

    it('小数部が0.5より大きい → 切り上げ', () => {
        expect(pokeRound(10.501)).toBe(11);
        expect(pokeRound(10.9)).toBe(11);
        expect(pokeRound(10.51)).toBe(11);
    });
});
