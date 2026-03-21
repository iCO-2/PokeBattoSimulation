import { describe, it, expect, vi } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';
import { MOCK_ABILITIES_DEX, MOCK_MOVE_TYPE_MOVES } from '../helpers/mockData.js';

vi.mock('../../frontend/js/data/loader.js', () => ({
    ITEMS_DEX: {},
    ABILITIES_DEX: {},
    MOVE_TYPE_MOVES: {},
    KNOWN_DAMAGE_MOVES: {},
    SPECIFIC_MOVES: {},
    RECOIL_MOVES: {}
}));

import { calculateDamage } from '../../frontend/js/calc/damage.js';
import * as loader from '../../frontend/js/data/loader.js';

describe('乱数ロール', () => {
    it('16ロール生成', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

        const result = calculateDamage(atk, def, move);
        expect(result.rolls.length).toBe(16);
    });

    it('min/max & 昇順', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

        const result = calculateDamage(atk, def, move);
        expect(result.rolls[0]).toBe(result.min);
        expect(result.rolls[15]).toBe(result.max);
        for (let i = 1; i < result.rolls.length; i++) {
            expect(result.rolls[i]).toBeGreaterThanOrEqual(result.rolls[i - 1]);
        }
    });

    it('タイプ無効 → 全0', () => {
        const atk = createPokemon();
        const def = createPokemon({
            speciesData: { types: ['ゴースト'], weight_kg: 50 }
        });
        const move = createMove({ power: 80, type: 'ノーマル', category: 'Physical' });

        const result = calculateDamage(atk, def, move);
        expect(result.rolls.every(r => r === 0)).toBe(true);
    });

    it('特性無効 → 全0', () => {
        Object.assign(loader, {
            ABILITIES_DEX: MOCK_ABILITIES_DEX,
            MOVE_TYPE_MOVES: MOCK_MOVE_TYPE_MOVES
        });

        const atk = createPokemon();
        const def = createPokemon({ ability: 'ぼうおん' });
        const move = createMove({ name: 'ハイパーボイス', power: 90, type: 'ノーマル', category: 'Special' });

        const result = calculateDamage(atk, def, move);
        expect(result.rolls.every(r => r === 0)).toBe(true);
    });
});
