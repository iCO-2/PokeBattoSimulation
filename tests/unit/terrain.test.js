import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';
import { MOCK_ABILITIES_DEX } from '../helpers/mockData.js';

vi.mock('../../frontend/js/data/loader.js', () => ({
    ITEMS_DEX: {},
    ABILITIES_DEX: {},
    MOVE_TYPE_MOVES: {},
    KNOWN_DAMAGE_MOVES: {},
    SPECIFIC_MOVES: {}
}));

import { calculateDamage } from '../../frontend/js/calc/damage.js';
import * as loader from '../../frontend/js/data/loader.js';

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

    describe('浮いているポケモンのフィールド効果無効', () => {
        it('ひこうタイプ攻撃側 → フィールド威力強化なし', () => {
            const atkFlying = createPokemon({
                speciesData: { types: ['でんき', 'ひこう'], weight_kg: 50 }
            });
            const atkGrounded = createPokemon({
                speciesData: { types: ['でんき'], weight_kg: 50 }
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'でんき', category: 'Special' });

            const resultFlying = calculateDamage(atkFlying, def, move, { terrain: 'electric' });
            const resultGrounded = calculateDamage(atkGrounded, def, move, { terrain: 'electric' });
            const resultNoTerrain = calculateDamage(atkFlying, def, move, {});
            // ひこうタイプはフィールド強化を受けない
            expect(resultFlying.max).toBe(resultNoTerrain.max);
            // 接地しているポケモンはフィールド強化を受ける
            expect(resultGrounded.max).toBeGreaterThan(resultFlying.max);
        });

        it('ふゆう攻撃側 → フィールド威力強化なし', () => {
            Object.assign(loader, { ABILITIES_DEX: MOCK_ABILITIES_DEX });

            const atkLevitate = createPokemon({ ability: 'ふゆう' });
            const atkGrounded = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

            const resultLevitate = calculateDamage(atkLevitate, def, move, { terrain: 'psychic' });
            const resultGrounded = calculateDamage(atkGrounded, def, move, { terrain: 'psychic' });
            const resultNoTerrain = calculateDamage(atkLevitate, def, move, {});
            expect(resultLevitate.max).toBe(resultNoTerrain.max);
            expect(resultGrounded.max).toBeGreaterThan(resultLevitate.max);
        });

        it('ひこうタイプ防御側 → ミストフィールドのドラゴン半減なし', () => {
            const atk = createPokemon();
            const defFlying = createPokemon({
                speciesData: { types: ['ドラゴン', 'ひこう'], weight_kg: 50 }
            });
            const defGrounded = createPokemon({
                speciesData: { types: ['ドラゴン'], weight_kg: 50 }
            });
            const move = createMove({ power: 80, type: 'ドラゴン', category: 'Special' });

            const resultFlying = calculateDamage(atk, defFlying, move, { terrain: 'misty' });
            const resultFlyingNoTerrain = calculateDamage(atk, defFlying, move, {});
            const resultGrounded = calculateDamage(atk, defGrounded, move, { terrain: 'misty' });
            // ひこうタイプ防御側はミストフィールドの半減を受けない
            expect(resultFlying.max).toBe(resultFlyingNoTerrain.max);
            // 接地している防御側はドラゴン半減
            expect(resultGrounded.max).toBeLessThan(resultFlying.max);
        });

        it('ひこうタイプ防御側 → グラスフィールドのじしん半減なし', () => {
            const atk = createPokemon();
            const defFlying = createPokemon({
                speciesData: { types: ['ノーマル', 'ひこう'], weight_kg: 50 }
            });
            const defGrounded = createPokemon();
            const move = createMove({ name: 'じしん', power: 100, type: 'じめん', category: 'Physical' });

            const resultFlying = calculateDamage(atk, defFlying, move, { terrain: 'grassy' });
            const resultFlyingNoTerrain = calculateDamage(atk, defFlying, move, {});
            const resultGrounded = calculateDamage(atk, defGrounded, move, { terrain: 'grassy' });
            // ひこう防御側はグラスフィールドのじしん半減を受けない（タイプ無効は別問題）
            expect(resultFlying.max).toBe(resultFlyingNoTerrain.max);
            // 接地防御側はじしん半減
            expect(resultGrounded.max).toBeLessThan(
                calculateDamage(atk, defGrounded, move, {}).max
            );
        });
    });
});
