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
import * as loader from '../../frontend/js/data/loader.js';

beforeEach(() => {
    Object.assign(loader, {
        ITEMS_DEX: {},
        ABILITIES_DEX: {},
        MOVE_TYPE_MOVES: {},
        KNOWN_DAMAGE_MOVES: {},
        SPECIFIC_MOVES: {},
        RECOIL_MOVES: {}
    });
});

// テラバーストは moves_data.json では Normal/Special だが、
// テスト内では type:'ノーマル', category:'Special' として生成する
const teraBlastMove = createMove({ name: 'テラバースト', power: 80, type: 'ノーマル', category: 'Special' });

describe('テラバースト', () => {
    describe('テラスタルなし', () => {
        it('テラなし → ノーマルタイプ・特殊技として計算（teraBlastInfo null）', () => {
            const atk = createPokemon({ teraType: 'なし' });
            const def = createPokemon();
            const result = calculateDamage(atk, def, teraBlastMove);
            expect(result.teraBlastInfo).toBeNull();
            expect(result.moveType).toBe('ノーマル');
        });
    });

    describe('テラスタル使用時のタイプ変化', () => {
        it('テラタイプ: ほのお → moveType が ほのお に変化', () => {
            const atk = createPokemon({
                teraType: 'ほのお',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({ speciesData: { types: ['くさ'], weight_kg: 50 } });
            const result = calculateDamage(atk, def, teraBlastMove);
            expect(result.moveType).toBe('ほのお');
            expect(result.teraBlastInfo).not.toBeNull();
            expect(result.teraBlastInfo.moveType).toBe('ほのお');
        });

        it('テラタイプ: みず → moveType が みず に変化', () => {
            const atk = createPokemon({
                teraType: 'みず',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({ speciesData: { types: ['ほのお'], weight_kg: 50 } });
            const result = calculateDamage(atk, def, teraBlastMove);
            expect(result.moveType).toBe('みず');
        });

        it('ステラ → moveType はノーマルのまま（teraBlastInfo.isStellar=true）', () => {
            const atk = createPokemon({
                teraType: 'ステラ',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon();
            const result = calculateDamage(atk, def, teraBlastMove);
            expect(result.teraBlastInfo).not.toBeNull();
            expect(result.teraBlastInfo.isStellar).toBe(true);
            expect(result.moveType).toBe('ノーマル');
        });
    });

    describe('物理/特殊の自動切り替え', () => {
        it('攻撃 > 特攻 → 物理技として計算（相手の防御参照）', () => {
            // realStats.attack=200, spAtk=100 → 物理
            const atk = createPokemon({
                teraType: 'ほのお',
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                realStats: { attack: 200, defence: 100, spAtk: 100, spDef: 100, speed: 100 }
            });
            // 相手の防御と特防を大きく変えて参照先を確認
            const defHighDef = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                realStats: { attack: 100, defence: 200, spAtk: 100, spDef: 50, speed: 100 }
            });
            const defHighSpDef = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                realStats: { attack: 100, defence: 50, spAtk: 100, spDef: 200, speed: 100 }
            });
            const resultHighDef = calculateDamage(atk, defHighDef, teraBlastMove);
            const resultHighSpDef = calculateDamage(atk, defHighSpDef, teraBlastMove);
            // 物理技なら防御が高いほうがダメージが少ない
            expect(resultHighDef.max).toBeLessThan(resultHighSpDef.max);
            expect(resultHighDef.teraBlastInfo.category).toBe('Physical');
        });

        it('特攻 > 攻撃 → 特殊技として計算（相手の特防参照）', () => {
            // realStats.spAtk=200, attack=100 → 特殊
            const atk = createPokemon({
                teraType: 'ほのお',
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                realStats: { attack: 100, defence: 100, spAtk: 200, spDef: 100, speed: 100 }
            });
            const defHighDef = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                realStats: { attack: 100, defence: 200, spAtk: 100, spDef: 50, speed: 100 }
            });
            const defHighSpDef = createPokemon({
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                realStats: { attack: 100, defence: 50, spAtk: 100, spDef: 200, speed: 100 }
            });
            const resultHighDef = calculateDamage(atk, defHighDef, teraBlastMove);
            const resultHighSpDef = calculateDamage(atk, defHighSpDef, teraBlastMove);
            // 特殊技なら特防が高いほうがダメージが少ない
            expect(resultHighSpDef.max).toBeLessThan(resultHighDef.max);
            expect(resultHighDef.teraBlastInfo.category).toBe('Special');
        });

        it('攻撃 = 特攻 → 特殊技として計算', () => {
            const atk = createPokemon({
                teraType: 'ほのお',
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                realStats: { attack: 150, defence: 100, spAtk: 150, spDef: 100, speed: 100 }
            });
            const def = createPokemon();
            const result = calculateDamage(atk, def, teraBlastMove);
            expect(result.teraBlastInfo.category).toBe('Special');
        });

        it('ランク補正を考慮した判定: 攻撃ランク+2で逆転', () => {
            // realStats: attack=100, spAtk=150 だが攻撃ランク+2で 200 > 150 → 物理
            const atk = createPokemon({
                teraType: 'ほのお',
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                realStats: { attack: 100, defence: 100, spAtk: 150, spDef: 100, speed: 100 },
                stats: { attack: { rank: 2 }, defence: { rank: 0 }, spAtk: { rank: 0 }, spDef: { rank: 0 }, speed: { rank: 0 } }
            });
            // ランク+2: 100 * 2.0 = 200 > 150 → 物理
            const def = createPokemon();
            const result = calculateDamage(atk, def, teraBlastMove);
            expect(result.teraBlastInfo.category).toBe('Physical');
        });
    });

    describe('ステラ状態', () => {
        it('ステラ → teraBlastInfo.isStellar=true、威力100（80より大きいダメージ）', () => {
            const atkStellar = createPokemon({
                teraType: 'ステラ',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const atkNoTera = createPokemon({
                teraType: 'なし',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon();
            const resultStellar = calculateDamage(atkStellar, def, teraBlastMove);
            const resultNoTera = calculateDamage(atkNoTera, def, teraBlastMove);
            expect(resultStellar.teraBlastInfo).not.toBeNull();
            expect(resultStellar.teraBlastInfo.isStellar).toBe(true);
            // 威力100 > 80 → ダメージ増加
            expect(resultStellar.max).toBeGreaterThan(resultNoTera.max);
        });

        it('ステラ → moveType は変化しない（ノーマルのまま）', () => {
            const atk = createPokemon({ teraType: 'ステラ' });
            const def = createPokemon();
            const result = calculateDamage(atk, def, teraBlastMove);
            expect(result.moveType).toBe('ノーマル');
        });

        it('ステラ + 相手がテラ中 → typeMod が強制2倍', () => {
            const atk = createPokemon({
                teraType: 'ステラ',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            // 本来ノーマル技はゴーストに無効(0倍)だが、相手がテラ中なら2倍になる
            const defTera = createPokemon({
                teraType: 'ゴースト',
                speciesData: { types: ['ゴースト'], weight_kg: 50 }
            });
            const defNoTera = createPokemon({
                teraType: 'なし',
                speciesData: { types: ['ゴースト'], weight_kg: 50 }
            });
            const resultVsTera = calculateDamage(atk, defTera, teraBlastMove);
            const resultVsNoTera = calculateDamage(atk, defNoTera, teraBlastMove);
            // テラ中の相手には2倍（ダメージあり）
            expect(resultVsTera.max).toBeGreaterThan(0);
            expect(resultVsTera.typeMod).toBe(2);
            // 非テラには通常通り（ゴーストには0倍）
            expect(resultVsNoTera.max).toBe(0);
        });

        it('ステラ + 相手がテラなし → typeMod は通常通り', () => {
            const atk = createPokemon({
                teraType: 'ステラ',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const def = createPokemon({
                teraType: 'なし',
                speciesData: { types: ['ノーマル'], weight_kg: 50 }
            });
            const result = calculateDamage(atk, def, teraBlastMove);
            // ノーマル vs ノーマル → 等倍（1倍）
            expect(result.typeMod).toBe(1);
        });

        it('ステラ + 攻撃 > 特攻 → 物理技として計算', () => {
            const atk = createPokemon({
                teraType: 'ステラ',
                speciesData: { types: ['ノーマル'], weight_kg: 50 },
                realStats: { attack: 200, defence: 100, spAtk: 100, spDef: 100, speed: 100 }
            });
            const def = createPokemon();
            const result = calculateDamage(atk, def, teraBlastMove);
            expect(result.teraBlastInfo.category).toBe('Physical');
        });
    });

    describe('STAB補正', () => {
        it('テラタイプ=元タイプ一致 → STAB 2.0倍', () => {
            // ほのおタイプがほのおテラ → teraMatch & originalMatch → stabMod=2.0
            const atkTera = createPokemon({
                teraType: 'ほのお',
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const atkNoTera = createPokemon({
                teraType: 'なし',
                speciesData: { types: ['ほのお'], weight_kg: 50 }
            });
            const def = createPokemon();
            const resultTera = calculateDamage(atkTera, def, teraBlastMove);
            const resultNoTera = calculateDamage(atkNoTera, def, teraBlastMove);
            // テラ時のほうがSTAB強化されてダメージが大きい
            expect(resultTera.max).toBeGreaterThan(resultNoTera.max);
        });

        it('テラタイプ=元タイプ不一致 → STAB 1.5倍', () => {
            // みずタイプがほのおテラ → teraMatch only → stabMod=1.5
            const atkTera = createPokemon({
                teraType: 'ほのお',
                speciesData: { types: ['みず'], weight_kg: 50 }
            });
            const atkNoTera = createPokemon({
                teraType: 'なし',
                speciesData: { types: ['みず'], weight_kg: 50 }
            });
            const def = createPokemon();
            const resultTera = calculateDamage(atkTera, def, teraBlastMove);
            const resultNoTera = calculateDamage(atkNoTera, def, teraBlastMove);
            expect(resultTera.max).toBeGreaterThan(resultNoTera.max);
        });
    });
});
