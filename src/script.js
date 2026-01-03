class Pokemon {
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
        this.moves = ["技1", "技2", "技3", "技4"]; 
        this.activeMoveIndex = 0; // 選択中の技インデックス
        
        // フィールド・状態
        this.conditions = {
            isReflector: false,
            isMultiTarget: false,
            isCrit: false
        };

        // HP管理
        this.maxHp = 150; // 仮の初期値
        this.currentHp = 150;
    }

    // ステータス入力からHPを再計算する（簡易実装）
    computeMaxHp() {
        // H = (IV + EV/4) + Level + 10 + (種族値は不明なので固定値または入力値があればそれを使う)
        // ここでは簡易的に「入力されているIVとEVとLevel」から算出するが、
        // 種族値がないと正確には出ないので、一旦「150 + α」程度にするか、
        // あるいはユーザーが「実数値」欄に入力する機能を実装すべきだが、
        // 要求仕様としては「増減すること」が主眼なのでシンプルに実装する。
        
        // とりあえず今回は (Lv/2 + 100) 程度をベースに変動させる
        const iv = this.stats.hp.iv;
        const ev = this.stats.hp.ev;
        // 簡易式: Base=100想定
        this.maxHp = Math.floor((100 + iv/2 + ev/8) * this.level / 50 + 10 + this.level);
        
        // HPが溢れていたら補正、または0ならリセット
        if (this.currentHp > this.maxHp) this.currentHp = this.maxHp;
        if (this.currentHp <= 0 && this.maxHp > 0) this.currentHp = this.maxHp; // 初期化タイミング用
    }
}

