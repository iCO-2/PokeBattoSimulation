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

describe('天候補正', () => {
    it('ゆき + こおり物理防御 → D×1.5', () => {
        const atk = createPokemon();
        const def = createPokemon({
            speciesData: { types: ['こおり'], weight_kg: 50 }
        });
        const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

        const resultNone = calculateDamage(atk, def, move, { weather: 'none' });
        const resultSnow = calculateDamage(atk, def, move, { weather: 'snow' });
        expect(resultSnow.max).toBeLessThan(resultNone.max);
    });

    it('すなあらし + いわ特殊防御 → D×1.5', () => {
        const atk = createPokemon();
        const def = createPokemon({
            speciesData: { types: ['いわ'], weight_kg: 50 }
        });
        const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, { weather: 'none' });
        const resultSand = calculateDamage(atk, def, move, { weather: 'sandstorm' });
        expect(resultSand.max).toBeLessThan(resultNone.max);
    });

    it('晴れ + ほのお技 → ダメージ×1.5', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, { weather: 'none' });
        const resultSunny = calculateDamage(atk, def, move, { weather: 'sunny' });
        expect(resultSunny.max).toBeGreaterThan(resultNone.max);
    });

    it('晴れ + みず技 → ダメージ×0.5', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'みず', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, { weather: 'none' });
        const resultSunny = calculateDamage(atk, def, move, { weather: 'sunny' });
        expect(resultSunny.max).toBeLessThan(resultNone.max);
    });

    it('雨 + みず技 → ダメージ×1.5', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'みず', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, { weather: 'none' });
        const resultRain = calculateDamage(atk, def, move, { weather: 'rain' });
        expect(resultRain.max).toBeGreaterThan(resultNone.max);
    });

    it('雨 + ほのお技 → ダメージ×0.5', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, { weather: 'none' });
        const resultRain = calculateDamage(atk, def, move, { weather: 'rain' });
        expect(resultRain.max).toBeLessThan(resultNone.max);
    });

    it('晴れ + くさ技 → 補正なし', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'くさ', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, { weather: 'none' });
        const resultSunny = calculateDamage(atk, def, move, { weather: 'sunny' });
        expect(resultSunny.max).toBe(resultNone.max);
    });
});
