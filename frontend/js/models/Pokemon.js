import { SPECIES_DEX } from '../data/species.js';
import { calculateHp, calculateStat } from '../calc/stats.js';

export class Pokemon {
    constructor(id) {
        this.id = id;
        this.name = "";
        this.level = 50;
        this.teraType = "なし";
        this.stats = {
            hp: { iv: 31, ev: 0 },
            attack: { iv: 31, ev: 0, nature: 'neutral' },
            defense: { iv: 31, ev: 0, nature: 'neutral' },
            spAtk: { iv: 31, ev: 0, nature: 'neutral' },
            spDef: { iv: 31, ev: 0, nature: 'neutral' },
            speed: { iv: 31, ev: 0, nature: 'neutral' }
        };
        this.item = "";
        this.ability = "";
        
        // 技構成 (簡易版)
        this.moves = ["ストーンエッジ", "じしん", "テラバースト", "ハイドロポンプ"]; 
        this.activeMoveIndex = 0; // 選択中の技インデックス
        
        // フィールド・状態
        this.conditions = {
            isReflector: false,
            isMultiTarget: false,
            isCrit: false
        };

        // HP管理
        this.maxHp = 150; // 初期値
        this.currentHp = 150;
        
        // 実数値キャッシュ
        this.realStats = {
            hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0
        };

        // 被ダメージ履歴
        this.history = [];
        this.lastTurnId = null; // 同じターンの連打を統合するため
    }

    clearHistory() {
        this.history = [];
        this.lastTurnId = null;
    }

    fullReset() {
        this.currentHp = this.maxHp;
        this.clearHistory();
    }

    get speciesData() {
        return SPECIES_DEX[this.name] || null;
    }

    // ステータス入力からHPおよび全実数値を再計算する
    computeStats() {
        // 種族値データがない場合は計算できない（または仮の計算を行う）
        const base = this.speciesData ? this.speciesData.baseStats : null;

        // HP計算
        {
            const iv = this.stats.hp.iv;
            const ev = this.stats.hp.ev;
            // 種族値不明時はとりあえず Base=100 として計算するか、現状維持
            const baseHp = base ? base.hp : 100; 
            
            const oldMaxHp = this.maxHp;
            this.maxHp = calculateHp(baseHp, iv, ev, this.level);
            this.realStats.hp = this.maxHp;

            // HP補正
            // もし前回が満タン(current == oldMax)なら、新しいMaxにも追従する
            // または、現在のHPが150(初期値)で、かつ変更後がそれ以外なら追従
            if (this.currentHp === oldMaxHp || (this.currentHp === 150 && this.maxHp !== 150)) {
                this.currentHp = this.maxHp;
            } else {
                if (this.currentHp > this.maxHp) this.currentHp = this.maxHp;
                if (this.currentHp <= 0) this.currentHp = 0; // 0以下は0に (回復等は別ロジックだが一応)
            }
        }

        // 他のステータス計算
        ['attack', 'defense', 'spAtk', 'spDef', 'speed'].forEach(statName => {
            const s = this.stats[statName];
            const baseStat = base ? base[statName] : 100;
            this.realStats[statName] = calculateStat(baseStat, s.iv, s.ev, this.level, s.nature);
        });
    }
}
