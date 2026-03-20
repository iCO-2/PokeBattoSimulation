import { describe, it, expect, vi } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';

vi.mock('../../frontend/js/data/loader.js', () => ({
    ITEMS_DEX: {},
    ABILITIES_DEX: {},
    MOVE_TYPE_MOVES: {},
    KNOWN_DAMAGE_MOVES: {},
    SPECIFIC_MOVES: {},
    RECOIL_MOVES: {}
}));

import { calculateDamage } from '../../frontend/js/calc/damage.js';

describe('ランク補正', () => {
    const baseMove = { power: 80, type: 'かくとう', category: 'Physical' };

    it('攻撃側+2: ダメージが増加', () => {
        const atkNeutral = createPokemon();
        const atkBoosted = createPokemon({
            stats: { attack: { rank: 2 } }
        });
        const def = createPokemon();
        const move = createMove(baseMove);

        const neutralResult = calculateDamage(atkNeutral, def, move);
        const boostedResult = calculateDamage(atkBoosted, def, move);
        expect(boostedResult.max).toBeGreaterThan(neutralResult.max);
    });

    it('攻撃側-2: ダメージが減少', () => {
        const atkNeutral = createPokemon();
        const atkDebuffed = createPokemon({
            stats: { attack: { rank: -2 } }
        });
        const def = createPokemon();
        const move = createMove(baseMove);

        const neutralResult = calculateDamage(atkNeutral, def, move);
        const debuffedResult = calculateDamage(atkDebuffed, def, move);
        expect(debuffedResult.max).toBeLessThan(neutralResult.max);
    });

    it('防御側+2: ダメージが減少', () => {
        const atk = createPokemon();
        const defNeutral = createPokemon();
        const defBoosted = createPokemon({
            stats: { defence: { rank: 2 } }
        });
        const move = createMove(baseMove);

        const neutralResult = calculateDamage(atk, defNeutral, move);
        const boostedResult = calculateDamage(atk, defBoosted, move);
        expect(boostedResult.max).toBeLessThan(neutralResult.max);
    });

    it('防御側-2: ダメージが増加', () => {
        const atk = createPokemon();
        const defNeutral = createPokemon();
        const defDebuffed = createPokemon({
            stats: { defence: { rank: -2 } }
        });
        const move = createMove(baseMove);

        const neutralResult = calculateDamage(atk, defNeutral, move);
        const debuffedResult = calculateDamage(atk, defDebuffed, move);
        expect(debuffedResult.max).toBeGreaterThan(neutralResult.max);
    });
});
