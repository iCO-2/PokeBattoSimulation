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

const MOCK_RECOIL_MOVES = {
    'もろはのずつき': { type: 'damage', divisor: 2 },
    'すてみタックル': { type: 'damage', divisor: 3 },
    'フレアドライブ': { type: 'damage', divisor: 3 },
    'ブレイブバード': { type: 'damage', divisor: 3 },
    'とっしん': { type: 'damage', divisor: 4 },
    'ワイルドボルト': { type: 'damage', divisor: 4 },
    'てっていこうせん': { type: 'hp_cost', divisor: 2 },
    'クロロブラスト': { type: 'hp_cost', divisor: 2 }
};

beforeEach(() => {
    Object.assign(loader, {
        ITEMS_DEX: {},
        ABILITIES_DEX: MOCK_ABILITIES_DEX,
        MOVE_TYPE_MOVES: {},
        KNOWN_DAMAGE_MOVES: {},
        SPECIFIC_MOVES: {},
        RECOIL_MOVES: MOCK_RECOIL_MOVES
    });
});

describe('反動技', () => {
    describe('反動ダメージ計算', () => {
        it('もろはのずつき → 反動 1/2', () => {
            const atk = createPokemon({
                speciesData: { types: ['いわ'], weight_kg: 50 }
            });
            const def = createPokemon();
            const move = createMove({ name: 'もろはのずつき', power: 150, type: 'いわ', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.recoilInfo).not.toBeNull();
            expect(result.recoilInfo.divisor).toBe(2);
            expect(result.recoilInfo.min).toBe(Math.floor(result.min / 2));
            expect(result.recoilInfo.max).toBe(Math.floor(result.max / 2));
            expect(result.recoilInfo.nullified).toBe(false);
        });

        it('すてみタックル → 反動 1/3', () => {
            const atk = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            const move = createMove({ name: 'すてみタックル', power: 120, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.recoilInfo).not.toBeNull();
            expect(result.recoilInfo.divisor).toBe(3);
            expect(result.recoilInfo.min).toBe(Math.floor(result.min / 3));
            expect(result.recoilInfo.max).toBe(Math.floor(result.max / 3));
        });

        it('とっしん → 反動 1/4', () => {
            const atk = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            const move = createMove({ name: 'とっしん', power: 90, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.recoilInfo).not.toBeNull();
            expect(result.recoilInfo.divisor).toBe(4);
            expect(result.recoilInfo.min).toBe(Math.floor(result.min / 4));
            expect(result.recoilInfo.max).toBe(Math.floor(result.max / 4));
        });

        it('非反動技 → recoilInfo は null', () => {
            const atk = createPokemon();
            const def = createPokemon();
            const move = createMove({ name: 'たいあたり', power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.recoilInfo).toBeNull();
        });
    });

    describe('いしあたま（反動無効）', () => {
        it('いしあたま + 反動技 → 反動ダメージ 0', () => {
            const atk = createPokemon({
                ability: 'いしあたま',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            const move = createMove({ name: 'すてみタックル', power: 120, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.recoilInfo).not.toBeNull();
            expect(result.recoilInfo.nullified).toBe(true);
            expect(result.recoilInfo.min).toBe(0);
            expect(result.recoilInfo.max).toBe(0);
        });

        it('いしあたま + 非反動技 → recoilInfo null', () => {
            const atk = createPokemon({
                ability: 'いしあたま',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon();
            const move = createMove({ name: 'たいあたり', power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.recoilInfo).toBeNull();
        });
    });

    describe('すてみ（反動技の威力1.2倍）', () => {
        it('すてみ + 反動技 → ダメージ増加', () => {
            const atkReckless = createPokemon({
                ability: 'すてみ',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            const move = createMove({ name: 'すてみタックル', power: 120, type: 'ノーマル', category: 'Physical' });

            const resultReckless = calculateDamage(atkReckless, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(resultReckless.max).toBeGreaterThan(resultNoAbility.max);
            expect(resultReckless.recklessInfo).not.toBeNull();
            expect(resultReckless.recklessInfo.multiplier).toBe(1.2);
        });

        it('すてみ + 非反動技 → 効果なし', () => {
            const atkReckless = createPokemon({
                ability: 'すてみ',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            const move = createMove({ name: 'たいあたり', power: 40, type: 'ノーマル', category: 'Physical' });

            const resultReckless = calculateDamage(atkReckless, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(resultReckless.max).toBe(resultNoAbility.max);
            expect(resultReckless.recklessInfo).toBeNull();
        });

        it('すてみの威力補正は4096基準（×4915÷4096）', () => {
            const atk = createPokemon({
                ability: 'すてみ',
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const def = createPokemon();
            // フレアドライブ: 反動技なのですてみ発動
            const move = createMove({ name: 'フレアドライブ', power: 120, type: 'ほのお', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            // 4096 * 1.2 = 4915.2 → Math.round → 4915
            // 120 * 4915 / 4096 = 143.9... → Math.round → 144
            // すてみにより威力が120→144相当に
            expect(result.recklessInfo).not.toBeNull();
        });

        it('すてみ + 反動ダメージも増加する', () => {
            const atkReckless = createPokemon({
                ability: 'すてみ',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            const move = createMove({ name: 'すてみタックル', power: 120, type: 'ノーマル', category: 'Physical' });

            const resultReckless = calculateDamage(atkReckless, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            // すてみで与ダメージが増える → 反動ダメージも増える
            expect(resultReckless.recoilInfo.max).toBeGreaterThan(resultNoAbility.recoilInfo.max);
        });

        it('すてみ + HP消費型 → 威力補正なし', () => {
            const atkReckless = createPokemon({
                ability: 'すてみ',
                speciesData: { types: ['はがね'], weight_kg: 50 }
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['はがね'], weight_kg: 50 }
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            const move = createMove({ name: 'てっていこうせん', power: 140, type: 'はがね', category: 'Special' });

            const resultReckless = calculateDamage(atkReckless, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(resultReckless.max).toBe(resultNoAbility.max);
            expect(resultReckless.recklessInfo).toBeNull();
        });
    });

    describe('HP消費型', () => {
        it('てっていこうせん → 最大HPの1/2消費', () => {
            const atk = createPokemon({
                speciesData: { types: ['はがね'], weight_kg: 50 },
                maxHp: 200,
                currentHp: 200
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            const move = createMove({ name: 'てっていこうせん', power: 140, type: 'はがね', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.recoilInfo).not.toBeNull();
            expect(result.recoilInfo.recoilType).toBe('hp_cost');
            expect(result.recoilInfo.divisor).toBe(2);
            expect(result.recoilInfo.min).toBe(100); // 200 / 2
            expect(result.recoilInfo.max).toBe(100);
            expect(result.recoilInfo.nullified).toBe(false);
        });

        it('HP消費型はいしあたまで無効化されない', () => {
            const atk = createPokemon({
                ability: 'いしあたま',
                speciesData: { types: ['はがね'], weight_kg: 50 },
                maxHp: 200,
                currentHp: 200
            });
            const def = createPokemon({
                speciesData: { types: ['かくとう'], weight_kg: 50 }
            });
            const move = createMove({ name: 'てっていこうせん', power: 140, type: 'はがね', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.recoilInfo.nullified).toBe(false);
            expect(result.recoilInfo.min).toBe(100);
        });
    });
});
