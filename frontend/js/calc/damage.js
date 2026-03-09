import { getTypeEffectiveness } from '../data/types.js';
import { ITEMS_DEX, ABILITIES_DEX, MOVE_TYPE_MOVES } from '../data/loader.js?v=4';

/**
 * ランク補正倍率を取得
 * -6: ÷4.0, -5: ÷3.5, -4: ÷3.0, -3: ÷2.5, -2: ÷2.0, -1: ÷1.5
 *  0: x1.0
 * +1: x1.5, +2: x2.0, +3: x2.5, +4: x3.0, +5: x3.5, +6: x4.0
 */
export function getRankMultiplier(rank) {
    if (rank === 0) return 1.0;
    if (rank > 0) return 1 + rank * 0.5; // +1→1.5, +2→2.0, ...
    // rank < 0: ÷1.5, ÷2.0, ... (reciprocal)
    return 1 / (1 + Math.abs(rank) * 0.5);
}

export function calculateDamage(attacker, defender, move, field = {}) {

    // 0. 基本情報取得
    const level = attacker.level;
    const power = move.power || 0;
    if (power === 0) return { min: 0, max: 0, rolls: [] }; // 変化技など

    // 攻撃・防御実数値の決定 (物理/特殊)
    let aStr = 'attack';
    let dStr = 'defence';
    if (move.category === 'Special') {
        aStr = 'spAtk';
        dStr = 'spDef';
    } else if (move.category === 'Physical') {
        // イカサマなどは考慮せずシンプルに
    }

    // ステータス実数値にランク補正を適用
    const attackerRank = attacker.stats[aStr] ? attacker.stats[aStr].rank || 0 : 0;
    const defenderRank = defender.stats[dStr] ? defender.stats[dStr].rank || 0 : 0;
    

    
    let A = Math.floor(attacker.realStats[aStr] * getRankMultiplier(attackerRank));
    let D = Math.floor(defender.realStats[dStr] * getRankMultiplier(defenderRank));

    // 持ち物補正（攻撃/特攻アップ系・ダメージアップ系）
    const attackerItem = ITEMS_DEX[attacker.item];
    let itemModifier = null;
    if (attackerItem && attackerItem.type === 'stat_modifier' && attackerItem.stat === aStr) {
        A = Math.floor(A * attackerItem.multiplier);
        itemModifier = {
            type: 'stat_modifier',
            name: attacker.item,
            stat: aStr,
            multiplier: attackerItem.multiplier
        };
    } else if (attackerItem && attackerItem.type === 'damage_boost') {
        itemModifier = {
            type: 'damage_boost',
            name: attacker.item,
            multiplier: attackerItem.multiplier
        };
    }

    // 特性補正
    const moveName = move.name || '';
    let moveType = move.type || 'ノーマル';

    let abilityOffensiveMod = 1.0;
    let abilityDefensiveMod = 1.0;
    let abilityOffensiveInfo = null;
    let abilityDefensiveInfo = null;

    // 攻撃側の特性 (offensive)
    const attackerAbilityData = ABILITIES_DEX[attacker.ability];
    if (attackerAbilityData && attackerAbilityData.type !== 'dezaster') {
        const abilityType = attackerAbilityData.type;
        const movesSet = MOVE_TYPE_MOVES[abilityType];
        if (movesSet && movesSet.has(moveName)) {
            abilityOffensiveMod = attackerAbilityData.offensive;
            // 倍率が1.0以外のときだけ結果表示に含める
            if (abilityOffensiveMod !== 1.0) {
                abilityOffensiveInfo = {
                    name: attacker.ability,
                    multiplier: abilityOffensiveMod
                };
            }
        }

        // スキン系特性: ノーマル技のタイプを変更し威力を1.2倍
        const SKIN_TYPE_MAP = {
            'エレキスキン': 'でんき',
            'フェアリースキン': 'フェアリー',
            'スカイスキン': 'ひこう',
            'フリーズスキン': 'こおり'
        };
        if (attackerAbilityData.type === 'skin' && moveType === 'ノーマル') {
            moveType = SKIN_TYPE_MAP[attacker.ability] || moveType;
            abilityOffensiveMod = attackerAbilityData.offensive;
            abilityOffensiveInfo = {
                name: attacker.ability,
                multiplier: abilityOffensiveMod
            };
        }

        // is_special: true 特性の追加処理（枠組み）
        if (attackerAbilityData.is_special) {
            switch (attacker.ability) {
                case 'うるおいボイス':
                    // TODO: 自身が使う音技が全てみずタイプになる
                    break;
                case 'おどりこ':
                    // TODO: 誰かが踊る技を使うと自分もそれに続いてその踊る技を出せる
                    break;
                case 'メガランチャー':
                    // TODO: 「いやしのはどう」は最大HPの3/4回復する（波動技の1.5倍はこの上の処理で適用済み）
                    break;
                default:
                    // その他の特殊攻撃特性の処理
                    break;
            }
        }
    }

    // 防御側の特性 (defensive)
    const defenderAbilityData = ABILITIES_DEX[defender.ability];
    if (defenderAbilityData && defenderAbilityData.type !== 'dezaster') {
        const defType = defenderAbilityData.type;
        const defMovesSet = MOVE_TYPE_MOVES[defType];
        if (defMovesSet && defMovesSet.has(moveName)) {
            abilityDefensiveMod = defenderAbilityData.defensive;
            // 倍率が1.0以外のとき(無効化の0.0等)だけ結果表示に含める
            if (abilityDefensiveMod !== 1.0) {
                abilityDefensiveInfo = {
                    name: defender.ability,
                    multiplier: abilityDefensiveMod
                };
            }
        }

        // is_special: true 特性の追加処理（枠組み）
        if (defenderAbilityData.is_special) {
            switch (defender.ability) {
                case 'かぜのり':
                    // TODO: ダメージ無効化(0倍)はこの上の処理で適用済み。ここでは攻撃を1段階上げる処理
                    break;
                case 'ふうりょくでんき':
                    // TODO: 風技を受けると「じゅうでん」状態になり、でんきタイプの技の威力を1度だけ2倍にする処理
                    break;
                case 'がんじょう':
                    // TODO: 残りHPがマックスのときは、一撃で倒れずに1残る（致死ダメージ判定後に行う必要あり）
                    break;
                default:
                    // その他の特殊防御特性の処理
                    break;
            }
        }
    }

    // 攻撃側特性補正を攻撃力に適用
    if (abilityOffensiveMod !== 1.0) {
        A = Math.floor(A * abilityOffensiveMod);
    }

    // わざわい系特性 (dezaster) のステータス弱体化補正
    // weakken_statsで指定されたステータスを相手側で0.75倍にする
    let dezasterInfo = null;

    // 攻撃側のわざわい系 → 防御側のステータス(D)を弱体化
    if (attackerAbilityData && attackerAbilityData.type === 'dezaster' && attackerAbilityData.weaken !== 1.0) {
        if (attackerAbilityData.weakken_stats === dStr) {
            D = Math.floor(D * attackerAbilityData.weaken);
            dezasterInfo = { name: attacker.ability, stat: dStr, multiplier: attackerAbilityData.weaken, side: 'attacker' };
        }
    }

    // 防御側のわざわい系 → 攻撃側のステータス(A)を弱体化
    if (defenderAbilityData && defenderAbilityData.type === 'dezaster' && defenderAbilityData.weaken !== 1.0) {
        if (defenderAbilityData.weakken_stats === aStr) {
            A = Math.floor(A * defenderAbilityData.weaken);
            dezasterInfo = { name: defender.ability, stat: aStr, multiplier: defenderAbilityData.weaken, side: 'defender' };
        }
    }


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
    
    // タイプ一致 (STAB): テラスタル対応
    const originalTypes = attacker.speciesData ? attacker.speciesData.types : [];
    const attackerTera = attacker.teraType && attacker.teraType !== 'なし' ? attacker.teraType : null;
    const isAttackerStellar = attackerTera === 'ステラ';
    
    let stabMod = 1.0;
    let stellarBoosted = false; // ステラボーナスが適用されたかどうか
    
    if (isAttackerStellar) {
        // ステラテラス: 使用済みタイプかどうかチェック
        const alreadyUsed = attacker.stellarUsedTypes && attacker.stellarUsedTypes.has(moveType);
        const originalMatch = originalTypes.includes(moveType);
        if (!alreadyUsed) {
            // 初回使用: 元タイプ一致 → 2.0倍、不一致 → 1.2倍
            stabMod = originalMatch ? 2.0 : 1.2;
            stellarBoosted = true;
        } else {
            // 2回目以降: 通常ルール（元タイプ一致なら1.5倍、不一致なら1.0倍）
            stabMod = originalMatch ? 1.5 : 1.0;
        }
    } else if (attackerTera) {
        // 通常テラスタル: テラスタイプ＋元タイプ両方一致 → 2.0倍、片方一致 → 1.5倍
        const teraMatch = moveType === attackerTera;
        const originalMatch = originalTypes.includes(moveType);
        if (teraMatch && originalMatch) {
            stabMod = 2.0;
        } else if (teraMatch || originalMatch) {
            stabMod = 1.5;
        }
    } else {
        // テラスタルなし: 通常STAB
        const isSTAB = originalTypes.includes(moveType);
        stabMod = isSTAB ? 1.5 : 1.0;
    }
    
    // タイプ相性: 防御側テラスタル対応
    const defenderTera = defender.teraType && defender.teraType !== 'なし' ? defender.teraType : null;
    const isDefenderStellar = defenderTera === 'ステラ';
    // ステラテラスの防御側は元タイプを維持する
    const defenderTypes = (defenderTera && !isDefenderStellar) ? [defenderTera] : (defender.speciesData ? defender.speciesData.types : []);
    const typeMod = getTypeEffectiveness(moveType, defenderTypes);
    

    
    // 状態異常(やけど): 物理なら0.5 (未実装)

    // 壁(リフレクター/光の壁): 防御側
    // 複数対象補正: 0.75

    // 最終ダメージ算出ループ (16段階乱数)
    const rolls = [];
    for (let i = 85; i <= 100; i++) {
        let dmg = baseDamage;
        
        // 1. 乱数 (0.85 .. 1.00)
        dmg = Math.floor(dmg * i / 100);

        // 2. タイプ一致 (STAB)
        dmg = Math.floor(dmg * stabMod);

        // 3. タイプ相性
        dmg = Math.floor(dmg * typeMod);

        // 4. ダメージ補正（いのちのたま等）
        if (attackerItem && attackerItem.type === 'damage_boost') {
            dmg = Math.floor(dmg * attackerItem.multiplier);
        }

        // 5. 防御側特性補正 (defensive)
        if (abilityDefensiveMod !== 1.0) {
            dmg = Math.floor(dmg * abilityDefensiveMod);
        }
        
        if (dmg < 1) dmg = 1; // 最低1ダメージ (タイプ無効0倍は別途)
        if (typeMod === 0) dmg = 0;
        // 防御側特性で無効化 (defensive=0)
        if (abilityDefensiveMod === 0) dmg = 0;

        rolls.push(dmg);
    }
    
    return {
        min: rolls[0],
        max: rolls[rolls.length - 1],
        rolls: rolls,
        typeMod: typeMod,
        itemModifier: itemModifier,
        stellarBoosted: stellarBoosted,
        moveType: moveType,
        abilityOffensiveInfo: abilityOffensiveInfo,
        abilityDefensiveInfo: abilityDefensiveInfo,
        dezasterInfo: dezasterInfo
    };
}
