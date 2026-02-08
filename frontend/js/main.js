import { AppState } from './AppState.js?v=117';
import { SPECIES_DEX, MOVES_DEX, COMMONLY_USED_POKEMON, USAGE_RATE_DATA, loadAllData } from './data/loader.js?v=3';
import { ITEMS_DEX } from './data/items.js?v=3';
import { calculateDamage } from './calc/damage.js?v=202';
import { calculateHp, calculateStat } from './calc/stats.js?v=3';

const appState = new AppState();
// Debug: Expose to window
window.appState = appState;
window.SPECIES_DEX = SPECIES_DEX;

// ターン管理用ID
let globalTurnCounter = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();

    // Ally (自分) Inputs
    // Ally (自分) Inputs
    const allyNameInput = document.getElementById('ally-name-input');
    // const allyLevelInput = document.getElementById('ally-level-input'); // Removed
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
            const button = e.target.closest('.poke-slot');
            if (!button) return;

            const team = button.dataset.team;
            const index = parseInt(button.dataset.index);
            
            appState.switchSlot(team, index);
            
            const teamButtons = document.querySelectorAll(`.poke-slot[data-team="${team}"]`);
            teamButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            updateFormFromState(team);

            // スマホ版：異なるチームのスロットをクリックした場合、そのチームのタブへ切り替え
            if (window.innerWidth <= 768) {
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab && activeTab.dataset.tab !== team && activeTab.dataset.tab !== 'battle') {
                     const targetTabBtn = document.querySelector(`.tab-btn[data-tab="${team}"]`);
                     if (targetTabBtn) targetTabBtn.click();
                }
            }
        });
    });

    // フォーム入力の監視 (Ally)
    if (allyNameInput) {
        allyNameInput.addEventListener('input', (e) => {
            const pokemon = appState.getAllyPokemon();
            pokemon.name = e.target.value;
            // 名前変更時は種族値が変わる可能性があるので再計算
            pokemon.computeStats(); 
            updateFormFromState('ally'); 
            updateTeamSlots('ally');
        });
    }

    // Level input removed (Fixed 50)
    /*
    if (allyLevelInput) {
        allyLevelInput.addEventListener('input', (e) => {
            const pokemon = appState.getAllyPokemon();
            pokemon.level = parseInt(e.target.value) || 50;
            pokemon.computeStats();
            updateFormFromState('ally');
        });
    }
    */

    if (allyTeraSelect) {
        allyTeraSelect.addEventListener('change', (e) => {
            appState.getAllyPokemon().teraType = e.target.value;
        });
    }
    if (allyItemSelect) {
        allyItemSelect.addEventListener('change', (e) => {
            appState.getAllyPokemon().item = e.target.value;
        });
    }
    if (allyAbilitySelect) {
        allyAbilitySelect.addEventListener('change', (e) => {
            appState.getAllyPokemon().ability = e.target.value;
        });
    }

    // フォーム入力の監視 (Enemy)
    if (enemyNameInput) {
        enemyNameInput.addEventListener('input', (e) => {
            const pokemon = appState.getEnemyPokemon();
            pokemon.name = e.target.value;
            pokemon.computeStats();
            updateFormFromState('enemy');
            updateTeamSlots('enemy');
        });
    }
    if (enemyItemSelect) {
        enemyItemSelect.addEventListener('change', (e) => {
            appState.getEnemyPokemon().item = e.target.value;
        });
    }
    if (enemyAbilitySelect) {
        enemyAbilitySelect.addEventListener('change', (e) => {
            appState.getEnemyPokemon().ability = e.target.value;
        });
    }

    setupClearInputButtons();



    // --- Autocomplete Logic ---

    function setupAutocomplete(inputElement, listElement, teamType) {
        let currentFocus = -1;

        // Show suggestions on focus
        inputElement.addEventListener('focus', function(e) {
            renderPokemonList(this.value);
        });

        inputElement.addEventListener('input', function(e) {
            renderPokemonList(this.value);
        });

        function renderPokemonList(filterText) {
            listElement.innerHTML = '';
            currentFocus = -1;

            const allPokemon = Object.keys(SPECIES_DEX);
            
            if (!filterText) {
                // Empty input - show Pokemon from usage rate data (ranked by popularity)
                let suggestedPokemon = [];
                
                if (USAGE_RATE_DATA && USAGE_RATE_DATA.length > 0) {
                    // Use usage rate data, sorted by rank
                    suggestedPokemon = USAGE_RATE_DATA
                        .sort((a, b) => a.rank - b.rank)
                        .map(entry => entry.name)
                        .filter(name => SPECIES_DEX[name])
                        .slice(0, 30); // Top 30
                } else {
                    // Fallback to COMMONLY_USED_POKEMON
                    suggestedPokemon = COMMONLY_USED_POKEMON.filter(name => SPECIES_DEX[name]);
                }
                
                if (suggestedPokemon.length > 0) {
                    // Header
                    const header = document.createElement('li');
                    header.className = 'autocomplete-header';
                    header.textContent = 'よく使われているポケモン';
                    listElement.appendChild(header);

                    suggestedPokemon.forEach(name => {
                        const item = document.createElement('li');
                        item.className = 'commonly-used';
                        item.textContent = name;
                        item.addEventListener('click', function() {
                            inputElement.value = name;
                            listElement.innerHTML = '';
                            listElement.style.display = 'none';
                            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                        });
                        listElement.appendChild(item);
                    });

                    listElement.style.display = 'block';
                }
                return;
            }
            
            const matches = allPokemon.filter(name => name.startsWith(filterText));
            
            if (matches.length === 0) {
                listElement.style.display = 'none';
                return;
            }

            // 上位100件までに制限（パフォーマンス対策）
            const maxItems = 100;
            let count = 0;

            matches.forEach(name => {
                if (count >= maxItems) return;
                
                const item = document.createElement('li');
                // 前方一致部分を太字に
                item.innerHTML = `<strong>${name.substr(0, filterText.length)}</strong>${name.substr(filterText.length)}`;
                item.addEventListener('click', function() {
                    inputElement.value = name;
                    listElement.innerHTML = '';
                    listElement.style.display = 'none';
                    // 変更イベント発火 (input AND change)
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                });
                listElement.appendChild(item);
                count++;
            });

            listElement.style.display = 'block';
        }
        
        // キーボード操作サポート
        inputElement.addEventListener('keydown', function(e) {
            let x = listElement.getElementsByTagName('li');
            if (e.keyCode == 40) { // Down
                currentFocus++;
                addActive(x);
            } else if (e.keyCode == 38) { // Up
                currentFocus--;
                addActive(x);
            } else if (e.keyCode == 13) { // Enter
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x) x[currentFocus].click();
                }
            }
        });

        function addActive(x) {
            if (!x) return false;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add('autocomplete-active');
            // スクロール追従
            x[currentFocus].scrollIntoView({block: 'nearest'});
        }

        function removeActive(x) {
            for (let i = 0; i < x.length; i++) {
                x[i].classList.remove('autocomplete-active');
            }
        }

        document.addEventListener('click', function (e) {
            if (e.target !== inputElement) {
                listElement.innerHTML = '';
                listElement.style.display = 'none';
            }
        });
    }

    // セットアップ実行
    const allyInput = document.getElementById('ally-name-input');
    const allyList = document.getElementById('ally-autocomplete-list');
    if (allyInput && allyList) {
        setupAutocomplete(allyInput, allyList, 'ally');
    }

    const enemyInput = document.getElementById('enemy-name-input');
    const enemyList = document.getElementById('enemy-autocomplete-list');
    if (enemyInput && enemyList) {
        setupAutocomplete(enemyInput, enemyList, 'enemy');
    }


    // --- Move Configuration Logic (Rich Autocomplete & Vertical Layout) ---
    
    const TYPE_CLASSES = {
        'Normal': 'normal', 'Fire': 'fire', 'Water': 'water', 'Electric': 'electric',
        'Grass': 'grass', 'Ice': 'ice', 'Fighting': 'fighting', 'Poison': 'poison',
        'Ground': 'ground', 'Flying': 'flying', 'Psychic': 'psychic', 'Bug': 'bug',
        'Rock': 'rock', 'Ghost': 'ghost', 'Dragon': 'dragon', 'Dark': 'dark',
        'Steel': 'steel', 'Fairy': 'fairy',
        // Japanese Keys
        'ノーマル': 'normal', 'ほのお': 'fire', 'みず': 'water', 'でんき': 'electric',
        'くさ': 'grass', 'こおり': 'ice', 'かくとう': 'fighting', 'どく': 'poison',
        'じめん': 'ground', 'ひこう': 'flying', 'エスパー': 'psychic', 'むし': 'bug',
        'いわ': 'rock', 'ゴースト': 'ghost', 'ドラゴン': 'dragon', 'あく': 'dark',
        'はがね': 'steel', 'フェアリー': 'fairy'
    };

    const TYPE_NAMES_JP = {
        'Normal': 'ノーマル', 'Fire': 'ほのお', 'Water': 'みず', 'Electric': 'でんき',
        'Grass': 'くさ', 'Ice': 'こおり', 'Fighting': 'かくとう', 'Poison': 'どく',
        'Ground': 'じめん', 'Flying': 'ひこう', 'Psychic': 'エスパー', 'Bug': 'むし',
        'Rock': 'いわ', 'Ghost': 'ゴースト', 'Dragon': 'ドラゴン', 'Dark': 'あく',
        'Steel': 'はがね', 'Fairy': 'フェアリー'
    };

    // Helper to update the sibling display
    function updateMoveInfoDisplay(inputElement, moveName) {
        const wrapper = inputElement.closest('.move-input-wrapper');
        if (!wrapper) return;
        const display = wrapper.querySelector('.move-info-display');
        if (!display) return;
        
        display.innerHTML = ''; // Clear
        
        if (!moveName) return;
        
        const moveData = MOVES_DEX[moveName];
        if (!moveData) return;
        
        const typeClass = TYPE_CLASSES[moveData.type] || 'normal';
        const typeName = TYPE_NAMES_JP[moveData.type] || moveData.type;
        const powerText = (moveData.power > 0) ? `${moveData.power}` : '-';

        // Create Type Badge
        const badge = document.createElement('span');
        badge.className = `type-badge ${typeClass}`;
        badge.textContent = typeName;
        
        // Create Category Badge
        const categorySpan = document.createElement('span');
        categorySpan.className = 'move-category ';
        if (moveData.category === 'Physical') {
            categorySpan.className += 'physical';
            categorySpan.textContent = '物理';
        } else if (moveData.category === 'Special') {
            categorySpan.className += 'special';
            categorySpan.textContent = '特殊';
        } else {
            categorySpan.className += 'status';
            categorySpan.textContent = '変化';
        }
        
        // Create Power Text
        const powerSpan = document.createElement('span');
        powerSpan.textContent = powerText;
        powerSpan.style.color = '#666';
        
        display.appendChild(badge);
        display.appendChild(categorySpan);
        display.appendChild(powerSpan);
    }

    function setupMoveAutocomplete(inputElement, listElement, side, index) {
        let currentFocus = -1;

        inputElement.addEventListener('focus', function() {
            renderList(this.value);
        });

        inputElement.addEventListener('input', function() {
            renderList(this.value);
            // Clear display on manual input until match is confirmed (optional, keep it simple)
        });

        function renderList(filterText) {
            currentFocus = -1;
            listElement.innerHTML = '';
            
            const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
            
            // Get commonly used moves from usage rate data first, fallback to speciesData
            let commonlyUsed = [];
            if (pokemon && pokemon.name && USAGE_RATE_DATA && USAGE_RATE_DATA.length > 0) {
                const usageEntry = USAGE_RATE_DATA.find(entry => entry.name === pokemon.name);
                if (usageEntry && usageEntry.moves) {
                    // Extract move names from usage rate data (sorted by rate)
                    commonlyUsed = usageEntry.moves.map(m => m.name);
                }
            }
            
            // Fallback to speciesData.commonly_use if no usage rate data
            if (commonlyUsed.length === 0 && pokemon && pokemon.speciesData && pokemon.speciesData.commonly_use) {
                commonlyUsed = pokemon.speciesData.commonly_use;
            }
            
            const allMoves = (pokemon && pokemon.speciesData && pokemon.speciesData.moves) 
                ? pokemon.speciesData.moves 
                : Object.keys(MOVES_DEX);

            // Filter commonly used moves
            const commonMatches = commonlyUsed.filter(m => m.startsWith(filterText));
            // Filter regular moves (excluding commonly used)
            const regularMoves = allMoves.filter(m => !commonlyUsed.includes(m));
            const regularMatches = regularMoves.filter(m => m.startsWith(filterText));

            if (commonMatches.length === 0 && regularMatches.length === 0) {
                listElement.style.display = 'none';
                return;
            }

            // Helper to create move item
            function createMoveItem(moveName) {
                const li = document.createElement('li');
                const moveData = MOVES_DEX[moveName];
                
                let typeHtml = '';
                let categoryHtml = '';
                let powerHtml = '-';
                
                if (moveData) {
                    const typeClass = TYPE_CLASSES[moveData.type] || 'normal';
                    const typeName = TYPE_NAMES_JP[moveData.type] || moveData.type;
                    typeHtml = `<span class="type-badge ${typeClass}">${typeName}</span>`;
                    
                    // Category display
                    if (moveData.category === 'Physical') {
                        categoryHtml = '<span class="move-category physical">物理</span>';
                    } else if (moveData.category === 'Special') {
                        categoryHtml = '<span class="move-category special">特殊</span>';
                    } else {
                        categoryHtml = '<span class="move-category status">変化</span>';
                    }
                    
                    powerHtml = (moveData.power > 0) ? moveData.power : '-';
                }

                const nameHtml = `<strong>${moveName.substr(0, filterText.length)}</strong>${moveName.substr(filterText.length)}`;

                li.innerHTML = `
                    <div class="move-name">${nameHtml}</div>
                    <div class="move-type">${typeHtml}</div>
                    <div class="move-category-col">${categoryHtml}</div>
                    <div class="move-power">${powerHtml}</div>
                `;

                li.addEventListener('mousedown', function(e) {
                    inputElement.value = moveName;
                    listElement.style.display = 'none';
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                    triggerChange(moveName);
                });

                return li;
            }

            // Show commonly used moves first (if any match)
            if (commonMatches.length > 0) {
                const header = document.createElement('li');
                header.className = 'autocomplete-header';
                header.textContent = 'よく使われている技';
                listElement.appendChild(header);

                commonMatches.slice(0, 10).forEach(moveName => {
                    const li = createMoveItem(moveName);
                    li.classList.add('commonly-used');
                    listElement.appendChild(li);
                });
            }

            // Show regular moves (limited count)
            if (regularMatches.length > 0) {
                if (commonMatches.length > 0) {
                    // Add separator
                    const separator = document.createElement('li');
                    separator.className = 'autocomplete-separator';
                    separator.textContent = 'その他';
                    listElement.appendChild(separator);
                }

                const limit = Math.min(regularMatches.length, 40 - Math.min(commonMatches.length, 10));
                regularMatches.slice(0, limit).forEach(moveName => {
                    listElement.appendChild(createMoveItem(moveName));
                });
            }
            
            listElement.style.display = 'block';
        }

        function triggerChange(value) {
            const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
            if (pokemon) {
                pokemon.moves[index] = value;
                // Radio state is independent of move name, so no need to rerender radios here usually,
                // but good to keep state consistent.
                updateMoveInfoDisplay(inputElement, value);
            }
        }

        inputElement.addEventListener('blur', function() {
            // On blur, validation or just try to display info if exact match
            const val = this.value;
            if (MOVES_DEX[val]) {
                 updateMoveInfoDisplay(inputElement, val);
            }
            setTimeout(() => {
                listElement.style.display = 'none';
            }, 200);
        });
        
        // Keyboard Nav (optional but good)
    }

    function setupMoveInputs(side) {
        const prefix = (side === 'ally') ? 'ally' : 'enemy';
        const radioName = (side === 'ally') ? 'ally-active-move' : 'enemy-active-move';
        
        for (let i = 0; i < 4; i++) {
            // 1. Setup Input & Autocomplete
            const input = document.getElementById(`${prefix}-move-${i}`);
            if (input) {
                const wrapper = input.closest('.move-input-wrapper');
                const list = wrapper ? wrapper.querySelector('.custom-autocomplete-list') : null;

                if (list) {
                    setupMoveAutocomplete(input, list, side, i);
                }

                // Fix: Auto-detect move on input without clicking suggestion
                input.addEventListener('input', (e) => {
                    const val = e.target.value.trim();
                    const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
                    if (!pokemon) return;

                    // Try exact match in Japanese or English
                    let foundMove = null;
                    // MOVES_DEX keys are Japanese names
                    if (MOVES_DEX[val]) {
                         foundMove = val;
                    } else {
                        // Check if it's an English name or alias if needed (omitted for now as keys are JP)
                    }

                    if (foundMove) {
                        pokemon.moves[i] = foundMove;
                        updateMoveInfoDisplay(input, foundMove);
                    }
                });

                // Initial Value
                const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
                if (pokemon && pokemon.moves[i]) {
                    input.value = pokemon.moves[i];
                    updateMoveInfoDisplay(input, pokemon.moves[i]);
                }
            }

            // 2. Setup Radio Button
            // We need to find the radio button generated in HTML. 
            // It shares the same container or we query by name/value.
            const radios = document.getElementsByName(radioName);
            // find the one with value == i
            const radio = Array.from(radios).find(r => r.value == i);
            
            if (radio) {
                radio.addEventListener('change', () => {
                    const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
                    if (pokemon) {
                        pokemon.activeMoveIndex = i;
                    }
                });
            }
        }
    }

    // Replaces 'renderMoveButtons'. Call this to sync radio stat with appState.
    function updateMoveSelectionUI(side) {
        const radioName = (side === 'ally') ? 'ally-active-move' : 'enemy-active-move';
        const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
        if (!pokemon) return;

        const radios = document.getElementsByName(radioName);
        Array.from(radios).forEach(r => {
            if (parseInt(r.value) === pokemon.activeMoveIndex) {
                r.checked = true;
            }
        });
        
        // Update input values too (switching pokemon)
        const prefix = (side === 'ally') ? 'ally' : 'enemy';
        pokemon.moves.forEach((move, i) => {
             const input = document.getElementById(`${prefix}-move-${i}`);
             if (input) {
                input.value = move;
                updateMoveInfoDisplay(input, move);
             }
        });
    }

    // Initialize
    ['ally', 'enemy'].forEach(side => {
        setupMoveInputs(side);
        updateMoveSelectionUI(side); // Set initial radio
    });
    // ----------------------------

    // アイテムリストの生成
    const itemSelects = [allyItemSelect, enemyItemSelect];
    itemSelects.forEach(select => {
        if (!select) return;
        // 既存のオプションをクリア（"なし"以外）
        select.innerHTML = '<option value="">なし</option>';
        
        Object.keys(ITEMS_DEX).forEach(itemName => {
            const option = document.createElement('option');
            option.value = itemName;
            option.textContent = itemName;
            select.appendChild(option);
        });
    });

    document.querySelectorAll('.stat-input').forEach(input => {
        // Nature (Select) changes need to trigger calc
        input.addEventListener('input', handleStatChange);
        input.addEventListener('change', handleStatChange);
    });

    // ランク補正 select のイベント監視
    document.querySelectorAll('.rank-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const isAlly = e.target.closest('.ally');
            const pokemon = isAlly ? appState.getAllyPokemon() : appState.getEnemyPokemon();
            
            if (pokemon) {
                const statName = e.target.dataset.stat;
                if (statName && pokemon.stats[statName]) {
                    pokemon.stats[statName].rank = parseInt(e.target.value) || 0;
                    // ランク補正はダメージ計算時に反映されるので computeStats() は不要
                    // ただし、表示更新が必要な場合はここで行う
                }
            }
        });
    });

    document.querySelectorAll('.ev-252-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const container = e.target.closest('.ev-input-container');
            const input = container.querySelector('.stat-input[data-type="ev"]');
            if (input) {
                input.value = 252;
                // 手動でchangeイベントを発火させてhandleStatChangeを走らせる
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });

    // 持ち物手動発動
    document.querySelectorAll('.item-trigger-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const side = e.target.dataset.side;
            const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
            if (pokemon && pokemon.item) {
                applyRecovery(pokemon, side, pokemon.item);
            }
        });
    });

    // 技選択ボタン
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
                grid.querySelectorAll('.move-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Item Selects
    ['ally', 'enemy'].forEach(side => {
        const select = document.getElementById(`${side}-item-select`);
        if (select) {
            select.addEventListener('change', (e) => {
                const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
                if (pokemon) {
                    pokemon.item = e.target.value;
                    // 他のステータスへの影響（ハチマキ等）がある場合は再計算
                    pokemon.computeStats();
                    updateFormFromState(side);
                }
            });
        }
    });

    // Field Conditions
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
        //const isEnemy = e.target.closest('.enemy'); // Unused but implies scope

        let pokemon = isAlly ? appState.getAllyPokemon() : appState.getEnemyPokemon();

        if (pokemon) {
            const statName = e.target.dataset.stat;
            const type = e.target.dataset.type;

            if (statName && type === 'ev') {
                const value = parseInt(e.target.value) || 0;
                pokemon.stats[statName].ev = value;
                
                // 再計算
                pokemon.computeStats();
                updateFormFromState(isAlly ? 'ally' : 'enemy');
            }
        }
    }
    // ターン実行ロジック (共通化)
    const handleAttack = (attackerSide) => {
        const isAllyAttacking = (attackerSide === 'ally');
        const attacker = isAllyAttacking ? appState.getAllyPokemon() : appState.getEnemyPokemon();
        const defender = isAllyAttacking ? appState.getEnemyPokemon() : appState.getAllyPokemon();
        const defenderSide = isAllyAttacking ? 'enemy' : 'ally';
        
        try {
            // ターンIDを更新
            globalTurnCounter++;
            const currentTurnId = globalTurnCounter;
            
            // Define names early for use in all blocks
            const atkName = attacker.name.trim() || (isAllyAttacking ? "自分" : "相手");

            // バリデーション: 自分または相手のポケモン名が未入力の場合は警告を出して中断
            if (!attacker.name.trim() || !defender.name.trim()) {
                alert('自分と相手の両方のポケモン名を入力してください。');
                return;
            }

            // ダメージ計算
            const moveName = attacker.moves[attacker.activeMoveIndex];
            const move = MOVES_DEX[moveName] || { power: 0, type: 'Normal', category: 'Physical' };

            const damageResult = calculateDamage(attacker, defender, move, {});
            
            // ターン開始時点のHPを記録（乱数選択でここから引く）
            const turnStartHp = defender.currentHp;

            // デフォルト: ランダムに1つ採用して適用
            let appliedDamage = 0;
            let initialRollIndex = 0;
            if (damageResult.rolls.length > 0) {
                initialRollIndex = Math.floor(Math.random() * damageResult.rolls.length);
                appliedDamage = damageResult.rolls[initialRollIndex];
                // HP適用
                if (turnStartHp > 0) {
                    defender.currentHp = Math.max(0, turnStartHp - appliedDamage);
                }
            }

            // 結果表示更新 (Centralized)
            const resultContainer = document.querySelector('.damage-result-container');
            if (resultContainer) {
                const rangeText = resultContainer.querySelector('.damage-range');
                if (rangeText) {
                    const min = damageResult.min || 0;
                    const max = damageResult.max || 0;
                    const minPerc = (defender.maxHp > 0) ? (min / defender.maxHp * 100).toFixed(1) : 0;
                    const maxPerc = (defender.maxHp > 0) ? (max / defender.maxHp * 100).toFixed(1) : 0;
                    
                // const atkName = attacker.name.trim() || (isAllyAttacking ? "自分" : "相手"); // Moved to top
                    rangeText.innerHTML = `${min} 〜 ${max} (${minPerc}% 〜 ${maxPerc}%)`;
                }

                const killChanceText = resultContainer.querySelector('.kill-chance');
                if (killChanceText && defender.maxHp > 0) {
                     if (damageResult.max === 0) {
                        killChanceText.textContent = 'ダメージなし';
                    } else {
                        const minDmg = damageResult.rolls[0];
                        const maxDmg = damageResult.rolls[damageResult.rolls.length - 1];
                        const maxHits = Math.ceil(defender.maxHp / minDmg);
                        const minHits = Math.ceil(defender.maxHp / maxDmg);

                        if (minHits === maxHits) {
                            killChanceText.textContent = `確定${minHits}発`;
                        } else {
                            if (minHits === 1) {
                                const koCount = damageResult.rolls.filter(r => r >= defender.maxHp).length;
                                const percentage = (koCount / 16 * 100).toFixed(1);
                                killChanceText.textContent = `乱数1発 (${percentage}%)`;
                            } else {
                                killChanceText.textContent = `乱数${minHits}発 〜 確定${maxHits}発`;
                            }
                        }
                    }
                } else if (killChanceText) {
                    killChanceText.textContent = '-';
                }

                // Update Result Header (Icons & Move)
                const headerDisplay = document.querySelector('.result-header-display');
                if (headerDisplay) {
                    headerDisplay.style.display = 'flex';
                    
                    // Always set Ally Icon (Left) and Enemy Icon (Right)
                    const allyPoke = appState.getAllyPokemon();
                    const enemyPoke = appState.getEnemyPokemon();
                    
                    // Ally Icon
                    // Ally Icon
                    const allyIcon = document.getElementById('result-ally-icon');
                    if (allyIcon && allyPoke) {
                        const name = allyPoke.name.trim();
                        allyIcon.dataset.retried = ''; // Reset retry flag
                        
                        let src = `../backend/image/${name}.gif`;
                        if (allyPoke.speciesData && allyPoke.speciesData.sprite_url) {
                            src = allyPoke.speciesData.sprite_url;
                        }
                        
                        allyIcon.src = src;
                        allyIcon.alt = name;
                        allyIcon.onerror = () => { 
                            if (!allyIcon.dataset.retried) {
                                allyIcon.dataset.retried = 'true';
                                // JSON URL failed, try local
                                if (src !== `../backend/image/${name}.gif`) {
                                    allyIcon.src = `../backend/image/${name}.gif`;
                                    return;
                                }
                                
                                if (name.includes('（') || name.includes('(')) {
                                    const baseName = name.split(/[（(]/)[0];
                                    allyIcon.src = `../backend/image/${baseName}.gif`;
                                    return;
                                }
                            }
                            allyIcon.src = ''; 
                            allyIcon.alt = name; 
                        };
                    }

                    // Enemy Icon
                    const enemyIcon = document.getElementById('result-enemy-icon');
                    if (enemyIcon && enemyPoke) {
                        const name = enemyPoke.name.trim();
                        enemyIcon.dataset.retried = ''; // Reset retry flag
                        
                        let src = `../backend/image/${name}.gif`;
                        if (enemyPoke.speciesData && enemyPoke.speciesData.sprite_url) {
                            src = enemyPoke.speciesData.sprite_url;
                        }

                        enemyIcon.src = src;
                        enemyIcon.alt = name;
                        enemyIcon.onerror = () => { 
                            if (!enemyIcon.dataset.retried) {
                                enemyIcon.dataset.retried = 'true';
                                // JSON URL failed, try local
                                if (src !== `../backend/image/${name}.gif`) {
                                    enemyIcon.src = `../backend/image/${name}.gif`;
                                    return;
                                }
                                
                                if (name.includes('（') || name.includes('(')) {
                                    const baseName = name.split(/[（(]/)[0];
                                    enemyIcon.src = `../backend/image/${baseName}.gif`;
                                    return;
                                }
                            }
                            enemyIcon.src = ''; 
                            enemyIcon.alt = name; 
                        };
                    }
                    
                    // Arrow Direction
                    const arrowIcon = document.getElementById('result-arrow-icon');
                    if (arrowIcon) {
                        if (attackerSide === 'enemy') {
                            arrowIcon.classList.add('reversed'); // Point Left
                        } else {
                            arrowIcon.classList.remove('reversed'); // Point Right
                        }
                    }

                    // Move Name
                    const moveNameSpan = document.getElementById('result-move-name');
                    if (moveNameSpan) {
                         moveNameSpan.textContent = moveName;
                    }

                    // Update Mini HP Bars in Result Header
                    const updateHeaderHpBar = (side, pokemon) => {
                        const fill = document.getElementById(`result-${side}-mini-hp-fill`);
                        if (fill && pokemon) {
                            const hpRatio = pokemon.maxHp > 0 ? (pokemon.currentHp / pokemon.maxHp) * 100 : 0;
                            fill.style.width = `${hpRatio}%`;
                            
                            fill.style.backgroundColor = '';
                            if (hpRatio >= 50) fill.style.backgroundColor = 'var(--primary-green)';
                            else if (hpRatio >= 25) fill.style.backgroundColor = 'var(--accent-orange)';
                            else fill.style.backgroundColor = 'var(--primary-red)';
                        }
                    };
                    updateHeaderHpBar('ally', allyPoke);
                    updateHeaderHpBar('enemy', enemyPoke);
                }

                // 16段階乱数セレクト更新
                const oldSelect = document.getElementById('battle-random-roll');
                if (oldSelect && oldSelect.parentNode) {
                    const newSelect = document.createElement('select');
                    newSelect.className = 'random-select';
                    newSelect.id = 'battle-random-roll';

                    if (damageResult.rolls.length > 0) {
                        damageResult.rolls.forEach((val, i) => {
                            const option = document.createElement('option');
                            option.value = i;
                            option.textContent = `${85 + i}%: ${val}ダメージ`;
                            if (i === initialRollIndex) {
                                option.selected = true;
                            }
                            newSelect.appendChild(option);
                        });

                        newSelect.addEventListener('change', (e) => {
                            const selectedIndex = parseInt(e.target.value);
                            const val = damageResult.rolls[selectedIndex];
                            
                            // HP再適用 logic
                            if (turnStartHp > 0) {
                                defender.currentHp = Math.max(0, turnStartHp - val);
                            }

                            // 履歴更新
                            const rollLabel = `${85 + selectedIndex}%`;
                            const historyEntry = {
                                type: 'attack',
                                turnId: currentTurnId,
                                moveName: moveName,
                                damage: val,
                                attackerName: atkName,
                                defenderName: defender.name.trim() || (isAllyAttacking ? "相手" : "自分"),
                                attackerSide: attackerSide,
                                rollLabel: rollLabel,
                                hpBefore: turnStartHp,
                                hpAfter: defender.currentHp,
                                snapshot: {
                                    allyHps: appState.allyTeam.map(p => p.currentHp),
                                    enemyHps: appState.enemyTeam.map(p => p.currentHp)
                                }
                            };

                            // ポケモンの個別履歴を更新
                            if (defender.lastTurnId === currentTurnId) {
                                defender.history[defender.history.length - 1] = historyEntry;
                            } else {
                                defender.history.push(historyEntry);
                                defender.lastTurnId = currentTurnId;
                            }
                            
                            // 全体の対戦ログを更新
                            updateBattleLog(historyEntry);
                            
                            // UI更新
                            updateFormFromState(defenderSide);
                            renderBattleLog();
                        });
                    } else {
                         const option = document.createElement('option');
                         option.textContent = "ダメージなし";
                         newSelect.appendChild(option);
                    }
                    
                    oldSelect.parentNode.replaceChild(newSelect, oldSelect);
                }
            }

            // 初回計算時にも履歴に追加（デフォルト選択分）
            const initialRollLabel = `${85 + initialRollIndex}%`;
            const defName = defender.name.trim() || (isAllyAttacking ? "相手" : "自分");
            const historyEntry = {
                type: 'attack',
                turnId: currentTurnId,
                moveName: moveName,
                damage: appliedDamage,
                attackerName: atkName,
                defenderName: defName,
                attackerSide: attackerSide,
                rollLabel: initialRollLabel,
                hpBefore: turnStartHp,
                hpAfter: defender.currentHp,
                snapshot: {
                    allyHps: appState.allyTeam.map(p => p.currentHp),
                    enemyHps: appState.enemyTeam.map(p => p.currentHp)
                }
            };
            defender.history.push(historyEntry);
            defender.lastTurnId = currentTurnId;

            // 全体の対戦ログに追加
            updateBattleLog(historyEntry);
            renderBattleLog();

            console.log(`Turn executed (${attackerSide} -> ${defenderSide}).`);

            updateFormFromState('ally');
            updateFormFromState('enemy');
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました: ' + e.message);
        } finally {
            // 自動きのみチェック
            if (attackerSide === 'ally') {
                checkBerryRecovery(defender, 'enemy');
            } else {
                checkBerryRecovery(defender, 'ally');
            }
        }
    };

    function checkBerryRecovery(pokemon, side) {
        if (pokemon.itemConsumed || pokemon.currentHp <= 0) return;
        const itemInfo = ITEMS_DEX[pokemon.item];
        if (!itemInfo || itemInfo.type !== 'berry') return;

        const hpRatio = pokemon.currentHp / pokemon.maxHp;
        if (hpRatio <= itemInfo.threshold) {
            applyRecovery(pokemon, side, pokemon.item);
        }
    }

    function applyRecovery(pokemon, side, itemName) {
        const itemInfo = ITEMS_DEX[itemName];
        if (!itemInfo) return;

        let healAmount = 0;
        if (itemInfo.healType === 'ratio') {
            healAmount = Math.floor(pokemon.maxHp * itemInfo.value);
        }

        const actualHealed = pokemon.heal(healAmount);
        if (actualHealed <= 0 && itemInfo.type === 'passive') return; // 回復なしなら何もしない（たべのこし連打防止）

        if (itemInfo.type === 'berry') {
            pokemon.itemConsumed = true;
        }

        // ログに記録
        const historyEntry = {
            type: 'heal',
            turnId: globalTurnCounter || 0, // 0ターン目もありうる
            moveName: itemInfo.message,
            damage: actualHealed,
            attackerName: pokemon.name.trim() || (side === 'ally' ? "自分" : "相手"),
            attackerSide: side, // 回復した側をattackerSideとして扱う
            hpBefore: pokemon.currentHp - actualHealed,
            hpAfter: pokemon.currentHp,
            snapshot: {
                allyHps: appState.allyTeam.map(p => p.currentHp),
                enemyHps: appState.enemyTeam.map(p => p.currentHp)
            }
        };

        appState.battleHistory.push(historyEntry);
        updateFormFromState(side);
        renderBattleLog();
    }

    // ボタンイベントリスナー設定
    const allyAtkBtn = document.getElementById('execute-ally-attack');
    if (allyAtkBtn) {
        allyAtkBtn.addEventListener('click', () => handleAttack('ally'));
    }

    const enemyAtkBtn = document.getElementById('execute-enemy-attack');
    if (enemyAtkBtn) {
        enemyAtkBtn.addEventListener('click', () => handleAttack('enemy'));
    }

    // 履歴クリアボタン
    document.querySelectorAll('.clear-history-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const side = e.target.dataset.side;
            const poke = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
            if (poke && confirm(`${side === 'ally' ? '自分' : '相手'}のダメージ履歴をクリアしますか？`)) {
                poke.clearHistory();
                updateFormFromState(side);
            }
        });
    });

    // 対戦ログ消去ボタン
    const clearBattleLogBtn = document.getElementById('clear-battle-log-btn');
    if (clearBattleLogBtn) {
        clearBattleLogBtn.addEventListener('click', () => {
            if (confirm('ログを消去し、全ポケモンのHPと履歴をリセットしますか？')) {
                appState.resetAllTeams();
                updateFormFromState('ally');
                updateFormFromState('enemy');
                renderBattleLog();
            }
        });
    }

    // 初期表示
    updateFormFromState('ally');
    updateFormFromState('enemy');
    renderBattleLog();

    // ログ更新ロジック (同じターンIDのアクションを最新の乱数で上書きする)
    function updateBattleLog(entry) {
        if (entry.type === 'attack') {
            const index = appState.battleHistory.findIndex(h => h.turnId === entry.turnId && h.type === 'attack');
            if (index !== -1) {
                appState.battleHistory[index] = entry;
                // 後続のひんしログの整合性チェック
                checkFaintLog(entry, index);
            } else {
                appState.battleHistory.push(entry);
                // ひんしログの追加チェック
                checkFaintLog(entry, appState.battleHistory.length - 1);
            }
        }
    }

    // HPが0になった際にひんしログを追加・削除する
    function checkFaintLog(attackEntry, attackIndex) {
        // 同じターンのひんしログを探す
        const faintIndex = appState.battleHistory.findIndex(h => h.turnId === attackEntry.turnId && h.type === 'faint');
        
        if (attackEntry.hpAfter === 0) {
            const faintEntry = {
                type: 'faint',
                turnId: attackEntry.turnId,
                defenderName: attackEntry.defenderName,
                attackerSide: attackEntry.attackerSide, // どちら側のポケモンが倒れたかを識別するため（便宜上）
                snapshot: attackEntry.snapshot
            };
            
            if (faintIndex !== -1) {
                appState.battleHistory[faintIndex] = faintEntry;
            } else {
                // attackログの直後に挿入
                appState.battleHistory.splice(attackIndex + 1, 0, faintEntry);
            }
        } else {
            // HPが残っているのにひんしログがある場合は削除（乱数選択し直した場合など）
            if (faintIndex !== -1) {
                appState.battleHistory.splice(faintIndex, 1);
            }
        }
    }

    function renderBattleLog() {
        const logList = document.getElementById('battle-log-list');
        if (!logList) return;

        if (appState.battleHistory.length === 0) {
            logList.innerHTML = '<li class="log-placeholder">攻撃ボタンを押すと対戦の記録がここに表示されます</li>';
            return;
        }

        logList.innerHTML = '';
        let turnDisplayCounter = 0;

        appState.battleHistory.forEach((entry, idx) => {
            const li = document.createElement('li');
            
            if (entry.type === 'attack') {
                turnDisplayCounter++;
                li.classList.add(entry.attackerSide === 'ally' ? 'ally-turn' : 'enemy-turn');
                li.innerHTML = `
                    <span class="turn-number">#${turnDisplayCounter}</span>
                    <strong>${entry.attackerName}</strong>の<span class="log-move">${entry.moveName}</span>！<br>
                    ${entry.defenderName}に <strong>${entry.damage}</strong> ダメージを与えた<br>
                    <span class="log-hp">（HP: ${entry.hpBefore} → ${entry.hpAfter} / 採用乱数:${entry.rollLabel}）</span>
                `;
            } else if (entry.type === 'heal') {
                li.classList.add('heal-log');
                li.innerHTML = `
                    <span class="turn-number">✨</span>
                    <span class="log-move">${entry.attackerName} は ${entry.moveName}</span>
                    <span class="log-hp">HP: ${entry.hpBefore} → ${entry.hpAfter} (+${entry.damage})</span>
                `;
            } else if (entry.type === 'faint') {
                // ひんしログは攻撃された側（defender）の属性で色分け
                const sideClass = (entry.attackerSide === 'ally') ? 'enemy-turn' : 'ally-turn';
                li.classList.add(sideClass, 'faint-log');
                li.innerHTML = `
                    <span class="turn-number"></span>
                    <strong style="color: var(--primary-red);">${entry.defenderName}</strong>はたおれた！
                `;
            }
            
            logList.appendChild(li);
        });

        // 常に最新（下）へスクロール
        const container = document.getElementById('battle-log-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }

        // クリックイベントの紐付け (行ごとにやり直す)
        logList.querySelectorAll('li').forEach((li, idx) => {
            if (li.classList.contains('log-placeholder')) return;
            li.addEventListener('click', () => {
                const entry = appState.battleHistory[idx];
                if (entry && confirm(`ターン #${idx + 1} の時点まで状態を戻しますか？\n（これ以降の記録は消去されます）`)) {
                    revertToTurn(idx);
                }
            });
        });
    }

    function revertToTurn(historyIndex) {
        const targetEntry = appState.battleHistory[historyIndex];
        if (!targetEntry || !targetEntry.snapshot) return;

        // 1. HPの復元
        appState.allyTeam.forEach((p, i) => {
            p.currentHp = targetEntry.snapshot.allyHps[i];
        });
        appState.enemyTeam.forEach((p, i) => {
            p.currentHp = targetEntry.snapshot.enemyHps[i];
        });

        // 2. 履歴のトリミング (対象より後のものを削除)
        appState.battleHistory = appState.battleHistory.slice(0, historyIndex + 1);

        // 3. 個別ポケモンの履歴も必要に応じて整理したほうが良いが、
        // 簡易化のため一旦そのままでも良い（HP整合性さえ取れれば）。
        // 本来は turnId > targetEntry.turnId のものを各Pokemon.historyから消すべき。
        [...appState.allyTeam, ...appState.enemyTeam].forEach(p => {
            p.history = p.history.filter(h => h.turnId <= targetEntry.turnId);
            // lastTurnId も戻す
            p.lastTurnId = p.history.length > 0 ? p.history[p.history.length - 1].turnId : null;
        });

        // 4. UI更新
        updateFormFromState('ally');
        updateFormFromState('enemy');
        renderBattleLog();
    }


    const TYPE_TO_JP = {
        'normal': 'ノーマル', 'fire': 'ほのお', 'water': 'みず', 'electric': 'でんき',
        'grass': 'くさ', 'ice': 'こおり', 'fighting': 'かくとう', 'poison': 'どく',
        'ground': 'じめん', 'flying': 'ひこう', 'psychic': 'エスパー', 'bug': 'むし',
        'rock': 'いわ', 'ghost': 'ゴースト', 'dragon': 'ドラゴン', 'dark': 'あく',
        'steel': 'はがね', 'fairy': 'フェアリー', 'stellar': 'ステラ'
    };

    const JP_TO_TYPE = {};
    Object.entries(TYPE_TO_JP).forEach(([en, jp]) => {
        JP_TO_TYPE[jp] = en;
    });

    function renderBaseStats(side, poke) {
        const container = document.getElementById(`${side}-base-stats`);
        if (!container) return;

        if (!poke.speciesData || !poke.name.trim()) {
            container.innerHTML = '';
            return;
        }

        const typesHtml = poke.speciesData.types.map(t => {
            // t comes from JSON as Japanese (e.g. "くさ") or potentially English
            // We need the English key (e.g. "grass") for the CSS class
            const enType = JP_TO_TYPE[t] || t.toLowerCase();
            const display = TYPE_TO_JP[enType] || t; // Ensure display is Japanese if we have it
            
            return `<span class="type-badge ${enType}">${display}</span>`;
        }).join(' ');

        const bs = poke.speciesData.baseStats;
        const stats = [
            { label: 'H', val: bs.hp },
            { label: 'A', val: bs.attack },
            { label: 'B', val: bs.defense },
            { label: 'C', val: bs.spAtk },
            { label: 'D', val: bs.spDef },
            { label: 'S', val: bs.speed }
        ];

        const total = Object.values(bs).reduce((a, b) => a + b, 0);

        container.innerHTML = `
            <div class="stats-types">${typesHtml}</div>
            <div class="stats-row-container">
                ${stats.map(s => `
                    <div class="stat-item">
                        <span class="label">${s.label}:</span>
                        <span class="value">${s.val}</span>
                    </div>
                `).join('')}
                <div class="stat-item"><span class="label">計:</span><span class="value">${total}</span></div>
            </div>
        `;
    }

    function renderHistory(side, poke) {
        const historyList = document.getElementById(`${side}-damage-history`);
        if (!historyList) return;

        historyList.innerHTML = '';
        // 履歴を逆順（新しい順）で表示
        if (poke.history && poke.history.length > 0) {
            [...poke.history].reverse().forEach(entry => {
                const li = document.createElement('li');
                const perc = (poke.maxHp > 0) ? (entry.damage / poke.maxHp * 100).toFixed(1) : 0;
                
                li.innerHTML = `
                    <span class="move">${entry.moveName}</span>
                    <span class="dmg">ダメージ：${entry.damage}</span>
                    <span class="perc">(割合：${perc}%)</span>
                    <div class="attacker">
                        HP：${entry.hpBefore} → ${entry.hpAfter}<br>
                        ${entry.attackerName}からの受けた攻撃 (乱数：${entry.rollLabel})
                    </div>
                `;
                historyList.appendChild(li);
            });
        }
    }


    // Helper: Adjust 能力P to achieve real stat +/- 1 (since 1P = 1 stat, just increment/decrement)
    function adjustEvForRealStat(pokemon, statName, delta) {
        if (!pokemon.speciesData) return;
        let current = pokemon.stats[statName].ev;
        if (delta > 0) {
            current = Math.min(32, current + 1);
        } else {
            current = Math.max(0, current - 1);
        }
        pokemon.stats[statName].ev = current;
    }

    function setupStatInputs(side) {
        // Find the specific container for this side
        // side is 'ally' or 'enemy'.
        // In index.html, the structure is <section class="poke-settings ally ..."> -> <div class="stats-container">
        // So we can use .poke-settings.{side} .stats-container
        
        const containerSelector = `.poke-settings.${side} .stats-container`;
        const container = document.querySelector(containerSelector);
        
        if (!container) return; // Should not happen if DOM is ready

        // 1. Standard Inputs
        const inputs = container.querySelectorAll('.stat-input');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const stat = e.target.dataset.stat;
                const type = e.target.dataset.type;
                const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
                if (pokemon) {
                    const val = parseInt(e.target.value);
                    if (type === 'iv') pokemon.stats[stat].iv = val;
                    if (type === 'ev') pokemon.stats[stat].ev = val;
                    pokemon.computeStats();
                    updateFormFromState(side);
                }
            });
        });

        // 2. 能力P Tuning Buttons (▼ / ▲) - range 0-32
        const tuneButtons = container.querySelectorAll('.tune-btn');
        tuneButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // ボタン内のアイコンをクリックした場合などの対策 (e.targetがbuttonでない場合)
                const target = e.target.closest('.tune-btn');
                if (!target) return;

                const stat = target.dataset.stat;
                const action = target.dataset.action;
                const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
                
                if (pokemon) {
                    let current = pokemon.stats[stat].ev;
                    if (action === 'up') {
                        current = Math.min(32, current + 1);
                    } else {
                        current = Math.max(0, current - 1);
                    }
                    pokemon.stats[stat].ev = current;
                    pokemon.computeStats();
                    updateFormFromState(side);
                }
            });
        });

        // 3. Preset Buttons (0 / 32)
        const presetButtons = container.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('.stat-controls');
                const statInput = row.querySelector('.ev-input');
                const stat = statInput.dataset.stat;
                const val = parseInt(e.target.dataset.val);
                const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
                if (pokemon) {
                    pokemon.stats[stat].ev = val;
                    pokemon.computeStats();
                    updateFormFromState(side);
                }
            });
        });

        // 4. Nature Buttons
        const natureButtons = container.querySelectorAll('.nature-btn');
        natureButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stat = e.target.dataset.stat;
                const val = e.target.dataset.val;
                const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
                if (pokemon) {
                    const currentNature = pokemon.stats[stat].nature;
                    let newNature = val;
                    if (currentNature === val) {
                        newNature = 'neutral';
                    }
                    pokemon.stats[stat].nature = newNature;
                    pokemon.computeStats();
                    updateFormFromState(side);
                }
            });
        });
    }

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
        
        // 初回計算
        if (pokemon.realStats.hp === 0) {
             pokemon.computeStats(); 
        }

        // Basic Info
        const prefix = (teamType === 'ally') ? 'ally' : 'enemy';
        const nameInput = document.getElementById(`${prefix}-name-input`);
        const itemSelect = document.getElementById(`${prefix}-item-select`);
        const abilitySelect = document.getElementById(`${prefix}-ability-select`);
        const levelInput = document.getElementById(`${prefix}-level-input`);
        const teraSelect = document.getElementById(`${prefix}-tera-select`);
        
        if (nameInput) nameInput.value = pokemon.name;
        if (levelInput) levelInput.value = pokemon.level;
        if (teraSelect) teraSelect.value = pokemon.teraType;
        if (itemSelect && pokemon.item) itemSelect.value = pokemon.item;

        // 使用率データ表示をポケモンに同期
        updateUsageRateDisplay(teamType, pokemon.name);

        // Ability syncing
        if (abilitySelect && pokemon.speciesData) {
            const currentVal = pokemon.ability || abilitySelect.value;
            abilitySelect.innerHTML = '';
            if (pokemon.speciesData.abilities) {
                pokemon.speciesData.abilities.forEach(ab => {
                   const opt = document.createElement('option');
                   opt.value = ab.name;
                   opt.textContent = ab.name + (ab.is_hidden ? ' (夢)' : '');
                   abilitySelect.appendChild(opt);
                });
            }
            if (currentVal) {
                abilitySelect.value = currentVal;
            } else if (abilitySelect.options.length > 0) {
                abilitySelect.value = abilitySelect.options[0].value;
                pokemon.ability = abilitySelect.value;
            }
        }

        // Stats Update (Inputs & Real Values)
        const stats = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
        stats.forEach(stat => {
            const data = pokemon.stats[stat];
            
            // Inputs
            // Also need to fix invalid selector here if it used #{side}-stats
            // The original logic was: container.querySelector(...)
            // But verify specifically what was used.
            // Original: const ivInput = document.querySelector(`#${teamType}-stats input[data-stat="${stat}"][data-type="iv"]`);
            // This is BAD. We should use `container.querySelector` with scoped selector to avoid ID dependency.
            
            const evInput = container.querySelector(`input[data-stat="${stat}"][data-type="ev"]`);
            const rankSelect = container.querySelector(`.rank-select[data-stat="${stat}"]`);
            
            if (evInput) evInput.value = data.ev;
            
            // ランク値の同期（HP以外）
            if (rankSelect && data.rank !== undefined) {
                rankSelect.value = data.rank;
            }

            // Nature Buttons State
            // Original: const upBtn = document.querySelector(`#${teamType}-stats .nature-btn.up[data-stat="${stat}"]`);
            // Change to container.querySelector
            
            const upBtn = container.querySelector(`.nature-btn.up[data-stat="${stat}"]`);
            const downBtn = container.querySelector(`.nature-btn.down[data-stat="${stat}"]`);
            const natureDisplay = container.querySelector(`.nature-display[data-stat="${stat}"]`);
            
            if (upBtn && downBtn && natureDisplay) {
                upBtn.classList.remove('active');
                downBtn.classList.remove('active');
                natureDisplay.textContent = '';
                natureDisplay.style.color = '#fff';
                natureDisplay.style.background = '#ccc'; // Default

                if (data.nature === 'up') {
                    upBtn.classList.add('active');
                    natureDisplay.textContent = '+';
                    natureDisplay.style.background = '#ef5350'; // Red
                } else if (data.nature === 'down') {
                    downBtn.classList.add('active');
                    natureDisplay.textContent = '-';
                    natureDisplay.style.background = '#42a5f5'; // Blue
                } else {
                    natureDisplay.style.background = '#26a69a'; // Teal
                }
            }

            // Real Value Update
            const realValEl = document.getElementById(`${teamType}-stat-val-${stat}`);
            if (realValEl) {
                realValEl.textContent = pokemon.speciesData ? pokemon.realStats[stat] : "-";
            }
        });

        // Other syncs
        renderBaseStats(teamType, pokemon);
        updateMoveSelectionUI(teamType);
        
        renderHistory(teamType, pokemon);
        updateTeamSlots(teamType);

        // HP Status Bar Update (新規追加)
        const currentHpEl = document.getElementById(`${prefix}-current-hp`);
        const maxHpEl = document.getElementById(`${prefix}-max-hp`);
        const hpBar = document.getElementById(`${prefix}-hp-bar`);
        
        if (currentHpEl) currentHpEl.textContent = pokemon.currentHp;
        if (maxHpEl) maxHpEl.textContent = pokemon.maxHp;
        
        if (hpBar && pokemon.maxHp > 0) {
            const hpRatio = (pokemon.currentHp / pokemon.maxHp) * 100;
            hpBar.style.width = `${hpRatio}%`;
            
            // HP残量に応じた色変更
            if (hpRatio >= 50) {
                hpBar.style.backgroundColor = 'var(--primary-green)';
            } else if (hpRatio >= 25) {
                hpBar.style.backgroundColor = 'var(--accent-orange)';
            } else {
                hpBar.style.backgroundColor = 'var(--primary-red)';
            }
        }
    }

    function updateTeamSlots(teamType) {
        const team = (teamType === 'ally') ? appState.allyTeam : appState.enemyTeam;
        
        team.forEach((pokemon, index) => {
            const slotBtn = document.querySelector(`.poke-slot[data-team="${teamType}"][data-index="${index}"]`);
            if (!slotBtn) return;

            const name = pokemon.name.trim();

            if (!name) {
                while (slotBtn.firstChild) slotBtn.removeChild(slotBtn.firstChild);
                slotBtn.textContent = index + 1;
                slotBtn.style.backgroundImage = 'none';
                slotBtn.classList.remove('has-image', 'fainted');
                return;
            }

            // ひんし状態の判定
            if (pokemon.currentHp === 0) {
                slotBtn.classList.add('fainted');
            } else {
                slotBtn.classList.remove('fainted');
            }

            // 1. Ensure clean slate (remove text nodes from "1", "2", etc.)
            // Keep only our managed elements
            Array.from(slotBtn.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    slotBtn.removeChild(node);
                }
            });

            // 1. Ensure Name Span
            let nameSpan = slotBtn.querySelector('.pokemon-name-text');
            if (!nameSpan) {
                nameSpan = document.createElement('span');
                nameSpan.className = 'pokemon-name-text';
                slotBtn.appendChild(nameSpan);
            }

            // 2. Ensure Image
            let img = slotBtn.querySelector('.pokemon-icon');
            if (!img) {
                img = document.createElement('img');
                img.className = 'pokemon-icon';
                slotBtn.insertBefore(img, nameSpan);
            }

            // 画像URLの決定: JSONデータがあれば sprite_url を優先
            let expectedSrc = null;
            if (pokemon.speciesData && pokemon.speciesData.sprite_url) {
                expectedSrc = pokemon.speciesData.sprite_url;
            } else if (name && SPECIES_DEX[name]) {
                 // Fallback if speciesData exists but no sprite_url (unlikely)
                 expectedSrc = `../backend/image/${name}.gif`;
            }

            // Only update if src changed
            if (img.dataset.key !== name) {
                img.dataset.key = name;
                img.dataset.retried = ''; // Reset retry flag
                
                if (expectedSrc) {
                    img.src = expectedSrc;
                    img.alt = name;
                    img.style.display = '';
                    nameSpan.style.display = 'none';
                } else {
                    // No valid data yet (partial match or invalid), hide image
                    img.style.display = 'none';
                    img.src = ''; // Clear to be safe
                    nameSpan.textContent = name;
                    nameSpan.style.display = 'inline';
                    slotBtn.classList.remove('has-image');
                    return; // Skip the rest
                }
                
                img.onerror = () => {
                    // JSONのURLで失敗した場合、ローカルのgifを試す (まだ試してなければ)
                    if (!img.dataset.retried) {
                        img.dataset.retried = 'true';
                        
                        // ローカルパスへフォールバック
                         if (img.src !== `../backend/image/${name}.gif`) { // Absolute check hard, just try local
                             // Simply try the local path if the remote one failed
                             img.src = `../backend/image/${name}.gif`;
                             return;
                         }

                        // ローカルでもダメなら ()除去等
                        if (name.includes('（') || name.includes('(')) {
                            const baseName = name.split(/[（(]/)[0];
                            img.src = `../backend/image/${baseName}.gif`;
                            return;
                        }
                    }

                    img.style.display = 'none';
                    nameSpan.textContent = name;
                    nameSpan.style.display = 'inline';
                    slotBtn.classList.remove('has-image');
                };
                
                img.onload = () => {
                    img.style.display = '';
                    nameSpan.style.display = 'none';
                    slotBtn.classList.add('has-image');
                };
            }
            
            // Re-apply current state if not loading
            if (img.style.display === 'none') {
                 nameSpan.textContent = name;
                 nameSpan.style.display = 'inline';
            } else {
                 nameSpan.style.display = 'none';
            }
            
            // 3. Mini HP Bar
            let miniHpContainer = slotBtn.querySelector('.mini-hp-bar');
            if (!miniHpContainer) {
                miniHpContainer = document.createElement('div');
                miniHpContainer.className = 'mini-hp-bar';
                const fill = document.createElement('div');
                fill.className = 'mini-hp-bar-fill';
                miniHpContainer.appendChild(fill);
                slotBtn.appendChild(miniHpContainer);
            }
            
            const fill = miniHpContainer.querySelector('.mini-hp-bar-fill');
            if (fill) {
                const hpRatio = pokemon.maxHp > 0 ? (pokemon.currentHp / pokemon.maxHp) * 100 : 0;
                fill.style.width = `${hpRatio}%`;
                
                fill.style.backgroundColor = '';
                if (hpRatio >= 50) fill.style.backgroundColor = 'var(--primary-green)';
                else if (hpRatio >= 25) fill.style.backgroundColor = 'var(--accent-orange)';
                else fill.style.backgroundColor = 'var(--primary-red)';
            }
        });
    }

    // Initialize stat inputs (EV buttons, Nature buttons, etc.)
    setupStatInputs('ally');
    setupStatInputs('enemy');
});