class AppState {
    constructor() {
        this.allyTeam = [new Pokemon(1), new Pokemon(2), new Pokemon(3)];
        this.enemyTeam = [new Pokemon(1), new Pokemon(2), new Pokemon(3)];
        
        // 選択中のスロット (初期値: それぞれの1番目)
        this.currentAllyIndex = 0;
        this.currentEnemyIndex = 0;
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

const appState = new AppState();

document.addEventListener('DOMContentLoaded', () => {
    // Ally (自分) Inputs
    const allyNameInput = document.getElementById('ally-name-input');
    const allyLevelInput = document.getElementById('ally-level-input');
    const allyTeraSelect = document.getElementById('ally-tera-select');
    const allyItemSelect = document.getElementById('ally-item-select');
    const allyAbilitySelect = document.getElementById('ally-ability-select');
    
    // Enemy (相手) Inputs
    const enemyNameInput = document.getElementById('enemy-name-input');
    const enemyAbilitySelect = document.getElementById('enemy-ability-select');
    const enemyItemSelect = document.getElementById('enemy-item-select');

    // スロットボタンの初期化
    const slotButtons = document.querySelectorAll('.poke-slot');
    slotButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 親要素が active な場合もあるので、closest でボタン自体を取得
            const button = e.target.closest('.poke-slot');
            if (!button) return;

            const team = button.dataset.team;
            const index = parseInt(button.dataset.index);
            
            // 状態更新
            appState.switchSlot(team, index);
            
            // UIのアクティブ表示更新 (チームごとに独立させる)
            const teamButtons = document.querySelectorAll(`.poke-slot[data-team="${team}"]`);
            teamButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            // フォームの値を更新 (変更された側だけ更新する)
            updateFormFromState(team);
        });
    });

    // フォーム入力の監視 (Ally)
    if (allyNameInput) {
        allyNameInput.addEventListener('input', (e) => {
            const pokemon = appState.getAllyPokemon();
            pokemon.name = e.target.value;
            updateSlotLabel('ally');
        });
    }

    if (allyLevelInput) {
        allyLevelInput.addEventListener('input', (e) => {
            const pokemon = appState.getAllyPokemon();
            pokemon.level = parseInt(e.target.value) || 50;
        });
    }

    if (allyTeraSelect) {
        allyTeraSelect.addEventListener('change', (e) => {
            const pokemon = appState.getAllyPokemon();
            pokemon.teraType = e.target.value;
        });
    }

    if (allyItemSelect) {
        allyItemSelect.addEventListener('change', (e) => {
            const pokemon = appState.getAllyPokemon();
            pokemon.item = e.target.value;
        });
    }

    if (allyAbilitySelect) {
        allyAbilitySelect.addEventListener('change', (e) => {
            const pokemon = appState.getAllyPokemon();
            pokemon.ability = e.target.value;
        });
    }

    // フォーム入力の監視 (Enemy)
    if (enemyNameInput) {
        enemyNameInput.addEventListener('input', (e) => {
            const pokemon = appState.getEnemyPokemon();
            pokemon.name = e.target.value;
            updateSlotLabel('enemy');
        });
    }

    if (enemyItemSelect) {
        enemyItemSelect.addEventListener('change', (e) => {
            const pokemon = appState.getEnemyPokemon();
            pokemon.item = e.target.value;
        });
    }

    if (enemyAbilitySelect) {
        enemyAbilitySelect.addEventListener('change', (e) => {
            const pokemon = appState.getEnemyPokemon();
            pokemon.ability = e.target.value;
        });
    }

    // ポケモン画像リスト
    const pokemonList = [
        "イーユイ",
        "ガチグマ",
        "ガブリアス",
        "ディンルー",
        "ハバタクカミ",
        "パオジアン"
    ];

    // datalistの生成
    const datalist = document.getElementById('pokemon-list');
    if (datalist) {
        pokemonList.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
    }

    // ステータス入力の監視
    document.querySelectorAll('.stat-input').forEach(input => {
        input.addEventListener('input', handleStatChange);
        input.addEventListener('change', handleStatChange);
    });

    // 技選択ボタンの監視 (Delegation)
    document.querySelectorAll('.move-grid').forEach(grid => {
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.move-btn');
            if (!btn) return;

            const isAlly = grid.classList.contains('ally-move-grid');
            const isEnemy = grid.classList.contains('enemy-move-grid');

            let pokemon = null;
            if (isAlly) pokemon = appState.getAllyPokemon();
            if (isEnemy) pokemon = appState.getEnemyPokemon();

            if (pokemon) {
                const index = parseInt(btn.dataset.index);
                pokemon.activeMoveIndex = index;
                
                // UI更新
                grid.querySelectorAll('.move-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // フィールド・状態チェックボックスの監視
    document.querySelectorAll('.condition-check').forEach(check => {
        check.addEventListener('change', (e) => {
            const isAlly = e.target.closest('.ally');
            const isEnemy = e.target.closest('.enemy');

            let pokemon = null;
            if (isAlly) pokemon = appState.getAllyPokemon();
            if (isEnemy) pokemon = appState.getEnemyPokemon();

            if (pokemon) {
                const condName = e.target.dataset.cond;
                if (condName) {
                    pokemon.conditions[condName] = e.target.checked;
                }
            }
        });
    });

    function handleStatChange(e) {
        const isAlly = e.target.closest('.ally');
        const isEnemy = e.target.closest('.enemy');
        
        let pokemon = null;
        if (isAlly) pokemon = appState.getAllyPokemon();
        if (isEnemy) pokemon = appState.getEnemyPokemon();

        if (pokemon) {
            const statName = e.target.dataset.stat;
            const type = e.target.dataset.type;
            
            if (statName && type) {
                let value = e.target.value;
                if (type === 'iv' || type === 'ev') {
                    value = parseInt(value) || 0;
                }
                pokemon.stats[statName][type] = value;
                
                // HP再計算 (IV/EV変更時)
                if (statName === 'hp') {
                    pokemon.computeMaxHp();
                    updateFormFromState(isAlly ? 'ally' : 'enemy');
                }
            }
        }
    }
    
    // 初期表示 (両方更新)
    updateFormFromState('ally');
    updateFormFromState('enemy');

    // 指定されたチームのフォームを現在のStateで更新
    function updateFormFromState(teamType) {
        let pokemon;
        let containerSelector;

        if (teamType === 'ally') {
            pokemon = appState.getAllyPokemon();
            containerSelector = '.poke-settings.ally';
        } else {
            pokemon = appState.getEnemyPokemon();
            containerSelector = '.poke-settings.enemy';
        }

        const container = document.querySelector(containerSelector);
        if (!container || !pokemon) return;
        
        // 初回ロード時などにMaxHpが未計算なら計算
        if (pokemon.maxHp === 150 && pokemon.stats.hp.iv === 31) {
             pokemon.computeMaxHp();
        }

        // 個別フィールドの更新
        if (teamType === 'ally') {
            if (allyNameInput) allyNameInput.value = pokemon.name;
            if (allyLevelInput) allyLevelInput.value = pokemon.level;
            if (allyTeraSelect) allyTeraSelect.value = pokemon.teraType;
            if (allyItemSelect) allyItemSelect.value = pokemon.item;
            if (allyAbilitySelect) allyAbilitySelect.value = pokemon.ability;
        } else {
            if (enemyNameInput) enemyNameInput.value = pokemon.name;
            if (enemyItemSelect) enemyItemSelect.value = pokemon.item;
            if (enemyAbilitySelect) enemyAbilitySelect.value = pokemon.ability;
        }

        // HPバー更新
        const currentHpSpan = document.getElementById(`${teamType}-current-hp`);
        const maxHpSpan = document.getElementById(`${teamType}-max-hp`);
        const hpBar = document.getElementById(`${teamType}-hp-bar`);
        
        if (currentHpSpan && maxHpSpan && hpBar) {
            currentHpSpan.textContent = pokemon.currentHp;
            maxHpSpan.textContent = pokemon.maxHp;
            
            const ratio = (pokemon.currentHp / pokemon.maxHp) * 100;
            hpBar.style.width = `${Math.max(0, ratio)}%`;
            
            // 色変え
            if (ratio > 50) hpBar.style.backgroundColor = 'var(--primary-green)';
            else if (ratio > 20) hpBar.style.backgroundColor = 'var(--accent-orange)';
            else hpBar.style.backgroundColor = 'var(--primary-red)';
        }

        // ステータス入力の更新
        container.querySelectorAll('.stat-input').forEach(input => {
            const statName = input.dataset.stat;
            const type = input.dataset.type;
            if (statName && type && pokemon.stats[statName]) {
                input.value = pokemon.stats[statName][type];
            }
        });

        // 技選択ボタンの更新
        const moveBtns = container.querySelectorAll('.move-btn');
        moveBtns.forEach((btn, index) => {
            if (index === pokemon.activeMoveIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Conditionチェックボックスの更新
        container.querySelectorAll('.condition-check').forEach(check => {
            const condName = check.dataset.cond;
            if (condName && pokemon.conditions) {
                check.checked = !!pokemon.conditions[condName];
            }
        });
    }

    function updateSlotLabel(teamType) {
        // 現在アクティブなスロットボタンのテキストを更新
        let currentIndex = (teamType === 'ally') ? appState.currentAllyIndex : appState.currentEnemyIndex;
        
        const activeBtn = document.querySelector(`.poke-slot[data-team="${teamType}"][data-index="${currentIndex}"]`);
        if (activeBtn) {
            let pokemon = (teamType === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
            
            const name = pokemon.name.trim();

            if (!name) {
                // 名前がない場合は番号を表示
                activeBtn.textContent = currentIndex + 1;
                activeBtn.style.backgroundImage = 'none';
                activeBtn.classList.remove('has-image');
                return;
            }

            // 画像読み込み試行
            activeBtn.innerHTML = '';
            const img = document.createElement('img');
            img.src = `../image/${name}.gif`;
            img.alt = name;
            img.classList.add('pokemon-icon');
            
            img.onerror = () => {
                activeBtn.textContent = name; // テキスト表示
                activeBtn.classList.remove('has-image');
            };

            img.onload = () => {
                activeBtn.classList.add('has-image');
            };

            activeBtn.appendChild(img);
        }
    }
    // ターン実行ボタン
    const executeBtn = document.getElementById('execute-turn-btn');
    if (executeBtn) {
        executeBtn.addEventListener('click', () => {
            const allyPoke = appState.getAllyPokemon();
            const enemyPoke = appState.getEnemyPokemon();

            // 簡易ダメージ処理 (両方に20ダメージ)
            if (allyPoke.currentHp > 0) allyPoke.currentHp = Math.max(0, allyPoke.currentHp - 20);
            if (enemyPoke.currentHp > 0) enemyPoke.currentHp = Math.max(0, enemyPoke.currentHp - 20);

            // UI更新
            updateFormFromState('ally');
            updateFormFromState('enemy');

            console.log('Turn executed. Ally HP:', allyPoke.currentHp, 'Enemy HP:', enemyPoke.currentHp);
        });
    }

    // 初期表示 (両方更新)
    updateFormFromState('ally');
    updateFormFromState('enemy');
});
