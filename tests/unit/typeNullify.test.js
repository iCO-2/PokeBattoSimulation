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

describe('タイプ無効化特性', () => {
    describe('ふゆう（じめん無効）', () => {
        it('ふゆう + じめん技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'ふゆう' });
            const move = createMove({ power: 100, type: 'じめん', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });

        it('ふゆう + 非じめん技 → 通常ダメージ', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'ふゆう' });
            const defNoAbility = createPokemon();
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNoAbility = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBe(resultNoAbility.max);
        });
    });

    describe('みずタイプ無効化', () => {
        it('ちょすい + みず技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'ちょすい' });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });

        it('かんそうはだ + みず技 → ダメージ=0、typeNullifyHealInfo が非null', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'かんそうはだ', maxHp: 200, currentHp: 100 });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
            expect(result.typeNullifyHealInfo).not.toBeNull();
            expect(result.typeNullifyHealInfo.healAmount).toBe(50); // 200 / 4
        });

        it('かんそうはだ + 非みず技 → typeNullifyHealInfo null', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'かんそうはだ', maxHp: 200, currentHp: 100 });
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.typeNullifyHealInfo).toBeNull();
        });

        it('よびみず + みず技 → ダメージ=0、回復なし', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'よびみず', maxHp: 200, currentHp: 100 });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
            expect(result.typeNullifyHealInfo).toBeNull();
        });
    });

    describe('ほのおタイプ無効化', () => {
        it('もらいび + ほのお技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'もらいび' });
            const move = createMove({ power: 90, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });

        it('こんがりボディ + ほのお技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'こんがりボディ' });
            const move = createMove({ power: 90, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });
    });

    describe('でんきタイプ無効化', () => {
        it('ひらいしん + でんき技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'ひらいしん' });
            const move = createMove({ power: 90, type: 'でんき', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });

        it('ちくでん + でんき技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'ちくでん' });
            const move = createMove({ power: 90, type: 'でんき', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });

        it('でんきエンジン + でんき技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'でんきエンジン' });
            const move = createMove({ power: 90, type: 'でんき', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });
    });

    describe('くさタイプ無効化', () => {
        it('そうしょく + くさ技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'そうしょく' });
            const move = createMove({ power: 80, type: 'くさ', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });
    });

    describe('どしょく（じめん無効）', () => {
        it('どしょく + じめん技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'どしょく' });
            const move = createMove({ power: 100, type: 'じめん', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });
    });

    describe('回復量計算', () => {
        it('よびみず: 回復なし（heal_ratio=0）', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'よびみず', maxHp: 300, currentHp: 150 });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.typeNullifyHealInfo).toBeNull();
        });

        it('ちょすい: maxHp=300 → healAmount=75', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'ちょすい', maxHp: 300, currentHp: 150 });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.typeNullifyHealInfo).not.toBeNull();
            expect(result.typeNullifyHealInfo.healAmount).toBe(75); // 300 / 4
        });

        it('かんそうはだ: maxHp=400 → healAmount=100', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'かんそうはだ', maxHp: 400, currentHp: 100 });
            const move = createMove({ power: 80, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.typeNullifyHealInfo).not.toBeNull();
            expect(result.typeNullifyHealInfo.healAmount).toBe(100); // 400 / 4
        });
    });
});