function setupClearInputButtons() {
    const buttons = document.querySelectorAll('.clear-input-btn[data-target]');
    buttons.forEach(button => {
        const inputId = button.dataset.target;
        const input = document.getElementById(inputId);
        if (!input) return;

        const toggleVisibility = () => {
            button.style.display = input.value ? 'block' : 'none';
        };

        input.addEventListener('input', toggleVisibility);
        toggleVisibility();

        button.addEventListener('click', () => {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.focus();
        });
    });
}

// --- Mobile Tab & Sticky Footer Logic ---
function initMobileTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const allyFooterBtn = document.getElementById('mobile-attack-ally');
        const enemyFooterBtn = document.getElementById('mobile-attack-enemy');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-tab');
                
                // Update Buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update Content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                const targetContent = document.getElementById('tab-' + targetId);
                if (targetContent) targetContent.classList.add('active');
            });
        });

        if (allyFooterBtn) {
            allyFooterBtn.addEventListener('click', () => {
                const allyAttackBtn = document.getElementById('execute-ally-attack');
                if (allyAttackBtn) {
                     allyAttackBtn.click();
                     // Switch to Battle tab to see result
                     const battleTab = document.querySelector('.tab-btn[data-tab="battle"]');
                     if (battleTab) battleTab.click();
                }
            });
        }

        if (enemyFooterBtn) {
            enemyFooterBtn.addEventListener('click', () => {
                const enemyAttackBtn = document.getElementById('execute-enemy-attack');
                if (enemyAttackBtn) {
                     enemyAttackBtn.click();
                     // Switch to Battle tab to see result
                     const battleTab = document.querySelector('.tab-btn[data-tab="battle"]');
                     if (battleTab) battleTab.click();
                }
            });
        }
    }

