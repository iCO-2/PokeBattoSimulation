import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPokemon, createMove } from '../helpers/pokemonFactory.js';
import { MOCK_ITEMS_DEX, MOCK_ABILITIES_DEX, MOCK_MOVE_TYPE_MOVES } from '../helpers/mockData.js';

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
        ITEMS_DEX: MOCK_ITEMS_DEX,
        ABILITIES_DEX: MOCK_ABILITIES_DEX,
        MOVE_TYPE_MOVES: MOCK_MOVE_TYPE_MOVES,
        KNOWN_DAMAGE_MOVES: {},
        SPECIFIC_MOVES: {}
    });
});

describe('複合テスト', () => {
    it('STAB + 抜群: 両補正が乗算される', () => {
        const atk = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 }
        });
        const atkNoStab = createPokemon({
            speciesData: { types: ['ノーマル'], weight_kg: 50 }
        });
        const def = createPokemon({
            speciesData: { types: ['くさ'], weight_kg: 50 }
        });
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const resultStab = calculateDamage(atk, def, move);
        const resultNoStab = calculateDamage(atkNoStab, def, move);
        // STAB(1.5) × 抜群(2.0) → STABあり > STABなし
        expect(resultStab.max).toBeGreaterThan(resultNoStab.max);
    });

    it('天候 + STAB: 晴れ + ほのお族 + ほのお技', () => {
        const atk = createPokemon({
            speciesData: { types: ['ほのお'], weight_kg: 50 }
        });
        const def = createPokemon();
        const move = createMove({ power: 80, type: 'ほのお', category: 'Special' });

        const resultNone = calculateDamage(atk, def, move, { weather: 'none' });
        const resultSunny = calculateDamage(atk, def, move, { weather: 'sunny' });
        // 天候1.5 × STAB1.5 → 晴れ時の方が大きい
        expect(resultSunny.max).toBeGreaterThan(resultNone.max);
    });

    it('壁 + マルチスケイル: 0.5 × 0.5 の二重適用', () => {
        const atk = createPokemon();
        const defWall = createPokemon({ ability: 'マルチスケイル', currentHp: 200, maxHp: 200 });
        const defNoWall = createPokemon({ currentHp: 200, maxHp: 200 });
        const move = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

        const resultBoth = calculateDamage(atk, defWall, move, { wallReflect: true });
        const resultNone = calculateDamage(atk, defNoWall, move, {});
        // 壁(0.5) × マルチスケイル(0.5) → 約1/4
        expect(resultBoth.max).toBeLessThan(resultNone.max);
        // もっと正確に: 壁のみ
        const resultWallOnly = calculateDamage(atk, defNoWall, move, { wallReflect: true });
        expect(resultBoth.max).toBeLessThan(resultWallOnly.max);
    });

    it('持ち物 + 攻撃特性: こだわりハチマキ + がんじょうあご', () => {
        const atk = createPokemon({
            item: 'こだわりハチマキ',
            ability: 'がんじょうあご'
        });
        const atkItemOnly = createPokemon({ item: 'こだわりハチマキ' });
        const atkAbilityOnly = createPokemon({ ability: 'がんじょうあご' });
        const def = createPokemon();
        const move = createMove({ name: 'かみくだく', power: 80, type: 'あく', category: 'Physical' });

        const resultBoth = calculateDamage(atk, def, move);
        const resultItemOnly = calculateDamage(atkItemOnly, def, move);
        const resultAbilityOnly = calculateDamage(atkAbilityOnly, def, move);
        // 両方適用 > 片方のみ
        expect(resultBoth.max).toBeGreaterThan(resultItemOnly.max);
        expect(resultBoth.max).toBeGreaterThan(resultAbilityOnly.max);
    });

    it('わざわい + 持ち物: わざわいのつるぎ + とつげきチョッキ', () => {
        const atk = createPokemon({ ability: 'わざわいのつるぎ' });
        const atkNoAbility = createPokemon();
        const def = createPokemon({ item: 'とつげきチョッキ' });
        const defNoItem = createPokemon();
        const move = createMove({ power: 80, type: 'エスパー', category: 'Special' });

        // わざわいのつるぎはdefenceを弱化 → 特殊技なので影響しない
        // とつげきチョッキはspDefを1.5倍
        const resultBoth = calculateDamage(atk, def, move);
        const resultNoItem = calculateDamage(atk, defNoItem, move);
        // チョッキで特防上がっている分ダメージ減少
        expect(resultBoth.max).toBeLessThan(resultNoItem.max);

        // 物理技で検証: わざわいのつるぎ(D×0.75) + しんかのきせき(D×1.5)
        const defKiseki = createPokemon({ item: 'しんかのきせき' });
        const movePhys = createMove({ power: 80, type: 'かくとう', category: 'Physical' });

        const resultSwordKiseki = calculateDamage(atk, defKiseki, movePhys);
        const resultSwordNoItem = calculateDamage(atk, defNoItem, movePhys);
        const resultNoSwordKiseki = calculateDamage(atkNoAbility, defKiseki, movePhys);
        // わざわい(0.75)で防御減 + きせき(1.5)で防御増 → 両方適用
        expect(resultSwordKiseki.max).toBeLessThan(resultSwordNoItem.max); // きせきで防御増
        expect(resultSwordKiseki.max).toBeGreaterThan(resultNoSwordKiseki.max); // わざわいで防御減
    });
});
