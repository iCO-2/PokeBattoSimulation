import { Pokemon } from './models/PokemonModel.js?v=118';

export class AppState {
    constructor() {
        this.allyTeam = [
            new Pokemon(1), new Pokemon(2), new Pokemon(3),
            new Pokemon(4), new Pokemon(5), new Pokemon(6)
        ];
        this.enemyTeam = [
            new Pokemon(1), new Pokemon(2), new Pokemon(3),
            new Pokemon(4), new Pokemon(5), new Pokemon(6)
        ];
        
        // 選択中のスロット (初期値: それぞれの1番目)
        this.currentAllyIndex = 0;
        this.currentEnemyIndex = 0;

        // 対戦全体の履歴
        this.battleHistory = [];
    }

    clearBattleHistory() {
        this.battleHistory = [];
    }

    resetAllTeams() {
        this.clearBattleHistory();
        this.allyTeam.forEach(p => p.fullReset());
        this.enemyTeam.forEach(p => p.fullReset());
    }

    getAllyPokemon() {
        return this.allyTeam[this.currentAllyIndex];
    }
    
    getEnemyPokemon() {
        return this.enemyTeam[this.currentEnemyIndex];
    }

    // teamType ('ally' | 'enemy') に応じてインデックスを更新
    switchSlot(teamType, index) {
        if (teamType === 'ally') {
            this.currentAllyIndex = index;
        } else {
            this.currentEnemyIndex = index;
        }
    }
}
