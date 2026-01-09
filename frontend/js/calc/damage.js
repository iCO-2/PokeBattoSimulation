import { getTypeEffectiveness } from '../data/types.js';

export function calculateDamage(attacker, defender, move, field = {}) {
    // 0. 基本情報取得
    const level = attacker.level;
    const power = move.power || 0;
    if (power === 0) return { min: 0, max: 0, rolls: [] }; // 変化技など

    // 攻撃・防御実数値の決定 (物理/特殊)
    let aStr = 'attack';
    let dStr = 'defense';
    if (move.category === 'Special') {
        aStr = 'spAtk';
        dStr = 'spDef';
    } else if (move.category === 'Physical') {
        // イカサマなどは考慮せずシンプルに
    }

    // ステータスランク補正は未実装（今回は実数値直接利用とみなす）
    const A = attacker.realStats[aStr];
    const D = defender.realStats[dStr];

    // 1. ダメージ計算の基礎
    // Floor(Floor(Floor(Lv * 2 / 5 + 2) * Power * A / D) / 50) + 2
    let baseDamage = Math.floor(Math.floor(Math.floor(level * 2 / 5 + 2) * power * A / D) / 50) + 2;

    // 2. 補正 (簡易実装)
    
    // 天候: なし
    // 急所: 1.5倍 (リフレクター無視等は未実装)
    if (attacker.conditions && attacker.conditions.isCrit) {
        baseDamage = Math.floor(baseDamage * 1.5);
    }
    
    // 乱数 (0.85 ~ 1.00) を適用する前の値を保持して、最後にリスト生成する
    
    // タイプ一致 (STAB): 1.5倍
    // テラスタルは考慮せず、元のタイプで判定 (speciesData)
    const attackerTypes = attacker.speciesData ? attacker.speciesData.types : [];
    const isSTAB = attackerTypes.includes(move.type); // テラスタル時はteraTypeで判定すべきだが一旦省略
    let stabMod = isSTAB ? 1.5 : 1.0;
    
    // タイプ相性
    const defenderTypes = defender.speciesData ? defender.speciesData.types : [];
    const typeMod = getTypeEffectiveness(move.type, defenderTypes);
    
    // 状態異常(やけど): 物理なら0.5 (未実装)

    // 壁(リフレクター/光の壁): 防御側
    // 複数対象補正: 0.75

    // 最終ダメージ算出ループ (16段階乱数)
    const rolls = [];
    for (let i = 85; i <= 100; i++) {
        let dmg = baseDamage;
        
        // 乱数以外を適用
        dmg = Math.floor(dmg * stabMod);
        dmg = Math.floor(dmg * typeMod);

        // 乱数 (0.85 .. 1.00 -> logic is `dmg * i / 100`)
        dmg = Math.floor(dmg * i / 100);
        
        if (dmg < 1) dmg = 1; // 最低1ダメージ (タイプ無効0倍は別途)
        if (typeMod === 0) dmg = 0;

        rolls.push(dmg);
    }

    return {
        min: rolls[0],
        max: rolls[rolls.length - 1],
        rolls: rolls,
        typeMod: typeMod
    };
}
