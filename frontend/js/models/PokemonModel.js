import { SPECIES_DEX } from '../data/loader.js?v=3';
import { calculateHp, calculateStat } from '../calc/stats.js';

export class Pokemon {
    constructor(id) {
        this.id = id;
        this.name = "";
        this.level = 50;
        this.teraType = "なし";
        this.stats = {
            hp: { ev: 0 },
            attack: { ev: 0, nature: 'neutral', rank: 0 },
            defense: { ev: 0, nature: 'neutral', rank: 0 },
            spAtk: { ev: 0, nature: 'neutral', rank: 0 },
            spDef: { ev: 0, nature: 'neutral', rank: 0 },
            speed: { ev: 0, nature: 'neutral', rank: 0 }
        };
        this.item = "";
        this.ability = "";
        
        // 技構成 (簡易版)
        this.moves = ["", "", "", ""]; 
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

        // アイテム使用フラグ
        this.itemConsumed = false;
    }

    // HP回復処理
    heal(amount, sourceMessage = "") {
        if (this.currentHp <= 0) return 0; // ひんし状態なら回復しない
        
        const oldHp = this.currentHp;
        this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
        return this.currentHp - oldHp; // 実際に回復した量
    }

    clearHistory() {
        this.history = [];
        this.lastTurnId = null;
    }

    fullReset() {
        this.currentHp = this.maxHp;
        this.itemConsumed = false; // アイテム使用状況もリセット
        this.clearHistory();
    }

    get speciesData() {
        const data = SPECIES_DEX[this.name];
        console.log(`[PokemonModel] speciesData for '${this.name}':`, data ? { types: data.types } : 'Not Found');
        return data || null;
    }

    // ステータス入力からHPおよび全実数値を再計算する
    computeStats() {
        // 種族値データがない場合は計算できない（または仮の計算を行う）
        const base = this.speciesData ? this.speciesData.baseStats : null;
        const IV = 31; // 個体値は常に31固定

        // HP計算
        {
            const ev = this.stats.hp.ev;
            // 種族値不明時はとりあえず Base=100 として計算するか、現状維持
            const baseHp = base ? base.hp : 100; 
            
            const oldMaxHp = this.maxHp;
            this.maxHp = calculateHp(baseHp, IV, ev, this.level);
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

        // 他のステータス計算（ランク補正は実数値には適用せず、ダメージ計算時に適用）
        ['attack', 'defense', 'spAtk', 'spDef', 'speed'].forEach(statName => {
            const s = this.stats[statName];
            const baseStat = base ? base[statName] : 100;
            this.realStats[statName] = calculateStat(baseStat, IV, s.ev, this.level, s.nature);
        });
    }
}
