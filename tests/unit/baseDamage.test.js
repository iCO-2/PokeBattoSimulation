import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('基本ダメージ計算式', () => {
    it('Lv50, Power=80, A=150, D=100, 補正なし → baseDmg=54, min=45, max=54', () => {
        // 攻撃側: みずタイプ（ほのお技と不一致）、防御側: みずタイプ（ほのお等倍）
        const atk = createPokemon({
            level: 50,
            speciesData: { types: ['みず'], weight_kg: 50 },
            realStats: { attack: 150, defence: 100, spAtk: 100, spDef: 100, speed: 100 }
        });
        const def = createPokemon({
            speciesData: { types: ['かくとう'], weight_kg: 50 }, // ほのお等倍
            realStats: { attack: 100, defence: 100, spAtk: 100, spDef: 100, speed: 100 }
        });
        const move = createMove({ power: 80, type: 'ほのお', category: 'Physical' });

        const result = calculateDamage(atk, def, move);
        // baseDmg = floor(floor(floor(50*2/5+2) * 80 * 150 / 100) / 50) + 2 = 54
        // min = floor(54 * 85/100) = 45
        // max = floor(54 * 100/100) = 54
        expect(result.max).toBe(54);
        expect(result.min).toBe(45);
    });

    it('物理 vs 特殊: 同条件で category 変更、atk≠spAtk → ダメージが異なる', () => {
        const atk = createPokemon({
            realStats: { attack: 200, defence: 100, spAtk: 100, spDef: 100, speed: 100 }
        });
        const def = createPokemon();
        const physMove = createMove({ power: 80, type: 'かくとう', category: 'Physical' });
        const specMove = createMove({ power: 80, type: 'かくとう', category: 'Special' });

        const physResult = calculateDamage(atk, def, physMove);
        const specResult = calculateDamage(atk, def, specMove);
        expect(physResult.max).not.toBe(specResult.max);
    });

    it('変化技 (power=0) → {min:0, max:0, rolls:[]}', () => {
        const atk = createPokemon();
        const def = createPokemon();
        const move = createMove({ power: 0, category: 'Status' });

        const result = calculateDamage(atk, def, move);
        expect(result.min).toBe(0);
        expect(result.max).toBe(0);
        expect(result.rolls).toEqual([]);
    });

    it('16ロール生成', () => {
        const atk = createPokemon({
            realStats: { attack: 150, defence: 100, spAtk: 100, spDef: 100, speed: 100 }
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

        const result = calculateDamage(atk, def, move);
        expect(result.rolls.length).toBe(16);
    });
});
