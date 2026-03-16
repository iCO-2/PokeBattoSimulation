import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';
import { MOCK_KNOWN_DAMAGE_MOVES } from '../helpers/mockData.js';

// loader.js のモック
vi.mock('../../frontend/js/data/loader.js', () => ({
    ITEMS_DEX: {},
    ABILITIES_DEX: {},
    MOVE_TYPE_MOVES: {},
    KNOWN_DAMAGE_MOVES: {},
    SPECIFIC_MOVES: {}
}));

import { calculateDamage } from '../../frontend/js/calc/damage.js';
import * as loader from '../../frontend/js/data/loader.js';

beforeEach(() => {
    Object.assign(loader, {
        ITEMS_DEX: {},
        ABILITIES_DEX: {},
        MOVE_TYPE_MOVES: {},
        KNOWN_DAMAGE_MOVES: MOCK_KNOWN_DAMAGE_MOVES,
        SPECIFIC_MOVES: {}
    });
});

describe('固定ダメージ技', () => {
    it('ちきゅうなげ → 50', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ name: 'ちきゅうなげ' });
        const result = calculateDamage(atk, def, move);
        expect(result.min).toBe(50);
        expect(result.max).toBe(50);
        expect(result.isKnownDamage).toBe(true);
    });

    it('ソニックブーム → 20', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ name: 'ソニックブーム' });
        const result = calculateDamage(atk, def, move);
        expect(result.min).toBe(20);
        expect(result.max).toBe(20);
    });

    it('いかりのまえば: def.currentHp=200 → 100', () => {
        const atk = createPokemon();
        const def = createPokemon({ currentHp: 200 });
        const move = createMove({ name: 'いかりのまえば' });
        const result = calculateDamage(atk, def, move);
        expect(result.min).toBe(100);
    });

    it('カタストロフィ: def.currentHp=201 → 100', () => {
        const atk = createPokemon();
        const def = createPokemon({ currentHp: 201 });
        const move = createMove({ name: 'カタストロフィ' });
        const result = calculateDamage(atk, def, move);
        expect(result.min).toBe(100); // floor(201 * 0.5) = 100
    });

    it('がむしゃら: atk.hp=50, def.hp=200 → 150', () => {
        const atk = createPokemon({ currentHp: 50 });
        const def = createPokemon({ currentHp: 200 });
        const move = createMove({ name: 'がむしゃら' });
        const result = calculateDamage(atk, def, move);
        expect(result.min).toBe(150);
    });

    it('いのちがけ: atk.hp=120 → 120', () => {
        const atk = createPokemon({ currentHp: 120 });
        const def = createPokemon();
        const move = createMove({ name: 'いのちがけ' });
        const result = calculateDamage(atk, def, move);
        expect(result.min).toBe(120);
    });

    it('いたみわけ: atk.hp=50, def.hp=200 → 75', () => {
        const atk = createPokemon({ currentHp: 50 });
        const def = createPokemon({ currentHp: 200 });
        const move = createMove({ name: 'いたみわけ' });
        const result = calculateDamage(atk, def, move);
        // avg = floor((50+200)/2) = 125, damage = 200 - 125 = 75
        expect(result.min).toBe(75);
    });
});
