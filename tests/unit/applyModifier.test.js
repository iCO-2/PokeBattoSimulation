import { describe, it, expect } from 'vitest';
import { applyModifier, pokeRound } from '../../frontend/js/calc/damage.js';

describe('applyModifier (4096基準補正)', () => {
    it('1.5倍補正: value=100', () => {
        // mod = Math.round(4096 * 1.5) = 6144
        // result = pokeRound(100 * 6144 / 4096) = pokeRound(150) = 150
        expect(applyModifier(100, 1.5)).toBe(150);
    });

    it('1.0倍補正: 変化なし', () => {
        expect(applyModifier(100, 1.0)).toBe(100);
    });

    it('0.5倍補正: value=100', () => {
        expect(applyModifier(100, 0.5)).toBe(50);
    });
});
