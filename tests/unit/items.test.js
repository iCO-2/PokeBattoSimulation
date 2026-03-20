import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';
import { MOCK_ITEMS_DEX } from '../helpers/mockData.js';

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
        ITEMS_DEX: MOCK_ITEMS_DEX,
        ABILITIES_DEX: {},
        MOVE_TYPE_MOVES: {},
        KNOWN_DAMAGE_MOVES: {},
        SPECIFIC_MOVES: {},
    RECOIL_MOVES: {}
    });
});

describe('持ち物補正', () => {
    describe('stat_modifier', () => {
        it('こだわりハチマキ + Physical → A×1.5', () => {
            const atk = createPokemon({ item: 'こだわりハチマキ' });
            const atkNoItem = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBeGreaterThan(resultNoItem.max);
        });

        it('こだわりメガネ + Special → A×1.5', () => {
            const atk = createPokemon({ item: 'こだわりメガネ' });
            const atkNoItem = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBeGreaterThan(resultNoItem.max);
        });

        it('とつげきチョッキ (防御側) + Special → D×1.5', () => {
            const atk = createPokemon();
            const def = createPokemon({ item: 'とつげきチョッキ' });
            const defNoItem = createPokemon();
            const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atk, defNoItem, move);
            expect(resultItem.max).toBeLessThan(resultNoItem.max);
        });

        it('しんかのきせき (防御側) + Physical → D×1.5', () => {
            const atk = createPokemon();
            const def = createPokemon({ item: 'しんかのきせき' });
            const defNoItem = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atk, defNoItem, move);
            expect(resultItem.max).toBeLessThan(resultNoItem.max);
        });

        it('ふといほね + ガラガラ → A×2.0', () => {
            const atk = createPokemon({ name: 'ガラガラ', item: 'ふといほね' });
            const atkNoItem = createPokemon({ name: 'ガラガラ' });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'じめん', category: 'Physical' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBeGreaterThan(resultNoItem.max);
        });

        it('ふといほね + ピカチュウ → 効果なし', () => {
            const atk = createPokemon({ name: 'ピカチュウ', item: 'ふといほね' });
            const atkNoItem = createPokemon({ name: 'ピカチュウ' });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'でんき', category: 'Physical' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBe(resultNoItem.max);
        });

        it('ブーストエナジー: attack=最大 + Physical → A×1.3', () => {
            const atk = createPokemon({
                item: 'ブーストエナジー',
                realStats: { attack: 200, defence: 100, spAtk: 100, spDef: 100, speed: 100 }
            });
            const atkNoItem = createPokemon({
                realStats: { attack: 200, defence: 100, spAtk: 100, spDef: 100, speed: 100 }
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBeGreaterThan(resultNoItem.max);
        });

        it('ブーストエナジー: spAtk=最大 + Physical → 効果なし', () => {
            const atk = createPokemon({
                item: 'ブーストエナジー',
                realStats: { attack: 100, defence: 100, spAtk: 200, spDef: 100, speed: 100 }
            });
            const atkNoItem = createPokemon({
                realStats: { attack: 100, defence: 100, spAtk: 200, spDef: 100, speed: 100 }
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBe(resultNoItem.max);
        });
    });

    describe('damage_boost (power)', () => {
        it('ちからのハチマキ + Physical → 威力×1.1', () => {
            const atk = createPokemon({ item: 'ちからのハチマキ' });
            const atkNoItem = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBeGreaterThan(resultNoItem.max);
        });

        it('ものしりメガネ + Special → 威力×1.1', () => {
            const atk = createPokemon({ item: 'ものしりメガネ' });
            const atkNoItem = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBeGreaterThan(resultNoItem.max);
        });

        it('ほのおプレート + ほのお技 → 威力×1.2', () => {
            const atk = createPokemon({ item: 'ほのおプレート' });
            const atkNoItem = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBeGreaterThan(resultNoItem.max);
        });
    });

    describe('damage_boost (damage)', () => {
        it('いのちのたま → ダメージ×1.3', () => {
            const atk = createPokemon({ item: 'いのちのたま' });
            const atkNoItem = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const resultItem = calculateDamage(atk, def, move);
            const resultNoItem = calculateDamage(atkNoItem, def, move);
            expect(resultItem.max).toBeGreaterThan(resultNoItem.max);
        });

        it('たつじんのおび: 抜群時のみ×1.2', () => {
            const atk = createPokemon({ item: 'たつじんのおび' });
            const atkNoItem = createPokemon();
            // 抜群
            const defWeak = createPokemon({
                speciesData: { types: ['くさ'], weight_kg: 50 }
            });
            // 等倍
            const defNeutral = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const resultSuperItem = calculateDamage(atk, defWeak, move);
            const resultSuperNoItem = calculateDamage(atkNoItem, defWeak, move);
            const resultNeutralItem = calculateDamage(atk, defNeutral, move);
            const resultNeutralNoItem = calculateDamage(atkNoItem, defNeutral, move);

            // 抜群時はアイテムで増加
            expect(resultSuperItem.max).toBeGreaterThan(resultSuperNoItem.max);
            // 等倍時は効果なし
            expect(resultNeutralItem.max).toBe(resultNeutralNoItem.max);
        });
    });
});
