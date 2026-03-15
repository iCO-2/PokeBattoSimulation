import { getTypeEffectiveness } from '../data/types.js';
import { ITEMS_DEX, ABILITIES_DEX, MOVE_TYPE_MOVES, KNOWN_DAMAGE_MOVES, SPECIFIC_MOVES } from '../data/loader.js?v=7';

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
    const moveName = move.name || '';

    // 固定ダメージ技の早期リターン
    const knownDmg = KNOWN_DAMAGE_MOVES[moveName];
    if (knownDmg) {
        let fixedDmg = 0;
        const dmgType = knownDmg.damage_type;

        if (dmgType === 'fixed_value') {
            fixedDmg = knownDmg.damage_value;
        } else if (dmgType === 'ratio_value') {
            fixedDmg = Math.floor(defender.currentHp * knownDmg.damage_value);
        } else if (dmgType === 'special_value') {
            if (moveName === 'がむしゃら') {
                fixedDmg = Math.max(0, defender.currentHp - attacker.currentHp);
            } else if (moveName === 'いのちがけ') {
                fixedDmg = attacker.currentHp;
            } else if (moveName === 'いたみわけ') {
                const avgHp = Math.floor((attacker.currentHp + defender.currentHp) / 2);
                fixedDmg = Math.max(0, defender.currentHp - avgHp);
            }
        }

        return {
            min: fixedDmg,
            max: fixedDmg,
            rolls: [fixedDmg],
            isKnownDamage: true,
            knownDamageType: dmgType,
            moveName: moveName,
            typeMod: null,
            itemModifier: null,
            defenderItemModifier: null,
            stellarBoosted: false,
            moveType: move.type || 'ノーマル',
            abilityOffensiveInfo: null,
            abilityDefensiveInfo: null,
            dezasterInfo: null,
            areaModifier: null,
            weatherDefModifier: null,
            wallInfo: null
        };
    }

    const power = move.power || 0;
    const specificMove = SPECIFIC_MOVES[moveName];
    if (power === 0 && !specificMove) return { min: 0, max: 0, rolls: [] }; // 変化技など

    // 攻撃・防御実数値の決定 (物理/特殊)
    let aStr = 'attack';
    let dStr = 'defence';
    if (move.category === 'Special') {
        aStr = 'spAtk';
        dStr = 'spDef';
    }

    // 特殊技: ステータス参照先・ソースポケモンの決定
    let aSrc = attacker;   // A計算に使うポケモン
    let aStat = aStr;      // A計算に使うステータスキー
    let dSrc = defender;   // D計算に使うポケモン
    let dStat = dStr;      // D計算に使うステータスキー

    if (specificMove && specificMove.depend_on_other_stats) {
        const changeStat = specificMove.change_target_stats;
        const afterTarget = specificMove.change_target_after;
        const afterStat = specificMove.change_target_stats_after;
        const afterSource = afterTarget === 'ennemy' ? defender : attacker;

        if (changeStat === aStr) {
            aSrc = afterSource;
            aStat = afterStat;
        }
        if (changeStat === dStr) {
            dSrc = afterSource;
            dStat = afterStat;
        }
    }

    // ステータス実数値にランク補正を適用
    const attackerRank = aSrc.stats[aStat] ? aSrc.stats[aStat].rank || 0 : 0;
    let defenderRank = dSrc.stats[dStat] ? dSrc.stats[dStat].rank || 0 : 0;

    // 特殊技: 防御側ランク上昇無視
    if (specificMove && specificMove.ignore_stats_change) {
        defenderRank = Math.min(0, defenderRank);
    }

    // 天候とタイプの取得（ステータス補正で使用するため前倒し）
    const weather = (field && field.weather) || 'none';
    const defenderTera = defender.teraType && defender.teraType !== 'なし' ? defender.teraType : null;
    const isDefenderStellar = defenderTera === 'ステラ';
    const defenderTypes = (defenderTera && !isDefenderStellar) ? [defenderTera] : (defender.speciesData ? defender.speciesData.types : []);

    let A = Math.floor(aSrc.realStats[aStat] * getRankMultiplier(attackerRank));
    let D = Math.floor(dSrc.realStats[dStat] * getRankMultiplier(defenderRank));

    // 天候「ゆき」: こおりタイプの防御を1.5倍にする (物理のみ)
    if (weather === 'snow' && dStr === 'defence' && defenderTypes.includes('こおり')) {
        D = Math.floor(D * 6144 / 4096);
    }
    // 天候「すなあらし」: いわタイプの特防を1.5倍にする (特殊のみ)
    if (weather === 'sandstorm' && dStr === 'spDef' && defenderTypes.includes('いわ')) {
        D = Math.floor(D * 6144 / 4096);
    }

    // 持ち物補正
    const attackerItem = ITEMS_DEX[attacker.item];
    const defenderItem = ITEMS_DEX[defender.item];
    let itemModifierInfo = null;
    let defenderItemModifierInfo = null;

    // --- 攻撃側の持ち物: stat_modifier → A に適用 ---
    if (attackerItem && attackerItem.type === 'stat_modifier') {
        const targets = attackerItem.effect_target || [];
        const pokemonOk = !attackerItem.effect_pokemon
            || attackerItem.effect_pokemon.includes((attacker.name || '').trim());

        if (pokemonOk) {
            let applyStat = null;
            if (targets.includes(aStr)) {
                applyStat = aStr;
            } else if (targets.includes('highest')) {
                // HP以外の実数値(ランク補正前)で最も高いステータスを特定
                const rs = attacker.realStats;
                const statEntries = [
                    ['attack', rs.attack || 0], ['defence', rs.defence || 0],
                    ['spAtk', rs.spAtk || 0], ['spDef', rs.spDef || 0],
                    ['speed', rs.speed || 0]
                ];
                const highestEntry = statEntries.reduce((a, b) => b[1] > a[1] ? b : a);
                if (highestEntry[0] === aStr) {
                    applyStat = aStr;
                }
            }

            if (applyStat) {
                A = Math.floor(A * attackerItem.multiplier);
                itemModifierInfo = {
                    type: 'stat_modifier', name: attacker.item,
                    stat: applyStat, multiplier: attackerItem.multiplier
                };
            }
        }
    }

    // --- 防御側の持ち物: stat_modifier → D に適用 ---
    if (defenderItem && defenderItem.type === 'stat_modifier') {
        const targets = defenderItem.effect_target || [];
        const pokemonOk = !defenderItem.effect_pokemon
            || defenderItem.effect_pokemon.includes((defender.name || '').trim());

        if (pokemonOk) {
            let applyStat = null;
            if (targets.includes(dStr)) {
                applyStat = dStr;
            } else if (targets.includes('highest')) {
                const rs = defender.realStats;
                const statEntries = [
                    ['attack', rs.attack || 0], ['defence', rs.defence || 0],
                    ['spAtk', rs.spAtk || 0], ['spDef', rs.spDef || 0],
                    ['speed', rs.speed || 0]
                ];
                const highestEntry = statEntries.reduce((a, b) => b[1] > a[1] ? b : a);
                if (highestEntry[0] === dStr) {
                    applyStat = dStr;
                }
            }

            if (applyStat) {
                D = Math.floor(D * defenderItem.multiplier);
                defenderItemModifierInfo = {
                    type: 'stat_modifier', name: defender.item,
                    stat: applyStat, multiplier: defenderItem.multiplier
                };
            }
        }
    }

    // 特性補正
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
    // ただし、双方が同じわざわい特性を持つ場合は無効（同じ特性持ちは対象外）
    let dezasterInfo = null;
    const bothHaveSameRuin = attacker.ability === defender.ability
        && attackerAbilityData && attackerAbilityData.type === 'dezaster';

    // 攻撃側のわざわい系 → 防御側のステータス(D)を弱体化
    if (!bothHaveSameRuin && attackerAbilityData && attackerAbilityData.type === 'dezaster') {
        if (attackerAbilityData.weakken_stats === dStr) {
            D = Math.floor(D * attackerAbilityData.weaken);
            dezasterInfo = { name: attacker.ability, stat: dStr, multiplier: attackerAbilityData.weaken, side: 'attacker' };
        }
    }

    // 防御側のわざわい系 → 攻撃側のステータス(A)を弱体化
    if (!bothHaveSameRuin && defenderAbilityData && defenderAbilityData.type === 'dezaster') {
        if (defenderAbilityData.weakken_stats === aStr) {
            A = Math.floor(A * defenderAbilityData.weaken);
            dezasterInfo = { name: defender.ability, stat: aStr, multiplier: defenderAbilityData.weaken, side: 'defender' };
        }
    }

    // --- 持ち物: boost_phase='power' の威力補正（baseDamage計算前に適用）---
    // 英語タイプ名 → 日本語タイプ名 変換マップ (effect_targetのxxx_type_movesは英語)
    const TYPE_EN_TO_JP = {
        'normal': 'ノーマル', 'fire': 'ほのお', 'water': 'みず',
        'electric': 'でんき', 'grass': 'くさ', 'ice': 'こおり',
        'fighting': 'かくとう', 'poison': 'どく', 'ground': 'じめん',
        'flying': 'ひこう', 'psychic': 'エスパー', 'bug': 'むし',
        'rock': 'いわ', 'ghost': 'ゴースト', 'dragon': 'ドラゴン',
        'dark': 'あく', 'steel': 'はがね', 'fairy': 'フェアリー'
    };

    // 五捨五超入: 小数部が0.5以下なら切り捨て、0.5より大きいなら切り上げ
    const pokeRound = (n) => {
        const frac = n - Math.floor(n);
        return frac > 0.5 ? Math.ceil(n) : Math.floor(n);
    };
    // 4096基準の補正適用:
    //  1. 補正値 = Math.round(4096 * multiplier) (四捨五入)
    //  2. 結果 = pokeRound(value * 補正値 / 4096)  (五捨五超入)
    const applyModifier = (value, multiplier) => {
        const mod = Math.round(4096 * multiplier);
        return pokeRound(value * mod / 4096);
    };

    // effect_target の条件判定ヘルパー
    const checkEffectTarget = (targets) => {
        return targets.some(t => {
            if (t === 'all') return true;
            if (t === 'super_effective') return false; // typeModは後で確定するのでここでは判定不可
            if (t === 'physical_moves') return move.category === 'Physical';
            if (t === 'special_moves') return move.category === 'Special';
            if (t === 'punch_moves') return MOVE_TYPE_MOVES['punch'] && MOVE_TYPE_MOVES['punch'].has(moveName);
            if (t.endsWith('_type_moves')) {
                const typePart = t.replace('_type_moves', '').toLowerCase();
                const jpType = TYPE_EN_TO_JP[typePart];
                return jpType && moveType === jpType;
            }
            return false;
        });
    };

    let finalPower = power;

    // 特殊技: 威力変動の処理
    if (specificMove) {
        // 相手の体重依存
        if (specificMove.depend_on_weight) {
            const w = defender.speciesData ? defender.speciesData.weight_kg : 0;
            if (w >= 200) finalPower = 120;
            else if (w >= 100) finalPower = 100;
            else if (w >= 50) finalPower = 80;
            else if (w >= 25) finalPower = 60;
            else if (w >= 10) finalPower = 40;
            else finalPower = 20;
        }

        // 体重差依存
        if (specificMove.depend_on_difference_weight) {
            const atkW = attacker.speciesData ? attacker.speciesData.weight_kg : 0;
            const defW = defender.speciesData ? defender.speciesData.weight_kg : 0;
            if (atkW === 0) {
                finalPower = 40;
            } else if (defW * 5 <= atkW) {
                finalPower = 120;
            } else if (defW * 4 <= atkW) {
                finalPower = 100;
            } else if (defW * 3 <= atkW) {
                finalPower = 80;
            } else if (defW * 2 <= atkW) {
                finalPower = 60;
            } else {
                finalPower = 40;
            }
        }

        // 素早さ差依存
        if (specificMove.depend_on_difference_speed) {
            const atkSpd = Math.floor(attacker.realStats.speed * getRankMultiplier(attacker.stats.speed ? attacker.stats.speed.rank || 0 : 0));
            const defSpd = Math.floor(defender.realStats.speed * getRankMultiplier(defender.stats.speed ? defender.stats.speed.rank || 0 : 0));

            if (moveName === 'ジャイロボール') {
                finalPower = atkSpd === 0 ? 1 : Math.min(150, Math.floor(25 * defSpd / atkSpd) + 1);
            } else if (moveName === 'エレキボール') {
                if (defSpd === 0) {
                    finalPower = 150;
                } else {
                    const ratio = atkSpd / defSpd;
                    if (ratio >= 4) finalPower = 150;
                    else if (ratio >= 3) finalPower = 120;
                    else if (ratio >= 2) finalPower = 80;
                    else if (ratio >= 1) finalPower = 60;
                    else finalPower = 40;
                }
            }
        }

        // HP依存
        if (specificMove.depend_on_hp) {
            if (['しおふき', 'ふんか', 'ドラゴンエナジー'].includes(moveName)) {
                finalPower = Math.max(1, Math.floor(150 * attacker.currentHp / attacker.maxHp));
            } else if (['じたばた', 'きしかいせい'].includes(moveName)) {
                const ratio = attacker.currentHp / attacker.maxHp * 48;
                if (ratio < 2) finalPower = 200;
                else if (ratio < 5) finalPower = 150;
                else if (ratio < 10) finalPower = 100;
                else if (ratio < 17) finalPower = 80;
                else if (ratio < 33) finalPower = 40;
                else finalPower = 20;
            } else if (['にぎりつぶす', 'しぼりとる'].includes(moveName)) {
                finalPower = Math.max(1, Math.floor(120 * defender.currentHp / defender.maxHp));
            }
        }

        // ランク上昇依存
        if (specificMove.depend_on_ability_rank) {
            const statKeys = ['attack', 'defence', 'spAtk', 'spDef', 'speed'];
            let totalPositive = 0;
            for (const key of statKeys) {
                const rank = attacker.stats[key] ? attacker.stats[key].rank || 0 : 0;
                if (rank > 0) totalPositive += rank;
            }
            finalPower = Math.min(220, 20 + totalPositive * 20);
        }
    }

    let itemPowerBoostApplied = false;
    let areaModifierInfo = null;
    if (attackerItem && attackerItem.type === 'damage_boost' && attackerItem.boost_phase === 'power') {
        const targets = attackerItem.effect_target || [];
        if (checkEffectTarget(targets)) {
            // 威力補正ステップは四捨五入
            const itemModNumerator = Math.round(4096 * attackerItem.multiplier);
            finalPower = Math.round(finalPower * itemModNumerator / 4096);
            itemPowerBoostApplied = true;
            itemModifierInfo = {
                type: 'damage_boost', name: attacker.item,
                multiplier: attackerItem.multiplier
            };
        }
    }

    // --- フィールド補正 (威力補正) ---
    const terrain = (field && field.terrain) || 'none';
    const GRASSY_HALVED_MOVES = ['じしん', 'じならし'];
    
    // a. 威力強化補正1 (ワイドフォース / サイコブレイド の固有補正)
    let hasMoveSpecificBoost = false;
    if (terrain === 'psychic' && moveName === 'ワイドフォース') {
        finalPower = Math.round(finalPower * 6144 / 4096);
        hasMoveSpecificBoost = true;
    } else if (terrain === 'electric' && moveName === 'サイコブレイド') {
        finalPower = Math.round(finalPower * 6144 / 4096);
        hasMoveSpecificBoost = true;
    }

    // b. 威力強化補正2 (通常のフィールドタイプ強化 / 弱化補正)
    let terrainModVal = 1.0;
    if (terrain === 'electric') {
        if (moveType === 'でんき' || moveName === 'サイコブレイド') terrainModVal = 1.3;
    } else if (terrain === 'psychic') {
        if (moveType === 'エスパー') terrainModVal = 1.3;
    } else if (terrain === 'grassy') {
        if (moveType === 'くさ') terrainModVal = 1.3;
        else if (GRASSY_HALVED_MOVES.includes(moveName)) terrainModVal = 0.5;
    } else if (terrain === 'misty') {
        if (moveType === 'ドラゴン') terrainModVal = 0.5;
    }

    if (terrainModVal !== 1.0) {
        const terrainModNumerator = Math.round(4096 * terrainModVal);
        finalPower = Math.round(finalPower * terrainModNumerator / 4096);
        
        const terrainNames = { electric: 'エレキフィールド', psychic: 'サイコフィールド', grassy: 'グラスフィールド', misty: 'ミストフィールド' };
        let displayMultiplier = terrainModVal;
        // ワイドフォース / サイコブレイド の場合は重複をわかりやすく表示
        if (terrain === 'psychic' && moveName === 'ワイドフォース') displayMultiplier = "1.5×1.3";
        else if (terrain === 'electric' && moveName === 'サイコブレイド') displayMultiplier = "1.5×1.3";

        areaModifierInfo = { type: 'terrain', name: terrainNames[terrain] || terrain, multiplier: displayMultiplier };
    } else if (hasMoveSpecificBoost) {
        // 通常補正(1.3倍)がないが固有補正(1.5倍)がある場合
        const terrainNames = { electric: 'エレキフィールド', psychic: 'サイコフィールド' };
        areaModifierInfo = { type: 'terrain', name: terrainNames[terrain] || terrain, multiplier: 1.5 };
    }

    // 1. ダメージ計算の基礎
    // Floor(Floor(Floor(Lv * 2 / 5 + 2) * Power * A / D) / 50) + 2
    let baseDamage = Math.floor(Math.floor(Math.floor(level * 2 / 5 + 2) * finalPower * A / D) / 50) + 2;

    // 2. 補正 (簡易実装)
    
    // 天候: なし
    // 急所: ループ内で五捨五超入を適用
    
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
    
    const typeMod = getTypeEffectiveness(moveType, defenderTypes);
    
    // 状態異常(やけど): 物理なら0.5 (未実装)
    // 壁(リフレクター/光の壁): 防御側
    // 複数対象補正: 0.75

    // --- 天候補正準備 (防御補正) ---
    // areaModifierInfoはフィールド補正で既にセットされている場合があるため上書きせず別途保持
    let weatherDefModifierInfo = null;
    if (weather === 'snow' && dStr === 'defence' && defenderTypes.includes('こおり')) {
        weatherDefModifierInfo = { type: 'weather', name: 'ゆき', multiplier: 1.5 };
    } else if (weather === 'sandstorm' && dStr === 'spDef' && defenderTypes.includes('いわ')) {
        weatherDefModifierInfo = { type: 'weather', name: 'すなあらし', multiplier: 1.5 };
    }
    // --- 攻撃側の持ち物: boost_phase='damage' のダメージ補正（ループ内で適用）---
    let itemDamageBoostApplies = false;
    if (attackerItem && attackerItem.type === 'damage_boost' && attackerItem.boost_phase === 'damage') {
        const targets = attackerItem.effect_target || [];
        // super_effectiveはtypeModが確定した後で判定
        itemDamageBoostApplies = targets.some(t => {
            if (t === 'all') return true;
            if (t === 'super_effective') return typeMod > 1.0;
            return false;
        });

        if (itemDamageBoostApplies) {
            itemModifierInfo = {
                type: 'damage_boost', name: attacker.item,
                multiplier: attackerItem.multiplier
            };
        }
    }

    // 最終ダメージ算出ループ (16段階乱数)

    const rolls = [];
    for (let i = 85; i <= 100; i++) {
        let dmg = baseDamage;
        
        // 1. 乱数 (0.85 .. 1.00) → 切り捨て
        dmg = Math.floor(dmg * i / 100);

        // 2. タイプ一致 (STAB) → 4096基準補正
        dmg = applyModifier(dmg, stabMod);

        // 3. タイプ相性 → 切り捨て
        dmg = Math.floor(dmg * typeMod);

        // 4. 攻撃側持ち物: damage_boost → 4096基準補正
        if (itemDamageBoostApplies) {
            dmg = applyModifier(dmg, attackerItem.multiplier);
        }

        // 5. 防御側特性補正 (defensive) → 4096基準補正
        if (abilityDefensiveMod !== 1.0) {
            dmg = applyModifier(dmg, abilityDefensiveMod);
        }

        // 6. 天候補正 → 4096基準補正
        let weatherMod = 1.0;
        if (weather === 'sunny') {
            if (moveType === 'ほのお') weatherMod = 1.5;
            else if (moveType === 'みず') weatherMod = 0.5;
        } else if (weather === 'rain') {
            if (moveType === 'みず') weatherMod = 1.5;
            else if (moveType === 'ほのお') weatherMod = 0.5;
        }
        
        if (weatherMod !== 1.0) {
            dmg = applyModifier(dmg, weatherMod);
            if (areaModifierInfo === null) {
                const weatherNames = { sunny: '晴れ', rain: '雨', snow: 'ゆき', sandstorm: 'すなあらし' };
                areaModifierInfo = { type: 'weather', name: weatherNames[weather] || weather, multiplier: weatherMod };
            }
        }

        // 7. 壁補正 → 4096基準補正 (シングル: 0.5倍)
        const wallReflect = field && field.wallReflect;
        const wallLight = field && field.wallLight;
        if (wallReflect && move.category === 'Physical') {
            dmg = applyModifier(dmg, 0.5);
        }
        if (wallLight && move.category === 'Special') {
            dmg = applyModifier(dmg, 0.5);
        }

        if (dmg < 1) dmg = 1;
        if (typeMod === 0) dmg = 0;
        // 防御側特性で無効化 (defensive=0)
        if (abilityDefensiveMod === 0) dmg = 0;

        rolls.push(dmg);
    }
    
    const wallApplied = (field && field.wallReflect && move.category === 'Physical') ? 'リフレクター'
        : (field && field.wallLight && move.category === 'Special') ? 'ひかりのかべ'
        : null;

    // 特殊技情報の構築
    let specificMoveInfo = null;
    if (specificMove) {
        const STAT_LABELS = { attack: '攻撃', defence: '防御', spAtk: '特攻', spDef: '特防', speed: '素早さ' };
        const details = [];

        if (specificMove.depend_on_other_stats) {
            const srcLabel = (aSrc === attacker) ? '自分' : '相手';
            const statLabel = STAT_LABELS[aStat] || aStat;
            if (specificMove.change_target_stats === aStr) {
                details.push(`攻撃: ${srcLabel}の${statLabel}で計算`);
            }
            if (specificMove.change_target_stats === dStr) {
                const dSrcLabel = (dSrc === defender) ? '相手' : '自分';
                const dStatLabel = STAT_LABELS[dStat] || dStat;
                details.push(`防御: ${dSrcLabel}の${dStatLabel}で計算`);
            }
        }
        if (specificMove.ignore_stats_change) {
            details.push('相手のランク上昇を無視');
        }
        if (specificMove.depend_on_weight) {
            const w = defender.speciesData ? defender.speciesData.weight_kg : 0;
            details.push(`相手の体重: ${w}kg → 威力${finalPower}`);
        }
        if (specificMove.depend_on_difference_weight) {
            const atkW = attacker.speciesData ? attacker.speciesData.weight_kg : 0;
            const defW = defender.speciesData ? defender.speciesData.weight_kg : 0;
            details.push(`体重差: ${atkW}kg vs ${defW}kg → 威力${finalPower}`);
        }
        if (specificMove.depend_on_difference_speed) {
            details.push(`素早さ差 → 威力${finalPower}`);
        }
        if (specificMove.depend_on_hp) {
            details.push(`HP依存 → 威力${finalPower}`);
        }
        if (specificMove.depend_on_ability_rank) {
            details.push(`ランク上昇合計 → 威力${finalPower}`);
        }

        if (details.length > 0) {
            specificMoveInfo = { name: moveName, details: details };
        }
    }

    return {
        min: rolls[0],
        max: rolls[rolls.length - 1],
        rolls: rolls,
        typeMod: typeMod,
        itemModifier: itemModifierInfo,
        defenderItemModifier: defenderItemModifierInfo,
        stellarBoosted: stellarBoosted,
        moveType: moveType,
        abilityOffensiveInfo: abilityOffensiveInfo,
        abilityDefensiveInfo: abilityDefensiveInfo,
        dezasterInfo: dezasterInfo,
        areaModifier: areaModifierInfo,
        weatherDefModifier: weatherDefModifierInfo,
        wallInfo: wallApplied ? { name: wallApplied, multiplier: 0.5 } : null,
        specificMoveInfo: specificMoveInfo
    };
}
