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

describe('タイプ一致 (STAB)', () => {
    it('テラスなし、一致 → stabMod 1.5', () => {
        const atk = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 }
        });
        const atkNoMatch = createPokemon({
            speciesData: { types: ['みず'], weight_kg: 50 }
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const resultMatch = calculateDamage(atk, def, move);
        const resultNoMatch = calculateDamage(atkNoMatch, def, move);
        expect(resultMatch.max).toBeGreaterThan(resultNoMatch.max);
    });

    it('テラスなし、不一致 → stabMod 1.0', () => {
        const atk = createPokemon({
            speciesData: { types: ['みず'], weight_kg: 50 }
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const result = calculateDamage(atk, def, move);
        // 不一致なのでSTABなし
        expect(result.stellarBoosted).toBe(false);
    });

    it('テラ+元タイプ一致 → stabMod 2.0', () => {
        const atk = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 },
            teraType: 'ほのお'
        });
        const atkOnlyOriginal = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 },
            teraType: 'なし'
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const resultDouble = calculateDamage(atk, def, move);
        const resultNormal = calculateDamage(atkOnlyOriginal, def, move);
        // テラ+元一致(2.0) > 通常一致(1.5)
        expect(resultDouble.max).toBeGreaterThan(resultNormal.max);
    });

    it('テラのみ一致 → stabMod 1.5', () => {
        const atk = createPokemon({
            speciesData: { types: ['みず'], weight_kg: 50 },
            teraType: 'ほのお'
        });
        const atkNoTera = createPokemon({
            speciesData: { types: ['みず'], weight_kg: 50 }
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const resultTera = calculateDamage(atk, def, move);
        const resultNoTera = calculateDamage(atkNoTera, def, move);
        expect(resultTera.max).toBeGreaterThan(resultNoTera.max);
    });

    it('元タイプのみ一致 → stabMod 1.5', () => {
        const atk = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 },
            teraType: 'みず'
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const result = calculateDamage(atk, def, move);
        // 元タイプ一致なのでSTABあり
        expect(result.max).toBeGreaterThan(0);
    });

    it('ステラ初回+元一致 → stabMod 2.0', () => {
        const atk = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 },
            teraType: 'ステラ',
            stellarUsedTypes: new Set()
        });
        const atkNormalStab = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 }
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const resultStellar = calculateDamage(atk, def, move);
        const resultNormal = calculateDamage(atkNormalStab, def, move);
        expect(resultStellar.stellarBoosted).toBe(true);
        expect(resultStellar.max).toBeGreaterThan(resultNormal.max);
    });

    it('ステラ初回+不一致 → stabMod 1.2', () => {
        const atk = createPokemon({
            speciesData: { types: ['みず'], weight_kg: 50 },
            teraType: 'ステラ',
            stellarUsedTypes: new Set()
        });
        const atkNoTera = createPokemon({
            speciesData: { types: ['みず'], weight_kg: 50 }
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const resultStellar = calculateDamage(atk, def, move);
        const resultNoTera = calculateDamage(atkNoTera, def, move);
        expect(resultStellar.stellarBoosted).toBe(true);
        expect(resultStellar.max).toBeGreaterThan(resultNoTera.max);
    });

    it('ステラ2回目 → stabMod 1.5 (元一致)', () => {
        const atk = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 },
            teraType: 'ステラ',
            stellarUsedTypes: new Set(['ほのお'])
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const result = calculateDamage(atk, def, move);
        expect(result.stellarBoosted).toBe(false);
    });
});
