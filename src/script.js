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
    }
}

class AppState {
    constructor() {
        this.allyTeam = [new Pokemon(1), new Pokemon(2), new Pokemon(3)];
        this.enemyTeam = [new Pokemon(1), new Pokemon(2), new Pokemon(3)];
        
        // 選択中のスロット (初期値: 自軍の1番目)
        this.currentTeam = 'ally';
        this.currentSlotIndex = 0;
    }

    getCurrentPokemon() {
        const team = this.currentTeam === 'ally' ? this.allyTeam : this.enemyTeam;
        return team[this.currentSlotIndex];
    }

    switchSlot(teamType, index) {
        this.currentTeam = teamType;
        this.currentSlotIndex = index;
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
            
            // UIのアクティブ表示更新
            slotButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            // フォームの値を更新
            updateFormFromState();
        });
    });

    // フォーム入力の監視 (Ally)
    if (allyNameInput) {
        allyNameInput.addEventListener('input', (e) => {
            if (appState.currentTeam === 'ally') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.name = e.target.value;
                updateSlotLabel();
            }
        });
    }

    if (allyLevelInput) {
        allyLevelInput.addEventListener('input', (e) => {
            if (appState.currentTeam === 'ally') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.level = parseInt(e.target.value) || 50;
            }
        });
    }

    if (allyTeraSelect) {
        allyTeraSelect.addEventListener('change', (e) => {
             if (appState.currentTeam === 'ally') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.teraType = e.target.value;
            }
        });
    }

    if (allyItemSelect) {
        allyItemSelect.addEventListener('change', (e) => {
            if (appState.currentTeam === 'ally') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.item = e.target.value;
            }
        });
    }

    if (allyAbilitySelect) {
        allyAbilitySelect.addEventListener('change', (e) => {
            if (appState.currentTeam === 'ally') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.ability = e.target.value;
            }
        });
    }

    // フォーム入力の監視 (Enemy)
    if (enemyNameInput) {
        enemyNameInput.addEventListener('input', (e) => {
             if (appState.currentTeam === 'enemy') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.name = e.target.value;
                updateSlotLabel();
            }
        });
    }

    if (enemyItemSelect) {
        enemyItemSelect.addEventListener('change', (e) => {
            if (appState.currentTeam === 'enemy') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.item = e.target.value;
            }
        });
    }

    if (enemyAbilitySelect) {
        enemyAbilitySelect.addEventListener('change', (e) => {
            if (appState.currentTeam === 'enemy') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.ability = e.target.value;
            }
        });
    }

    // ポケモン画像リスト（ファイル名から拡張子を除いたもの）
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

            if ((isAlly && appState.currentTeam === 'ally') ||
                (isEnemy && appState.currentTeam === 'enemy')) {
                
                const pokemon = appState.getCurrentPokemon();
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

            if ((isAlly && appState.currentTeam === 'ally') ||
                (isEnemy && appState.currentTeam === 'enemy')) {
                
                const pokemon = appState.getCurrentPokemon();
                const condName = e.target.dataset.cond;
                if (condName) {
                    pokemon.conditions[condName] = e.target.checked;
                }
            }
        });
    });

    function handleStatChange(e) {
        // イベント発生元がAllyかEnemyかを判定
        const isAlly = e.target.closest('.ally');
        const isEnemy = e.target.closest('.enemy');
        
        // 現在アクティブなチームと一致する場合のみ更新
        if ((isAlly && appState.currentTeam === 'ally') || 
            (isEnemy && appState.currentTeam === 'enemy')) {
            const pokemon = appState.getCurrentPokemon();
            const statName = e.target.dataset.stat;
            const type = e.target.dataset.type;
            
            if (statName && type) {
                let value = e.target.value;
                if (type === 'iv' || type === 'ev') {
                    value = parseInt(value) || 0;
                }
                pokemon.stats[statName][type] = value;
            }
        }
    }
    
    // 初期表示
    updateFormFromState();

    function updateFormFromState() {
        const pokemon = appState.getCurrentPokemon();
        const isAlly = appState.currentTeam === 'ally';
        
        // 共通フォーム要素の更新ロジック
        // (IDの違いを吸収して処理するために、対象コンテナを取得)
        const activeContainer = isAlly ? document.querySelector('.poke-settings.ally') : document.querySelector('.poke-settings.enemy');
        const inactiveContainer = isAlly ? document.querySelector('.poke-settings.enemy') : document.querySelector('.poke-settings.ally');

        if (isAlly) {
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

        // ステータス入力の更新
        activeContainer.querySelectorAll('.stat-input').forEach(input => {
            const statName = input.dataset.stat;
            const type = input.dataset.type;
            if (statName && type && pokemon.stats[statName]) {
                input.value = pokemon.stats[statName][type];
            }
        });

        // 技選択ボタンの更新
        const moveBtns = activeContainer.querySelectorAll('.move-btn');
        moveBtns.forEach((btn, index) => {
            if (index === pokemon.activeMoveIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            // 技名表示の更新も将来的にはここでやる
            // btn.textContent = pokemon.moves[index] || `技${index+1}`; 
        });

        // Conditionチェックボックスの更新
        activeContainer.querySelectorAll('.condition-check').forEach(check => {
            const condName = check.dataset.cond;
            if (condName && pokemon.conditions) {
                check.checked = !!pokemon.conditions[condName];
            }
        });

        // 非アクティブ側の入力をクリア
        if (isAlly) {
            // Enemy inputs clear
            if (enemyNameInput) enemyNameInput.value = "";
            inactiveContainer.querySelectorAll('.stat-input').forEach(resetStatInput);
            inactiveContainer.querySelectorAll('.condition-check').forEach(c => c.checked = false);
            inactiveContainer.querySelectorAll('.move-btn').forEach(b => b.classList.remove('active'));
        } else {
            // Ally inputs clear
            if (allyNameInput) allyNameInput.value = "";
            inactiveContainer.querySelectorAll('.stat-input').forEach(resetStatInput);
            inactiveContainer.querySelectorAll('.condition-check').forEach(c => c.checked = false);
            inactiveContainer.querySelectorAll('.move-btn').forEach(b => b.classList.remove('active'));
        }
    }

    function resetStatInput(input) {
         input.value = "";
         if (input.tagName === 'SELECT') input.selectedIndex = 0;
         if (input.type === 'number') input.value = 0;
         if (input.dataset.type === 'iv') input.value = 31;
    }

    function updateSlotLabel() {
        // 現在アクティブなスロットボタンのテキストを更新
        const activeBtn = document.querySelector(`.poke-slot[data-team="${appState.currentTeam}"][data-index="${appState.currentSlotIndex}"]`);
        if (activeBtn) {
            const pokemon = appState.getCurrentPokemon();
            const name = pokemon.name.trim();

            if (!name) {
                // 名前がない場合は番号を表示
                activeBtn.textContent = appState.currentSlotIndex + 1;
                activeBtn.style.backgroundImage = 'none';
                activeBtn.classList.remove('has-image');
                return;
            }

            // 画像読み込み試行
            // ボタンの中身をクリアしてimgタグを生成
            activeBtn.innerHTML = '';
            const img = document.createElement('img');
            img.src = `../image/${name}.gif`;
            img.alt = name;
            img.classList.add('pokemon-icon');
            
            // 画像読み込みエラー時の処理（テキスト表示に戻す）
            img.onerror = () => {
                activeBtn.textContent = name; // テキスト表示
                activeBtn.classList.remove('has-image');
            };

            // 画像読み込み成功時の処理
            img.onload = () => {
                activeBtn.classList.add('has-image');
            };

            activeBtn.appendChild(img);
        }
    }
});
