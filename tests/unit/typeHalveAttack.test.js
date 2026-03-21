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

describe('タイプ半減特性（攻撃ステータス半減）', () => {
    describe('あついしぼう', () => {
        it('ほのお技 → 攻撃側のA半減でダメージ減少', () => {
            const atk = createPokemon();
            const defWithAbility = createPokemon({ ability: 'あついしぼう' });
            const defNoAbility = createPokemon();
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, defWithAbility, move);
            const resultNormal = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBeLessThan(resultNormal.max);
            expect(result.typeHalveAttackInfo).not.toBeNull();
            expect(result.typeHalveAttackInfo.name).toBe('あついしぼう');
            expect(result.typeHalveAttackInfo.multiplier).toBe(0.5);
        });

        it('こおり技 → 攻撃側のA半減でダメージ減少', () => {
            const atk = createPokemon();
            const defWithAbility = createPokemon({ ability: 'あついしぼう' });
            const defNoAbility = createPokemon();
            const move = createMove({ power: 80, type: 'こおり', category: 'Special' });

            const result = calculateDamage(atk, defWithAbility, move);
            const resultNormal = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBeLessThan(resultNormal.max);
            expect(result.typeHalveAttackInfo).not.toBeNull();
        });

        it('みず技 → 効果なし', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'あついしぼう' });
            const defNoAbility = createPokemon();
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNormal = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBe(resultNormal.max);
            expect(result.typeHalveAttackInfo).toBeNull();
        });
    });

    describe('たいねつ', () => {
        it('ほのお技 → 攻撃側のA半減でダメージ減少', () => {
            const atk = createPokemon();
            const defWithAbility = createPokemon({ ability: 'たいねつ' });
            const defNoAbility = createPokemon();
            const move = createMove({ power: 90, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, defWithAbility, move);
            const resultNormal = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBeLessThan(resultNormal.max);
            expect(result.typeHalveAttackInfo).not.toBeNull();
            expect(result.typeHalveAttackInfo.name).toBe('たいねつ');
        });

        it('こおり技 → 効果なし（たいねつはほのおのみ）', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'たいねつ' });
            const defNoAbility = createPokemon();
            const move = createMove({ power: 80, type: 'こおり', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNormal = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBe(resultNormal.max);
            expect(result.typeHalveAttackInfo).toBeNull();
        });
    });

    describe('すいほう', () => {
        it('防御側: ほのお技 → 攻撃側のA半減でダメージ減少', () => {
            const atk = createPokemon();
            const defWithAbility = createPokemon({ ability: 'すいほう' });
            const defNoAbility = createPokemon();
            const move = createMove({ power: 90, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, defWithAbility, move);
            const resultNormal = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBeLessThan(resultNormal.max);
            expect(result.typeHalveAttackInfo).not.toBeNull();
            expect(result.typeHalveAttackInfo.name).toBe('すいほう');
        });

        it('攻撃側: みず技 → 威力2倍でダメージ増加', () => {
            const atkWithAbility = createPokemon({ ability: 'すいほう' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atkWithAbility, def, move);
            const resultNormal = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNormal.max);
            expect(result.waterBubbleInfo).not.toBeNull();
            expect(result.waterBubbleInfo.multiplier).toBe(2.0);
        });

        it('攻撃側: 非みず技 → 威力補正なし', () => {
            const atkWithAbility = createPokemon({ ability: 'すいほう' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atkWithAbility, def, move);
            const resultNormal = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBe(resultNormal.max);
            expect(result.waterBubbleInfo).toBeNull();
        });
    });

    describe('攻撃ステータス半減の計算精度', () => {
        it('applyModifier(A, 0.5) で半減（4096基準補正: ×2048÷4096）', () => {
            // A=150の場合: applyModifier(150, 0.5) = pokeRound(150 * 2048 / 4096) = pokeRound(75.0) = 75
            const atk = createPokemon({
                realStats: { attack: 100, defence: 100, spAtk: 150, spDef: 100, speed: 100 }
            });
            const def = createPokemon({ ability: 'あついしぼう' });
            const defNoAbility = createPokemon();
            const move = createMove({ power: 100, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNormal = calculateDamage(atk, defNoAbility, move);

            // ダメージが約半分になることを検証
            // 完全な半分ではなく、baseDamage計算式のフロア処理の影響で若干の差がある
            expect(result.max).toBeLessThanOrEqual(Math.ceil(resultNormal.max / 2));
            expect(result.max).toBeGreaterThan(0);
        });
    });
});
