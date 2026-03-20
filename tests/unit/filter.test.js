import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';
import { MOCK_ABILITIES_DEX } from '../helpers/mockData.js';

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

beforeEach(() => {
    Object.assign(loader, {
        ITEMS_DEX: {},
        ABILITIES_DEX: MOCK_ABILITIES_DEX,
        MOVE_TYPE_MOVES: {},
        KNOWN_DAMAGE_MOVES: {},
        SPECIFIC_MOVES: {},
        RECOIL_MOVES: {}
    });
});

describe('フィルター / ハードロック / プリズムアーマー（効果抜群を0.75倍に軽減）', () => {
    describe('発動条件', () => {
        it('フィルター: 効果抜群（2倍）のとき → ダメージ軽減・filterInfo が非null', () => {
            // みず技 vs ほのおタイプ → 2.0倍
            const atk = createPokemon({
                speciesData: { types: ['みず'], weight_kg: 50 }
            });
            const defFilter = createPokemon({
                ability: 'フィルター',
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const defNoAbility = createPokemon({
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, defFilter, move);
            const resultNoAbility = calculateDamage(atk, defNoAbility, move);

            expect(result.filterInfo).not.toBeNull();
            expect(result.filterInfo.multiplier).toBe(0.75);
            expect(result.max).toBeLessThan(resultNoAbility.max);
        });

        it('ハードロック: 効果抜群のとき → 発動する', () => {
            const atk = createPokemon({
                speciesData: { types: ['みず'], weight_kg: 50 }
            });
            const def = createPokemon({
                ability: 'ハードロック',
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.filterInfo).not.toBeNull();
            expect(result.filterInfo.name).toBe('ハードロック');
        });

        it('プリズムアーマー: 効果抜群のとき → 発動する', () => {
            const atk = createPokemon({
                speciesData: { types: ['みず'], weight_kg: 50 }
            });
            const def = createPokemon({
                ability: 'プリズムアーマー',
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.filterInfo).not.toBeNull();
            expect(result.filterInfo.name).toBe('プリズムアーマー');
        });

        it('等倍（1.0倍）のとき → 発動しない', () => {
            const atk = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                ability: 'フィルター',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const move = createMove({ power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.filterInfo).toBeNull();
        });

        it('効果いまひとつ（0.5倍）のとき → 発動しない', () => {
            // ほのお技 vs みずタイプ → 0.5倍
            const atk = createPokemon({
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const def = createPokemon({
                ability: 'フィルター',
                speciesData: { types: ['みず'], weight_kg: 50 }
            });
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.filterInfo).toBeNull();
        });

        it('効果なし（0倍）のとき → 発動しない', () => {
            // ノーマル技 vs ゴーストタイプ → 0倍
            const atk = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                ability: 'フィルター',
                speciesData: { types: ['ゴースト'], weight_kg: 50 }
            });
            const move = createMove({ power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.filterInfo).toBeNull();
        });

        it('4倍抜群のとき → 発動する', () => {
            // こおり技 vs [くさ, ひこう] → 4.0倍
            const atk = createPokemon({
                speciesData: { types: ['こおり'], weight_kg: 50 }
            });
            const defFilter = createPokemon({
                ability: 'フィルター',
                speciesData: { types: ['くさ', 'ひこう'], weight_kg: 50 }
            });
            const defNoAbility = createPokemon({
                speciesData: { types: ['くさ', 'ひこう'], weight_kg: 50 }
            });
            const move = createMove({ power: 90, type: 'こおり', category: 'Special' });

            const result = calculateDamage(atk, defFilter, move);
            const resultNoAbility = calculateDamage(atk, defNoAbility, move);

            expect(result.filterInfo).not.toBeNull();
            expect(result.max).toBeLessThan(resultNoAbility.max);
        });
    });

    describe('ダメージ値の検証', () => {
        it('ダメージがおよそ0.75倍になる', () => {
            // みず技 vs ほのおタイプ → 2倍
            const atk = createPokemon({
                speciesData: { types: ['みず'], weight_kg: 50 }
            });
            const defFilter = createPokemon({
                ability: 'フィルター',
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const defNoAbility = createPokemon({
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, defFilter, move);
            const resultNoAbility = calculateDamage(atk, defNoAbility, move);

            // フィルターで × 0.75 (五捨五超入の誤差を考慮)
            expect(result.max).toBeGreaterThanOrEqual(Math.floor(resultNoAbility.max * 0.75) - 1);
            expect(result.max).toBeLessThanOrEqual(Math.ceil(resultNoAbility.max * 0.75) + 1);
        });
    });
});
