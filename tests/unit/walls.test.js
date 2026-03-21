import { describe, it, expect, vi } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';

vi.mock('../../frontend/js/data/loader.js', () => ({
    ITEMS_DEX: {},
    ABILITIES_DEX: {},
    MOVE_TYPE_MOVES: {},
    KNOWN_DAMAGE_MOVES: {},
    SPECIFIC_MOVES: {},
    RECOIL_MOVES: {}
}));

import { calculateDamage } from '../../frontend/js/calc/damage.js';

describe('壁補正', () => {
    it('リフレクター + 物理 → ダメージ×0.5', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

        const resultNoWall = calculateDamage(atk, def, move, {});
        const resultWall = calculateDamage(atk, def, move, { wallReflect: true });
        expect(resultWall.max).toBeLessThan(resultNoWall.max);
    });

    it('ひかりのかべ + 特殊 → ダメージ×0.5', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

        const resultNoWall = calculateDamage(atk, def, move, {});
        const resultWall = calculateDamage(atk, def, move, { wallLight: true });
        expect(resultWall.max).toBeLessThan(resultNoWall.max);
    });

    it('リフレクター + 特殊 → 効果なし', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

        const resultNoWall = calculateDamage(atk, def, move, {});
        const resultWall = calculateDamage(atk, def, move, { wallReflect: true });
        expect(resultWall.max).toBe(resultNoWall.max);
    });

    it('ひかりのかべ + 物理 → 効果なし', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

        const resultNoWall = calculateDamage(atk, def, move, {});
        const resultWall = calculateDamage(atk, def, move, { wallLight: true });
        expect(resultWall.max).toBe(resultNoWall.max);
    });
});
