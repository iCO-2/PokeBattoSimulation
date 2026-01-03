class Pokemon {
    constructor(id) {
        this.id = id;
        this.name = "";
        this.level = 50;
        this.teraType = "なし";
        // 今後ステータス、技、持ち物などを拡張
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
    
    // スロットボタンの初期化
    const slotButtons = document.querySelectorAll('.poke-slot');
    slotButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const team = e.target.dataset.team;
            const index = parseInt(e.target.dataset.index);
            
            // 状態更新
            appState.switchSlot(team, index);
            
            // UIのアクティブ表示更新
            slotButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // フォームの値を更新
            updateFormFromState();
        });
    });

    // フォーム入力の監視
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            if (appState.currentTeam === 'attacker') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.name = e.target.value;
                updateSlotLabel();
            }
        });
    }

    const defNameInput = document.getElementById('defender-name-input');
    if (defNameInput) {
        defNameInput.addEventListener('input', (e) => {
             if (appState.currentTeam === 'defender') {
                const pokemon = appState.getCurrentPokemon();
                pokemon.name = e.target.value;
                updateSlotLabel();
            }
        });
    }

    if (levelInput) {
        levelInput.addEventListener('input', (e) => {
            // 攻撃側のみレベル設定があると仮定（防御側は実数値直打ちが多いため）
            // 必要なら防御側にもレベル入力を用意するが、現状のHTMLにはないため攻撃側チェック
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

    // 初期表示
    updateFormFromState();

    function updateFormFromState() {
        const pokemon = appState.getCurrentPokemon();
        
        if (appState.currentTeam === 'attacker') {
            if (nameInput) nameInput.value = pokemon.name;
            if (levelInput) levelInput.value = pokemon.level;
            if (teraSelect) teraSelect.value = pokemon.teraType;
            
            // 攻撃側選択時は防御側の入力をクリアするか、あるいは何もしないか
            // わかりやすくするため、防御側入力欄（名前）は空にしてみる、等の処理も考えられるが
            // ユーザーが混乱しないよう、とりあえず今のフォーカス対象の値をセットすることに集中する
        } else {
            // 防御側
            if (defNameInput) defNameInput.value = pokemon.name;
            
            // 防御側にはレベル入力などがないため、攻撃側の入力をどうするか。
            // 誤認を防ぐため空白にするなどが親切かもしれない。
            if (nameInput) nameInput.value = ""; // 攻撃側名前欄はクリア
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