document.addEventListener('DOMContentLoaded', () => {
    initMobileTabs();
    initUsageRateDisplay();
});

// ========================================
// 使用率データ表示機能
// ========================================

// グラフインスタンスを保持
const chartInstances = {
    ally: {
        moves: null,
        items: null,
        personalities: null,
        teraTypes: null
    },
    enemy: {
        moves: null,
        items: null,
        personalities: null,
        teraTypes: null
    }
};

function initUsageRateDisplay() {
    // トグル機能の設定
    setupUsageRateToggle('ally');
    setupUsageRateToggle('enemy');
    
    // ポケモン選択時のイベントリスナー
    const allyInput = document.getElementById('ally-name-input');
    const enemyInput = document.getElementById('enemy-name-input');
    
    if (allyInput) {
        allyInput.addEventListener('change', () => {
            updateUsageRateDisplay('ally', allyInput.value);
        });
    }
    
    if (enemyInput) {
        enemyInput.addEventListener('change', () => {
            updateUsageRateDisplay('enemy', enemyInput.value);
        });
    }
}

function setupUsageRateToggle(side) {
    const header = document.getElementById(`${side}-usage-rate-header`);
    const content = document.getElementById(`${side}-usage-rate-content`);
    
    if (header && content) {
        header.addEventListener('click', () => {
            const isCollapsed = content.classList.contains('collapsed');
            
            if (isCollapsed) {
                content.classList.remove('collapsed');
                header.classList.remove('collapsed');
            } else {
                content.classList.add('collapsed');
                header.classList.add('collapsed');
            }
        });
    }
}

