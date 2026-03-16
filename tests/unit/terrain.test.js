import { describe, it, expect, vi } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';

vi.mock('../../frontend/js/data/loader.js', () => ({
    ITEMS_DEX: {},
    ABILITIES_DEX: {},
    MOVE_TYPE_MOVES: {},
    KNOWN_DAMAGE_MOVES: {},
    SPECIFIC_MOVES: {}
}));

import { calculateDamage } from '../../frontend/js/calc/damage.js';

describe('フィールド補正', () => {
    it('エレキフィールド + でんき技 → 威力×1.3', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'でんき', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, {});
        const resultElectric = calculateDamage(atk, def, move, { terrain: 'electric' });
        expect(resultElectric.max).toBeGreaterThan(resultNone.max);
    });

    it('サイコフィールド + エスパー技 → 威力×1.3', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, {});
        const resultPsychic = calculateDamage(atk, def, move, { terrain: 'psychic' });
        expect(resultPsychic.max).toBeGreaterThan(resultNone.max);
    });

    it('グラスフィールド + くさ技 → 威力×1.3', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'くさ', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, {});
        const resultGrassy = calculateDamage(atk, def, move, { terrain: 'grassy' });
        expect(resultGrassy.max).toBeGreaterThan(resultNone.max);
    });

    it('グラスフィールド + じしん → 威力×0.5', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ name: 'じしん', power: 100, type: 'じめん', category: 'Physical' });

        const resultNone = calculateDamage(atk, def, move, {});
        const resultGrassy = calculateDamage(atk, def, move, { terrain: 'grassy' });
        expect(resultGrassy.max).toBeLessThan(resultNone.max);
    });

    it('ミストフィールド + ドラゴン技 → 威力×0.5', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ドラゴン', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, {});
        const resultMisty = calculateDamage(atk, def, move, { terrain: 'misty' });
        expect(resultMisty.max).toBeLessThan(resultNone.max);
    });

    it('ワイドフォース + サイコフィールド → 威力×1.5×1.3', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ name: 'ワイドフォース', power: 80, type: 'エスパー', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, {});
        const resultPsychic = calculateDamage(atk, def, move, { terrain: 'psychic' });
        // 1.5 × 1.3 = 1.95 倍相当
        expect(resultPsychic.max).toBeGreaterThan(resultNone.max);
        // 通常のエスパー技の1.3倍よりも大きい
        const normalMove = createMove({ power: 80, type: 'エスパー', category: 'Special' });
        const resultNormalPsychic = calculateDamage(atk, def, normalMove, { terrain: 'psychic' });
        expect(resultPsychic.max).toBeGreaterThan(resultNormalPsychic.max);
    });

    it('サイコブレイド + エレキフィールド → 威力×1.5×1.3', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ name: 'サイコブレイド', power: 80, type: 'エスパー', category: 'Physical' });

        const resultNone = calculateDamage(atk, def, move, {});
        const resultElectric = calculateDamage(atk, def, move, { terrain: 'electric' });
        expect(resultElectric.max).toBeGreaterThan(resultNone.max);
    });

    it('非対応フィールド → 補正なし', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'くさ', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, {});
        const resultElectric = calculateDamage(atk, def, move, { terrain: 'electric' });
        expect(resultElectric.max).toBe(resultNone.max);
    });
});
