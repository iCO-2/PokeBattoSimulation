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

describe('げきりゅう・もうか・しんりょく (HP1/3以下で攻撃1.5倍)', () => {

    describe('げきりゅう (みず)', () => {
        it('HP1/3以下 + みず技 → 攻撃1.5倍', () => {
            const atk = createPokemon({
                ability: 'げきりゅう',
                speciesData: { types: ['みず'], weight_kg: 50 },
                currentHp: 66,
                maxHp: 200
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['みず'], weight_kg: 50 },
                currentHp: 66,
                maxHp: 200
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNoAbility.max);
        });

        it('HP1/3ちょうど → 発動する', () => {
            // maxHp=300, 1/3=floor(100) → currentHp=100で発動
            const atk = createPokemon({
                ability: 'げきりゅう',
                speciesData: { types: ['みず'], weight_kg: 50 },
                currentHp: 100,
                maxHp: 300
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['みず'], weight_kg: 50 },
                currentHp: 100,
                maxHp: 300
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNoAbility.max);
        });

        it('HP1/3超え → 発動しない', () => {
            // maxHp=300, 1/3=floor(100) → currentHp=101で発動しない
            const atk = createPokemon({
                ability: 'げきりゅう',
                speciesData: { types: ['みず'], weight_kg: 50 },
                currentHp: 101,
                maxHp: 300
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['みず'], weight_kg: 50 },
                currentHp: 101,
                maxHp: 300
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBe(resultNoAbility.max);
        });

        it('HP1/3以下でも非みず技 → 発動しない', () => {
            const atk = createPokemon({
                ability: 'げきりゅう',
                speciesData: { types: ['みず'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['みず'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBe(resultNoAbility.max);
        });
    });

    describe('もうか (ほのお)', () => {
        it('HP1/3以下 + ほのお技 → 攻撃1.5倍', () => {
            const atk = createPokemon({
                ability: 'もうか',
                speciesData: { types: ['ほのお'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['ほのお'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNoAbility.max);
        });

        it('HP1/3以下でも非ほのお技 → 発動しない', () => {
            const atk = createPokemon({
                ability: 'もうか',
                speciesData: { types: ['ほのお'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['ほのお'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBe(resultNoAbility.max);
        });
    });

    describe('しんりょく (くさ)', () => {
        it('HP1/3以下 + くさ技 → 攻撃1.5倍', () => {
            const atk = createPokemon({
                ability: 'しんりょく',
                speciesData: { types: ['くさ'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['くさ'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'くさ', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNoAbility.max);
        });

        it('HP1/3以下でも非くさ技 → 発動しない', () => {
            const atk = createPokemon({
                ability: 'しんりょく',
                speciesData: { types: ['くさ'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const atkNoAbility = createPokemon({
                speciesData: { types: ['くさ'], weight_kg: 50 },
                currentHp: 50,
                maxHp: 200
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBe(resultNoAbility.max);
        });
    });

    it('物理技でも発動する', () => {
        const atk = createPokemon({
            ability: 'もうか',
            speciesData: { types: ['ほのお'], weight_kg: 50 },
            currentHp: 50,
            maxHp: 200
        });
        const atkNoAbility = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 },
            currentHp: 50,
            maxHp: 200
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Physical' });

        const result = calculateDamage(atk, def, move);
        const resultNoAbility = calculateDamage(atkNoAbility, def, move);
        expect(result.max).toBeGreaterThan(resultNoAbility.max);
    });
});
