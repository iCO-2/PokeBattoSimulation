import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';
import { MOCK_ABILITIES_DEX, MOCK_MOVE_TYPE_MOVES } from '../helpers/mockData.js';

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
        ABILITIES_DEX: MOCK_ABILITIES_DEX,
        MOVE_TYPE_MOVES: MOCK_MOVE_TYPE_MOVES,
        KNOWN_DAMAGE_MOVES: {},
        SPECIFIC_MOVES: {}
    });
});

describe('特性補正', () => {
    describe('攻撃特性', () => {
        it('がんじょうあご + 牙技 → A×1.5', () => {
            const atk = createPokemon({ ability: 'がんじょうあご' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ name: 'かみくだく', power: 80, type: 'あく', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNo.max);
        });

        it('かたいツメ + 接触技 → A×1.3', () => {
            const atk = createPokemon({ ability: 'かたいツメ' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ name: 'タックル', power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNo.max);
        });

        it('きれあじ + 斬撃技 → A×1.5', () => {
            const atk = createPokemon({ ability: 'きれあじ' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ name: 'つじぎり', power: 70, type: 'あく', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNo.max);
        });

        it('てつのこぶし + パンチ技 → A×1.2', () => {
            const atk = createPokemon({ ability: 'てつのこぶし' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ name: 'れいとうパンチ', power: 75, type: 'こおり', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNo.max);
        });

        it('メガランチャー + 波動技 → A×1.5', () => {
            const atk = createPokemon({ ability: 'メガランチャー' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ name: 'はどうだん', power: 80, type: 'かくとう', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNo.max);
        });
    });

    describe('防御特性', () => {
        it('パンクロック + 音技 → ダメージ×0.5', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'パンクロック' });
            const defNoAbility = createPokemon();
            const move = createMove({ name: 'ハイパーボイス', power: 90, type: 'ノーマル', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBeLessThan(resultNo.max);
        });

        it('ぼうおん + 音技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'ぼうおん' });
            const move = createMove({ name: 'ハイパーボイス', power: 90, type: 'ノーマル', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });

        it('かぜのり + 風技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'かぜのり' });
            const move = createMove({ name: 'ぼうふう', power: 110, type: 'ひこう', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });

        it('ぼうだん + 弾技 → ダメージ=0', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'ぼうだん' });
            const move = createMove({ name: 'シャドーボール', power: 80, type: 'ゴースト', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.rolls.every(r => r === 0)).toBe(true);
        });
    });

    describe('スキン特性', () => {
        it('エレキスキン + ノーマル技 → タイプ変更+×1.2', () => {
            const atk = createPokemon({ ability: 'エレキスキン' });
            const atkNoAbility = createPokemon({ ability: 'エレキスキン' });
            // ノーマルタイプ防御のポケモンでタイプ相性による差をなくす
            const def = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const move = createMove({ name: 'でんこうせっか', power: 40, type: 'ノーマル', category: 'Physical' });
            const moveElec = createMove({ name: 'でんこうせっか2', power: 40, type: 'でんき', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            // エレキスキンでノーマル→でんきにタイプ変更
            expect(result.moveType).toBe('でんき');
            // でんき技を直接使った場合（スキン補正なし）と比較して1.2倍の威力上昇
            const resultDirect = calculateDamage(atkNoAbility, def, moveElec);
            expect(result.max).toBeGreaterThan(resultDirect.max);
        });

        it('フェアリースキン + ノーマル技 → タイプ変更+×1.2', () => {
            const atk = createPokemon({ ability: 'フェアリースキン' });
            const def = createPokemon();
            const move = createMove({ name: 'でんこうせっか', power: 40, type: 'ノーマル', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.moveType).toBe('フェアリー');
        });

        it('エレキスキン + 非ノーマル技 → 効果なし', () => {
            const atk = createPokemon({ ability: 'エレキスキン' });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.moveType).toBe('ほのお');
        });
    });

    describe('ちからもち', () => {
        it('ちからもち + 物理技 → A×2.0 (4096基準補正)', () => {
            const atk = createPokemon({ ability: 'ちからもち' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNo.max);
            expect(result.abilityOffensiveInfo).toEqual({ name: 'ちからもち', multiplier: 2.0 });
        });

        it('ちからもち + 特殊技 → 効果なし', () => {
            const atk = createPokemon({ ability: 'ちからもち' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBe(resultNo.max);
        });

        it('ちからもち: 4096基準の端数処理が正しい', () => {
            // A=121 の場合: mod=Math.round(4096*2.0)=8192, pokeRound(121*8192/4096)=pokeRound(242)=242
            const atk = createPokemon({
                ability: 'ちからもち',
                realStats: { attack: 121, defence: 120, spAtk: 120, spDef: 120, speed: 120 }
            });
            const atkNoAbility = createPokemon({
                realStats: { attack: 242, defence: 120, spAtk: 120, spDef: 120, speed: 120 }
            });
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            // ちからもちA=121→242 と素のA=242 は同じダメージになるはず
            const result = calculateDamage(atk, def, move);
            const resultEquiv = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBe(resultEquiv.max);
        });
    });

    describe('ふゆう', () => {
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
            const resultNo = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBe(resultNo.max);
        });
    });

    describe('わざわい系特性', () => {
        it('わざわいのつるぎ (攻撃側) → D×0.75', () => {
            const atk = createPokemon({ ability: 'わざわいのつるぎ' });
            const atkNoAbility = createPokemon();
            const def = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atkNoAbility, def, move);
            expect(result.max).toBeGreaterThan(resultNo.max);
        });

        it('わざわいのおふだ (防御側) → A×0.75', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'わざわいのおふだ' });
            const defNoAbility = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBeLessThan(resultNo.max);
        });

        it('わざわい相殺: 双方同じわざわい → 効果なし', () => {
            const atk = createPokemon({ ability: 'わざわいのつるぎ' });
            const def = createPokemon({ ability: 'わざわいのつるぎ' });
            const atkNoAbility = createPokemon();
            const defNoAbility = createPokemon();
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const resultBoth = calculateDamage(atk, def, move);
            const resultNone = calculateDamage(atkNoAbility, defNoAbility, move);
            expect(resultBoth.max).toBe(resultNone.max);
        });
    });

    describe('HP満タンガード', () => {
        it('マルチスケイル + HP満タン → ダメージ×0.5', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'マルチスケイル', currentHp: 200, maxHp: 200 });
            const defNoAbility = createPokemon({ currentHp: 200, maxHp: 200 });
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBeLessThan(resultNo.max);
        });

        it('マルチスケイル + HP非満タン → 効果なし', () => {
            const atk = createPokemon();
            const def = createPokemon({ ability: 'マルチスケイル', currentHp: 199, maxHp: 200 });
            const defNoAbility = createPokemon({ currentHp: 199, maxHp: 200 });
            const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            const resultNo = calculateDamage(atk, defNoAbility, move);
            expect(result.max).toBe(resultNo.max);
        });
    });
});
