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
    }
}

class AppState {
    constructor() {
        this.attackerTeam = [new Pokemon(1), new Pokemon(2), new Pokemon(3)];
        this.defenderTeam = [new Pokemon(1), new Pokemon(2), new Pokemon(3)];
        
        // 選択中のスロット (初期値: 自軍の1番目)
        this.currentTeam = 'attacker';
        this.currentSlotIndex = 0;
    }

    getCurrentPokemon() {
        const team = this.currentTeam === 'attacker' ? this.attackerTeam : this.defenderTeam;
        return team[this.currentSlotIndex];
    }

    switchSlot(teamType, index) {
        this.currentTeam = teamType;
        this.currentSlotIndex = index;
    }
}

const appState = new AppState();

document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('pokemon-name-input');
    const levelInput = document.getElementById('pokemon-level-input');
    const teraSelect = document.getElementById('pokemon-tera-select');
    const itemSelect = document.getElementById('item-select');
    const abilitySelect = document.getElementById('ability-select');
    
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

    // フォーム入力の監視
    const defNameInput = document.getElementById('defender-name-input');
    const defAbilitySelect = document.getElementById('def-ability-select');
    const defItemSelect = document.getElementById('def-item-select');

    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            if (appState.currentTeam === 'attacker') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.name = e.target.value;
                updateSlotLabel();
            }
        });
    }

    if (defNameInput) {
        defNameInput.addEventListener('input', (e) => {
             if (appState.currentTeam === 'defender') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.name = e.target.value;
                updateSlotLabel();
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

    if (levelInput) {
        levelInput.addEventListener('input', (e) => {
            // 攻撃側のみレベル設定があると仮定
            if (appState.currentTeam === 'attacker') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.level = parseInt(e.target.value) || 50;
            }
        });
    }

    if (teraSelect) {
        teraSelect.addEventListener('change', (e) => {
             if (appState.currentTeam === 'attacker') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.teraType = e.target.value;
            }
        });
    }

    if (itemSelect) {
        itemSelect.addEventListener('change', (e) => {
            if (appState.currentTeam === 'attacker') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.item = e.target.value;
            }
        });
    }

    if (abilitySelect) {
        abilitySelect.addEventListener('change', (e) => {
            if (appState.currentTeam === 'attacker') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.ability = e.target.value;
            }
        });
    }

    if (defItemSelect) {
        defItemSelect.addEventListener('change', (e) => {
            if (appState.currentTeam === 'defender') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.item = e.target.value;
            }
        });
    }

    if (defAbilitySelect) {
        defAbilitySelect.addEventListener('change', (e) => {
            if (appState.currentTeam === 'defender') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.ability = e.target.value;
            }
        });
    }

    // ステータス入力の監視
    document.querySelectorAll('.stat-input').forEach(input => {
        // 数値入力はinputイベント、Selectはchangeイベントで拾う
        input.addEventListener('input', handleStatChange);
        input.addEventListener('change', handleStatChange);
    });

    function handleStatChange(e) {
        // イベント発生元が攻撃側か防御側かを判定
        const isAttacker = e.target.closest('.attacker');
        const isDefender = e.target.closest('.defender');
        
        // 現在アクティブなチームと一致する場合のみ更新
        if ((isAttacker && appState.currentTeam === 'attacker') || 
            (isDefender && appState.currentTeam === 'defender')) {
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
        
        const isAttacker = appState.currentTeam === 'attacker';
        
        if (isAttacker) {
            // 攻撃側のフォーム更新
            if (nameInput) nameInput.value = pokemon.name;
            if (levelInput) levelInput.value = pokemon.level;
            if (teraSelect) teraSelect.value = pokemon.teraType;
            if (itemSelect) itemSelect.value = pokemon.item;
            if (abilitySelect) abilitySelect.value = pokemon.ability;

            document.querySelectorAll('.poke-settings.attacker .stat-input').forEach(input => {
                const statName = input.dataset.stat;
                const type = input.dataset.type;
                if (statName && type && pokemon.stats[statName]) {
                    input.value = pokemon.stats[statName][type];
                }
            });

            // 防御側の入力をクリアするかどうか（今回はクリアせずそのまま、または disable などが望ましいが簡易実装として何もしないか、クリアするか）
            // ユーザー体験的にはクリアしたほうが「今こっちを編集してる」感が出る
            if (defNameInput) defNameInput.value = "";
            document.querySelectorAll('.poke-settings.defender .stat-input').forEach(input => {
                input.value = ""; // あるいはデフォルト値
                if (input.tagName === 'SELECT') input.selectedIndex = 0;
                if (input.type === 'number') input.value = 0; // 簡易リセット
                // IVは31がデフォルトだと親切かも
                if (input.dataset.type === 'iv') input.value = 31;
            });

        } else {
            // 防御側のフォーム更新
            if (defNameInput) defNameInput.value = pokemon.name;
            if (defItemSelect) defItemSelect.value = pokemon.item;
            if (defAbilitySelect) defAbilitySelect.value = pokemon.ability;
            
            document.querySelectorAll('.poke-settings.defender .stat-input').forEach(input => {
                const statName = input.dataset.stat;
                const type = input.dataset.type;
                if (statName && type && pokemon.stats[statName]) {
                    input.value = pokemon.stats[statName][type];
                }
            });

            // 攻撃側の入力をクリア
            if (nameInput) nameInput.value = "";
            document.querySelectorAll('.poke-settings.attacker .stat-input').forEach(input => {
                 input.value = "";
                 if (input.tagName === 'SELECT') input.selectedIndex = 0;
                 if (input.type === 'number') input.value = 0;
                 if (input.dataset.type === 'iv') input.value = 31;
            });
        }
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