function updateUsageRateDisplay(side, pokemonName) {
    const section = document.getElementById(`${side}-usage-rate-section`);
    
    if (!pokemonName || !USAGE_RATE_DATA) {
        // データがない場合は非表示
        if (section) {
            section.style.display = 'none';
        }
        destroyCharts(side);
        return;
    }
    
    // 配列からポケモン名で検索
    const usageData = USAGE_RATE_DATA.find(entry => entry.name === pokemonName);
    
    if (!usageData) {
        // データがない場合は非表示
        if (section) {
            section.style.display = 'none';
        }
        destroyCharts(side);
        return;
    }
    
    // データがある場合は表示
    if (section) {
        section.style.display = 'block';
    }
    
    // 各グラフを描画
    renderMovesChart(side, usageData.moves);
    renderItemsChart(side, usageData.items);
    renderPersonalitiesChart(side, usageData.natures);
    renderTeraTypesChart(side, usageData.teras);
}

function destroyCharts(side) {
    Object.keys(chartInstances[side]).forEach(key => {
        if (chartInstances[side][key]) {
            chartInstances[side][key].destroy();
            chartInstances[side][key] = null;
        }
    });
}

function renderMovesChart(side, movesData) {
    const canvasId = `${side}-chart-trend-moves`;
    const canvas = document.getElementById(canvasId);
    
    if (!canvas || !movesData) return;
    
    // 既存のグラフを破棄
    if (chartInstances[side].moves) {
        chartInstances[side].moves.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const labels = movesData.map(item => item.name);
    const data = movesData.map(item => parseFloat(item.rate));
    
    const isMobile = window.innerWidth <= 768;

    chartInstances[side].moves = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '使用率 (%)',
                data: data,
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    ticks: {
                        autoSkip: !isMobile,
                        maxRotation: isMobile ? 60 : 35,
                        minRotation: isMobile ? 45 : 0,
                        font: {
                            size: isMobile ? 9 : 11
                        }
                    }
                }
            }
        }
    });
}

