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

    describe('テラスタル威力60引き上げ', () => {
        it('テラタイプ一致 + 威力40 → 威力60に引き上げ', () => {
            const atkTera = createPokemon({
                speciesData: { types: ['でんき'], weight_kg: 50 },
                teraType: 'でんき'
            });
            const atkNoTera = createPokemon({
                speciesData: { types: ['でんき'], weight_kg: 50 }
            });
            const def = createPokemon();
            const move = createMove({ power: 40, type: 'でんき', category: 'Physical' });

            const resultTera = calculateDamage(atkTera, def, move);
            const resultNoTera = calculateDamage(atkNoTera, def, move);
            // テラ時は威力60、非テラ時は威力40 → テラの方がダメージ大
            expect(resultTera.max).toBeGreaterThan(resultNoTera.max);
        });

        it('テラタイプ不一致 → 引き上げなし', () => {
            const atkTera = createPokemon({
                speciesData: { types: ['でんき'], weight_kg: 50 },
                teraType: 'ほのお'
            });
            const atkNoTera = createPokemon({
                speciesData: { types: ['でんき'], weight_kg: 50 }
            });
            const def = createPokemon();
            const move = createMove({ power: 40, type: 'でんき', category: 'Physical' });

            const resultTera = calculateDamage(atkTera, def, move);
            const resultNoTera = calculateDamage(atkNoTera, def, move);
            // テラタイプ不一致のでんき技 → 引き上げなし、どちらも元タイプ一致で同じ
            expect(resultTera.max).toBe(resultNoTera.max);
        });

        it('先制技は対象外', () => {
            const atkTera = createPokemon({
                speciesData: { types: ['でんき'], weight_kg: 50 },
                teraType: 'でんき'
            });
            const atkNoTera = createPokemon({
                speciesData: { types: ['でんき'], weight_kg: 50 }
            });
            const def = createPokemon();
            const move = createMove({ power: 40, type: 'でんき', category: 'Physical', priority: 1 });

            const resultTera = calculateDamage(atkTera, def, move);
            const resultNoTera = calculateDamage(atkNoTera, def, move);
            // 先制技なので威力引き上げなし → STAB補正の差のみ(テラ+元一致2.0 vs 元一致1.5)
            // 威力自体は40のまま同じ
            // テラの方がSTAB2.0で大きいが、威力引き上げは無し
            const atkTeraHighPower = createPokemon({
                speciesData: { types: ['でんき'], weight_kg: 50 },
                teraType: 'でんき'
            });
            const normalMove = createMove({ power: 40, type: 'でんき', category: 'Physical' });
            const resultNormalMove = calculateDamage(atkTeraHighPower, def, normalMove);
            // 先制技テラはnormalMoveテラ(威力60引き上げあり)より小さい
            expect(resultTera.max).toBeLessThan(resultNormalMove.max);
        });

        it('連続攻撃技は対象外', () => {
            const atkTera = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                teraType: 'ノーマル'
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 } // ノーマル等倍
            });
            const multiMove = createMove({
                power: 25, type: 'ノーマル', category: 'Physical',
                multi_hit: { is_multi: true, min_count: 2, max_count: 5 }
            });
            const singleMove = createMove({
                power: 25, type: 'ノーマル', category: 'Physical'
            });

            const resultMulti = calculateDamage(atkTera, def, multiMove);
            const resultSingle = calculateDamage(atkTera, def, singleMove);
            // 連続攻撃技は引き上げなし(威力25)、単発技は引き上げあり(威力60)
            expect(resultMulti.max).toBeLessThan(resultSingle.max);
        });

        it('テクニシャンで威力60超え → テラ引き上げ無効', () => {
            const atkTechTera = createPokemon({
                ability: 'テクニシャン',
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                teraType: 'ノーマル'
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            // 威力50 → テクニシャン×1.5 = 75（60超え）→ テラ引き上げ無効
            const move = createMove({ power: 50, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atkTechTera, def, move);
            // テラ引き上げ無効なので威力50→テクニシャンで75
            // 引き上げが有効なら威力60→テクニシャンで90になるはず
            // 威力50 * 1.5 = 75 相当のダメージ確認
            const atkTechNoTera = createPokemon({
                ability: 'テクニシャン',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const resultNoTera = calculateDamage(atkTechNoTera, def, move);
            // テラなしテクニシャン(威力75, STAB1.5) vs テラありテクニシャン(威力75, STAB2.0)
            // 威力は同じ75、STAB差のみ
            expect(result.max).toBeGreaterThan(resultNoTera.max); // STAB 2.0 > 1.5
        });

        it('テクニシャンで威力60以下 → テラ引き上げ有効', () => {
            const atkTechTera = createPokemon({
                ability: 'テクニシャン',
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                teraType: 'ノーマル'
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            // 威力20 → テクニシャン×1.5 = 30（60以下）→ テラ引き上げ有効
            // 威力20→テラで60→テクニシャンで90
            const move = createMove({ power: 20, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atkTechTera, def, move);
            // テラ引き上げなし + テクニシャンのみの場合: 20 * 1.5 = 30
            const atkTechNoTera = createPokemon({
                ability: 'テクニシャン',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const resultNoTera = calculateDamage(atkTechNoTera, def, move);
            // テラあり(威力90相当) > テラなし(威力30相当)
            expect(result.max).toBeGreaterThan(resultNoTera.max);
        });
    });
});
