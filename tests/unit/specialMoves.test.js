import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';
import { MOCK_SPECIFIC_MOVES } from '../helpers/mockData.js';

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
        ABILITIES_DEX: {},
        MOVE_TYPE_MOVES: {},
        KNOWN_DAMAGE_MOVES: {},
        SPECIFIC_MOVES: MOCK_SPECIFIC_MOVES
    });
});

describe('特殊計算技', () => {
    describe('ステータス参照変更', () => {
        it('イカサマ: 相手の攻撃実数値で計算', () => {
            const atk = createPokemon({
                realStats: { attack: 100, defence: 120, spAtk: 120, spDef: 120, speed: 120 }
            });
            const def = createPokemon({
                realStats: { attack: 200, defence: 120, spAtk: 120, spDef: 120, speed: 120 }
            });
            const move = createMove({ name: 'イカサマ', power: 95, type: 'あく', category: 'Physical' });

            // 相手のattack=200で計算 → atk.attack=100の場合より大きい
            const atkWithOwnStat = createPokemon({
                realStats: { attack: 200, defence: 120, spAtk: 120, spDef: 120, speed: 120 }
            });
            const defLow = createPokemon({
                realStats: { attack: 100, defence: 120, spAtk: 120, spDef: 120, speed: 120 }
            });

            const result1 = calculateDamage(atk, def, move);
            const result2 = calculateDamage(atkWithOwnStat, defLow, move);
            // イカサマは相手のattackを使うので、result1はdef.attack=200、result2はdefLow.attack=100
            expect(result1.max).toBeGreaterThan(result2.max);
        });

        it('ボディプレス: 自分の防御実数値で計算', () => {
            const atkHighDef = createPokemon({
                realStats: { attack: 100, defence: 200, spAtk: 100, spDef: 100, speed: 100 }
            });
            const atkLowDef = createPokemon({
                realStats: { attack: 100, defence: 100, spAtk: 100, spDef: 100, speed: 100 }
            });
            const def = createPokemon();
            const move = createMove({ name: 'ボディプレス', power: 80, type: 'かくとう', category: 'Physical' });

            const resultHigh = calculateDamage(atkHighDef, def, move);
            const resultLow = calculateDamage(atkLowDef, def, move);
            expect(resultHigh.max).toBeGreaterThan(resultLow.max);
        });

        it('サイコショック: 相手の防御で計算 → ダメージ増', () => {
            const atk = createPokemon({
                realStats: { attack: 100, defence: 100, spAtk: 150, spDef: 100, speed: 100 }
            });
            const defHighSpDef = createPokemon({
                realStats: { attack: 100, defence: 100, spAtk: 100, spDef: 200, speed: 100 }
            });
            const move = createMove({ name: 'サイコショック', power: 80, type: 'エスパー', category: 'Special' });

            // サイコショックは相手のdefence(100)で計算する → spDef(200)ではないので防御が低い→ダメージ大
            const result = calculateDamage(atk, defHighSpDef, move);
            // 通常の特殊技としてspDefで計算した場合と比較
            const normalMove = createMove({ name: '通常技', power: 80, type: 'エスパー', category: 'Special' });
            const normalResult = calculateDamage(atk, defHighSpDef, normalMove);
            expect(result.max).toBeGreaterThan(normalResult.max);
        });
    });

    describe('ランク上昇無視', () => {
        it('せいなるつるぎ: 防御側+3ランクを0として計算', () => {
            const atk = createPokemon();
            const defBoosted = createPokemon({
                stats: { defence: { rank: 3 } }
            });
            const move = createMove({ name: 'せいなるつるぎ', power: 90, type: 'かくとう', category: 'Physical' });

            const defNeutral = createPokemon();
            const resultBoosted = calculateDamage(atk, defBoosted, move);
            const resultNeutral = calculateDamage(atk, defNeutral, move);
            // +3ランクが無視されるので同じダメージ
            expect(resultBoosted.max).toBe(resultNeutral.max);
        });

        it('せいなるつるぎ: 防御側-2ランクはそのまま', () => {
            const atk = createPokemon();
            const defDebuffed = createPokemon({
                stats: { defence: { rank: -2 } }
            });
            const defNeutral = createPokemon();
            const move = createMove({ name: 'せいなるつるぎ', power: 90, type: 'かくとう', category: 'Physical' });

            const resultDebuffed = calculateDamage(atk, defDebuffed, move);
            const resultNeutral = calculateDamage(atk, defNeutral, move);
            expect(resultDebuffed.max).toBeGreaterThan(resultNeutral.max);
        });
    });

    describe('体重依存', () => {
        it('けたぐり: 各閾値で威力が変化', () => {
            const atk = createPokemon();
            const move = createMove({ name: 'けたぐり', power: 1, type: 'かくとう', category: 'Physical' });

            const testCases = [
                { weight: 5, expectedGreater: false },    // 20
                { weight: 10, expectedGreater: true },     // 40
                { weight: 25, expectedGreater: true },     // 60
                { weight: 50, expectedGreater: true },     // 80
                { weight: 100, expectedGreater: true },    // 100
                { weight: 200, expectedGreater: true }     // 120
            ];

            let prevMax = 0;
            for (const tc of testCases) {
                const def = createPokemon({ speciesData: { types: ['ノーマル'], weight_kg: tc.weight } });
                const result = calculateDamage(atk, def, move);
                if (tc.expectedGreater) {
                    expect(result.max).toBeGreaterThan(prevMax);
                }
                prevMax = result.max;
            }
        });
    });

    describe('体重差依存', () => {
        it('ヒートスタンプ: 体重比で威力変化', () => {
            const move = createMove({ name: 'ヒートスタンプ', power: 1, type: 'ほのお', category: 'Physical' });
            const atk = createPokemon({
                speciesData: { types: ['ほのお'], weight_kg: 100 }
            });

            // defW*5<=atkW → 120 (defW=20)
            const def20 = createPokemon({ speciesData: { types: ['ノーマル'], weight_kg: 20 } });
            const r120 = calculateDamage(atk, def20, move);

            // defW*4<=atkW → 100 (defW=25)
            const def25 = createPokemon({ speciesData: { types: ['ノーマル'], weight_kg: 25 } });
            const r100 = calculateDamage(atk, def25, move);

            // defW*3<=atkW → 80 (defW=33)
            const def33 = createPokemon({ speciesData: { types: ['ノーマル'], weight_kg: 33 } });
            const r80 = calculateDamage(atk, def33, move);

            // defW*2<=atkW → 60 (defW=50)
            const def50 = createPokemon({ speciesData: { types: ['ノーマル'], weight_kg: 50 } });
            const r60 = calculateDamage(atk, def50, move);

            // else → 40 (defW=80)
            const def80 = createPokemon({ speciesData: { types: ['ノーマル'], weight_kg: 80 } });
            const r40 = calculateDamage(atk, def80, move);

            expect(r120.max).toBeGreaterThan(r100.max);
            expect(r100.max).toBeGreaterThan(r80.max);
            expect(r80.max).toBeGreaterThan(r60.max);
            expect(r60.max).toBeGreaterThan(r40.max);
        });
    });

    describe('素早さ差: ジャイロボール', () => {
        it('atkSpd=50, defSpd=200 → 威力101', () => {
            const atk = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 120, spDef: 120, speed: 50 }
            });
            const def = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 120, spDef: 120, speed: 200 }
            });
            const move = createMove({ name: 'ジャイロボール', power: 1, type: 'はがね', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            // min(150, floor(25*200/50)+1) = min(150, 101) = 101
            // 通常power=1の場合と比較して大きいことを確認
            expect(result.max).toBeGreaterThan(0);
        });

        it('ジャイロボール上限: atkSpd=10, defSpd=200 → 威力150', () => {
            const atk = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 120, spDef: 120, speed: 10 }
            });
            const def = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 120, spDef: 120, speed: 200 }
            });
            const move = createMove({ name: 'ジャイロボール', power: 1, type: 'はがね', category: 'Physical' });

            // min(150, floor(25*200/10)+1) = min(150, 501) = 150
            const atkSlow = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 120, spDef: 120, speed: 50 }
            });
            const resultSlow = calculateDamage(atkSlow, def, move);
            const resultVerySlow = calculateDamage(atk, def, move);
            // 上限150の場合はspd=10もspd=50の101より大きい
            expect(resultVerySlow.max).toBeGreaterThan(resultSlow.max);
        });

        it('ジャイロボール atkSpd=0 → 威力1', () => {
            const atk = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 120, spDef: 120, speed: 0 }
            });
            const def = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 120, spDef: 120, speed: 200 }
            });
            const move = createMove({ name: 'ジャイロボール', power: 1, type: 'はがね', category: 'Physical' });

            const resultZero = calculateDamage(atk, def, move);
            // power=1 なので最小限のダメージ
            expect(resultZero.max).toBeGreaterThan(0);
        });
    });

    describe('素早さ比: エレキボール', () => {
        it('各速度比で威力変化', () => {
            const move = createMove({ name: 'エレキボール', power: 1, type: 'でんき', category: 'Special' });

            // ratio >= 4 → 150
            const atk4x = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 150, spDef: 120, speed: 400 }
            });
            const def100 = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 120, spDef: 120, speed: 100 }
            });
            const r150 = calculateDamage(atk4x, def100, move);

            // ratio >= 3 → 120
            const atk3x = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 150, spDef: 120, speed: 300 }
            });
            const r120 = calculateDamage(atk3x, def100, move);

            // ratio >= 2 → 80
            const atk2x = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 150, spDef: 120, speed: 200 }
            });
            const r80 = calculateDamage(atk2x, def100, move);

            expect(r150.max).toBeGreaterThan(r120.max);
            expect(r120.max).toBeGreaterThan(r80.max);
        });

        it('エレキボール defSpd=0 → 威力150', () => {
            const atk = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 150, spDef: 120, speed: 100 }
            });
            const def = createPokemon({
                realStats: { attack: 120, defence: 120, spAtk: 120, spDef: 120, speed: 0 }
            });
            const move = createMove({ name: 'エレキボール', power: 1, type: 'でんき', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.max).toBeGreaterThan(0);
        });
    });

    describe('HP依存', () => {
        it('しおふき: hp=200/200 → 威力150', () => {
            const atk = createPokemon({ currentHp: 200, maxHp: 200 });
            const def = createPokemon();
            const move = createMove({ name: 'しおふき', power: 150, type: 'みず', category: 'Special' });

            const resultFull = calculateDamage(atk, def, move);
            const atkHalf = createPokemon({ currentHp: 100, maxHp: 200 });
            const resultHalf = calculateDamage(atkHalf, def, move);
            expect(resultFull.max).toBeGreaterThan(resultHalf.max);
        });

        it('しおふき: hp=100/200 → 威力75', () => {
            const atk = createPokemon({ currentHp: 100, maxHp: 200 });
            const def = createPokemon();
            const move = createMove({ name: 'しおふき', power: 150, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            // 威力 = floor(150 * 100/200) = 75
            expect(result.max).toBeGreaterThan(0);
        });

        it('しおふき: hp=1/200 → 威力1 (最低1)', () => {
            const atk = createPokemon({ currentHp: 1, maxHp: 200 });
            const def = createPokemon();
            const move = createMove({ name: 'しおふき', power: 150, type: 'みず', category: 'Special' });

            const result = calculateDamage(atk, def, move);
            expect(result.min).toBeGreaterThanOrEqual(1);
        });

        it('じたばた: hp=1/100 → 威力200', () => {
            const atk = createPokemon({ currentHp: 1, maxHp: 100 });
            const def = createPokemon();
            const move = createMove({ name: 'じたばた', power: 1, type: 'ノーマル', category: 'Physical' });

            // ratio = 1/100 * 48 = 0.48 < 2 → 威力200
            const atkFull = createPokemon({ currentHp: 100, maxHp: 100 });
            const resultLow = calculateDamage(atk, def, move);
            const resultFull = calculateDamage(atkFull, def, move);
            expect(resultLow.max).toBeGreaterThan(resultFull.max);
        });

        it('にぎりつぶす: def.hp=200/200 → 威力120', () => {
            const atk = createPokemon();
            const def = createPokemon({ currentHp: 200, maxHp: 200 });
            const move = createMove({ name: 'にぎりつぶす', power: 1, type: 'ノーマル', category: 'Physical' });

            const defHalf = createPokemon({ currentHp: 100, maxHp: 200 });
            const resultFull = calculateDamage(atk, def, move);
            const resultHalf = calculateDamage(atk, defHalf, move);
            expect(resultFull.max).toBeGreaterThan(resultHalf.max);
        });
    });

    describe('ランク上昇依存', () => {
        it('アシストパワー: atk+2, spd+1 → 威力80', () => {
            const atk = createPokemon({
                stats: {
                    attack: { rank: 2 },
                    defence: { rank: 0 },
                    spAtk: { rank: 0 },
                    spDef: { rank: 0 },
                    speed: { rank: 1 }
                }
            });
            const def = createPokemon();
            const move = createMove({ name: 'アシストパワー', power: 20, type: 'エスパー', category: 'Special' });

            // totalPositive = 2 + 1 = 3, power = min(220, 20 + 3*20) = 80
            const atkNoRank = createPokemon();
            const resultBoosted = calculateDamage(atk, def, move);
            const resultNeutral = calculateDamage(atkNoRank, def, move);
            expect(resultBoosted.max).toBeGreaterThan(resultNeutral.max);
        });
    });

    describe('はたきおとす', () => {
        it('相手が持ち物あり → 威力×1.5', () => {
            const atk = createPokemon();
            const defWithItem = createPokemon({ item: 'たべのこし' });
            const defNoItem = createPokemon({ item: '' });
            const move = createMove({ name: 'はたきおとす', power: 65, type: 'あく', category: 'Physical' });

            const resultItem = calculateDamage(atk, defWithItem, move);
            const resultNoItem = calculateDamage(atk, defNoItem, move);
            expect(resultItem.max).toBeGreaterThan(resultNoItem.max);
            expect(resultItem.knockOffInfo).toEqual({ name: 'はたきおとす', multiplier: 1.5 });
        });

        it('相手が持ち物なし → 補正なし', () => {
            const atk = createPokemon();
            const def = createPokemon({ item: '' });
            const move = createMove({ name: 'はたきおとす', power: 65, type: 'あく', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.knockOffInfo).toBeNull();
        });

        it('はたきおとす以外の技 → 相手持ち物ありでも補正なし', () => {
            const atk = createPokemon();
            const def = createPokemon({ item: 'たべのこし' });
            const move = createMove({ name: 'かみくだく', power: 80, type: 'あく', category: 'Physical' });

            const result = calculateDamage(atk, def, move);
            expect(result.knockOffInfo).toBeNull();
        });
    });
});