function renderItemsChart(side, itemsData) {
    const canvasId = `${side}-chart-trend-items`;
    const canvas = document.getElementById(canvasId);
    
    if (!canvas || !itemsData) return;
    
    // 既存のグラフを破棄
    if (chartInstances[side].items) {
        chartInstances[side].items.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const labels = itemsData.map(item => item.name);
    const data = itemsData.map(item => parseFloat(item.rate));
    
    chartInstances[side].items = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(199, 199, 199, 0.6)',
                    'rgba(83, 102, 255, 0.6)',
                    'rgba(255, 99, 255, 0.6)',
                    'rgba(99, 255, 132, 0.6)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 11
                        },
                        boxWidth: 12,
                        padding: 6
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

function renderPersonalitiesChart(side, naturesData) {
    const canvasId = `${side}-chart-trend-personalities`;
    const canvas = document.getElementById(canvasId);
    
    if (!canvas || !naturesData) return;
    
    // 既存のグラフを破棄
    if (chartInstances[side].personalities) {
        chartInstances[side].personalities.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const labels = naturesData.map(item => item.name);
    const data = naturesData.map(item => parseFloat(item.rate));
    
    chartInstances[side].personalities = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '使用率 (%)',
                data: data,
                backgroundColor: 'rgba(46, 204, 113, 0.6)',
                borderColor: 'rgba(46, 204, 113, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                y: {
                    position: 'right',
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function renderTeraTypesChart(side, teraTypesData) {
    const canvasId = `${side}-chart-trend-tera-types`;
    const canvas = document.getElementById(canvasId);
    
    if (!canvas || !teraTypesData) return;
    
    // 既存のグラフを破棄
    if (chartInstances[side].teraTypes) {
        chartInstances[side].teraTypes.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const labels = teraTypesData.map(item => item.name);
    const data = teraTypesData.map(item => parseFloat(item.rate));
    
    // タイプごとの色設定
    const typeColors = {
        'ノーマル': 'rgba(168, 167, 122, 0.6)',
        'ほのお': 'rgba(238, 129, 48, 0.6)',
        'みず': 'rgba(99, 144, 240, 0.6)',
        'でんき': 'rgba(247, 208, 44, 0.6)',
        'くさ': 'rgba(122, 199, 76, 0.6)',
        'こおり': 'rgba(150, 217, 214, 0.6)',
        'かくとう': 'rgba(194, 46, 40, 0.6)',
        'どく': 'rgba(163, 62, 161, 0.6)',
        'じめん': 'rgba(226, 191, 101, 0.6)',
        'ひこう': 'rgba(169, 143, 243, 0.6)',
        'エスパー': 'rgba(249, 85, 135, 0.6)',
        'むし': 'rgba(166, 185, 26, 0.6)',
        'いわ': 'rgba(182, 161, 54, 0.6)',
        'ゴースト': 'rgba(115, 87, 151, 0.6)',
        'ドラゴン': 'rgba(111, 53, 252, 0.6)',
        'あく': 'rgba(112, 87, 70, 0.6)',
        'はがね': 'rgba(183, 183, 206, 0.6)',
        'フェアリー': 'rgba(214, 133, 173, 0.6)'
    };
    
    const backgroundColors = labels.map(label => typeColors[label] || 'rgba(200, 200, 200, 0.6)');
    
    chartInstances[side].teraTypes = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '0%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 11
                        },
                        boxWidth: 12,
                        padding: 6
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}
