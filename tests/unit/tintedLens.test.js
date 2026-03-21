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

describe('いろめがね（効果いまひとつ以下で2倍）', () => {
    describe('発動条件', () => {
        it('効果いまひとつ（0.5倍）のとき → ダメージ2倍、tintedLensInfo が非null', () => {
            // ノーマル技 vs いわタイプ → 0.5倍
            const atk = createPokemon({
                ability: 'いろめがね',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            // いわタイプに対してノーマル技は 0.5 倍
            const def = createPokemon({
                speciesData: { types: ['いわ'], weight_kg: 50 }
            });
            const move = createMove({ name: 'たいあたり', power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);

            expect(result.tintedLensInfo).not.toBeNull();
            expect(result.tintedLensInfo.multiplier).toBe(2.0);
            // ダメージがおよそ2倍（丸め誤差を考慮して範囲チェック）
            expect(result.max).toBeGreaterThan(resultNoAbility.max);
        });

        it('効果なし（0倍）のとき → 発動しない（tintedLensInfo null、ダメージ 0）', () => {
            // ノーマル技 vs ゴーストタイプ → 0倍
            const atk = createPokemon({
                ability: 'いろめがね',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['ゴースト'], weight_kg: 50 }
            });
            const move = createMove({ name: 'たいあたり', power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.tintedLensInfo).toBeNull();
            expect(result.max).toBe(0);
        });

        it('等倍（1.0倍）のとき → 発動しない', () => {
            const atk = createPokemon({
                ability: 'いろめがね',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const move = createMove({ name: 'たいあたり', power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.tintedLensInfo).toBeNull();
        });

        it('効果抜群（2.0倍）のとき → 発動しない', () => {
            // みず技 vs ほのおタイプ → 2.0 倍
            const atk = createPokemon({
                ability: 'いろめがね',
                speciesData: { types: ['みず'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const move = createMove({ name: 'みずでっぽう', power: 40, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.tintedLensInfo).toBeNull();
        });

        it('1/4倍（二重半減）のとき → 発動する', () => {
            // ほのお技 vs [みず, いわ] → 0.25 倍
            const atk = createPokemon({
                ability: 'いろめがね',
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['みず', 'いわ'], weight_kg: 50 }
            });
            const move = createMove({ name: 'かえんほうしゃ', power: 90, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);

            expect(result.tintedLensInfo).not.toBeNull();
            expect(result.max).toBeGreaterThan(resultNoAbility.max);
        });
    });

    describe('ダメージ値の検証', () => {
        it('いろめがねなしの約2倍のダメージになる', () => {
            // ノーマル技 vs いわタイプ (0.5倍)
            const atk = createPokemon({
                ability: 'いろめがね',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['いわ'], weight_kg: 50 }
            });
            const move = createMove({ name: 'たいあたり', power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);

            // いろめがねで × 2.0 ≒ 元ダメージの2倍（五捨五超入の誤差あり）
            expect(result.max).toBeGreaterThanOrEqual(resultNoAbility.max * 2 - 1);
            expect(result.max).toBeLessThanOrEqual(resultNoAbility.max * 2 + 1);
        });
    });
});
