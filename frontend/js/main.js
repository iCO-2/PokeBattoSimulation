import { AppState } from './AppState.js';
import { SPECIES_DEX } from './data/species.js';
import { MOVES_DEX } from './data/moves.js';
import { calculateDamage } from './calc/damage.js';


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
            const button = e.target.closest('.poke-slot');
            if (!button) return;

            const team = button.dataset.team;
            const index = parseInt(button.dataset.index);
            
            appState.switchSlot(team, index);
            
            const teamButtons = document.querySelectorAll(`.poke-slot[data-team="${team}"]`);
            teamButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            updateFormFromState(team);
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
            updateSlotLabel('ally');
        });
    }

    if (allyLevelInput) {
        allyLevelInput.addEventListener('input', (e) => {
            const pokemon = appState.getAllyPokemon();
            pokemon.level = parseInt(e.target.value) || 50;
            pokemon.computeStats();
            updateFormFromState('ally');
        });
    }

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
            updateSlotLabel('enemy');
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

    // datalistの生成
    const datalist = document.getElementById('pokemon-list');
    if (datalist) {
        Object.keys(SPECIES_DEX).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
    }

    // ステータス入力の監視
    document.querySelectorAll('.stat-input').forEach(input => {
        // Nature (Select) changes need to trigger calc
        input.addEventListener('input', handleStatChange);
        input.addEventListener('change', handleStatChange);
    });

    // Nature radio buttons
    document.querySelectorAll('.nature-radio').forEach(radio => {
        radio.addEventListener('change', handleStatChange);
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
            
            // Radio button handling for Nature (simplified UI implies select, but radio exists in HTML?)
            // The HTML has radio buttons for nature bonus? Let's check HTML structure logic.
            // HTML: <input type="radio" name="ally-nature-bonus" ...> AND <select ... data-type="nature">
            // This duplication in HTML is tricky. I'll support the inputs currently visible.
            
            if (e.target.type === 'radio') {
                 // Radio logic if needed, but the select box seems primary for nature in previous code? 
                 // Actually previous code used data-type="nature" on select. 
            }

            if (statName && type) {
                let value = e.target.value;
                if (type === 'iv' || type === 'ev') {
                    value = parseInt(value) || 0;
                }
                pokemon.stats[statName][type] = value;
                
                // 再計算
                pokemon.computeStats();
                updateFormFromState(isAlly ? 'ally' : 'enemy');
            }
        }
    }
    
    // ターン実行ボタン
    const executeBtn = document.getElementById('execute-turn-btn');
    if (executeBtn) {
        executeBtn.addEventListener('click', () => {
            try {
                const allyPoke = appState.getAllyPokemon();
                const enemyPoke = appState.getEnemyPokemon();

                // ダメージ計算 (Ally -> Enemy)
                const moveName = allyPoke.moves[allyPoke.activeMoveIndex];
                const move = MOVES_DEX[moveName] || { power: 0, type: 'Normal', category: 'Physical' };

                const damageResult = calculateDamage(allyPoke, enemyPoke, move, {});
                
                // --- 変更点: 自動適用を行わず、開始時のHPを保持して選択待機する ---
                // ターン開始時点のHPを記録（乱数選択でここから引く）
                const turnStartHp = enemyPoke.currentHp;
                
                /* 自動適用ロジックは削除
                let damage = 0;
                if (damageResult.rolls.length > 0) {
                    damage = damageResult.rolls[Math.floor(Math.random() * damageResult.rolls.length)];
                }
                if (enemyPoke.currentHp > 0) {
                    enemyPoke.currentHp = Math.max(0, enemyPoke.currentHp - damage);
                }
                */

                // 結果表示更新
                const rangeText = document.querySelector('.damage-range');
                if (rangeText) {
                    const min = damageResult.min || 0;
                    const max = damageResult.max || 0;
                    const minPerc = (enemyPoke.maxHp > 0) ? (min / enemyPoke.maxHp * 100).toFixed(1) : 0;
                    const maxPerc = (enemyPoke.maxHp > 0) ? (max / enemyPoke.maxHp * 100).toFixed(1) : 0;
                    rangeText.textContent = `ダメージ: ${min} 〜 ${max} (${minPerc}% 〜 ${maxPerc}%) - 使用技: ${moveName}`;
                }

                // 16段階乱数リスト更新
                const randomList = document.querySelector('.random-list');
                if (randomList) {
                    randomList.innerHTML = '';
                    if (damageResult.rolls.length > 0) {
                        damageResult.rolls.forEach((val, i) => {
                            const li = document.createElement('li');
                            li.textContent = `${(0.85 + i * 0.01).toFixed(2)}: ${val}`;
                            
                            // Click Listener for Manual Selection
                            li.addEventListener('click', () => {
                                // 1. 他の選択解除
                                randomList.querySelectorAll('li').forEach(l => l.classList.remove('selected'));
                                // 2. 選択状態にする
                                li.classList.add('selected');
                                
                                // 3. HPをターン開始時の状態から減算して適用
                                if (turnStartHp > 0) {
                                    enemyPoke.currentHp = Math.max(0, turnStartHp - val);
                                }
                                
                                // 4. UI更新
                                updateFormFromState('enemy');
                                console.log(`Manual damage applied: ${val}. HP: ${turnStartHp} -> ${enemyPoke.currentHp}`);
                            });

                            randomList.appendChild(li);
                        });
                    } else {
                        randomList.innerHTML = '<li>ダメージなし</li>';
                    }
                }

                // 確定数（Kill Chance）の更新
                const killChanceText = document.querySelector('.kill-chance');
                if (killChanceText && enemyPoke.maxHp > 0) {
                    if (damageResult.max === 0) {
                        killChanceText.textContent = 'ダメージなし';
                    } else {
                        const minDmg = damageResult.rolls[0];
                        const maxDmg = damageResult.rolls[damageResult.rolls.length - 1];
                        
                        // 最小ダメージでの確定数 (最悪ケース)
                        const maxHits = Math.ceil(enemyPoke.maxHp / minDmg);
                        // 最大ダメージでの確定数 (最良ケース)
                        const minHits = Math.ceil(enemyPoke.maxHp / maxDmg);

                        if (minHits === maxHits) {
                            killChanceText.textContent = `確定${minHits}発`;
                        } else {
                            // 乱数1発の確率計算 (簡易)
                            if (minHits === 1) {
                                const koCount = damageResult.rolls.filter(r => r >= enemyPoke.maxHp).length;
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

                console.log(`Turn executed. Waiting for manual roll selection.`);

                // Initial UI update (Hp unchanged initially, but text updated)
                updateFormFromState('ally');
                updateFormFromState('enemy'); // This will redraw stats, but HP is still startHp
            } catch (e) {
                console.error(e);
                alert('エラーが発生しました: ' + e.message);
            }
        });
    }

    // 初期表示
    updateFormFromState('ally');
    updateFormFromState('enemy');

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
             pokemon.computeStats(); // 計算してなければ計算
        }

        // --- UI更新 ---

        // Basic Info
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

        // HP Bar
        const currentHpSpan = document.getElementById(`${teamType}-current-hp`);
        const maxHpSpan = document.getElementById(`${teamType}-max-hp`);
        const hpBar = document.getElementById(`${teamType}-hp-bar`);
        
        if (currentHpSpan && maxHpSpan && hpBar) {
            currentHpSpan.textContent = pokemon.currentHp;
            maxHpSpan.textContent = pokemon.maxHp;
            
            const ratio = (pokemon.maxHp > 0) ? (pokemon.currentHp / pokemon.maxHp) * 100 : 0;
            hpBar.style.width = `${Math.max(0, ratio)}%`;
            
            if (ratio > 50) hpBar.style.backgroundColor = 'var(--primary-green)';
            else if (ratio > 20) hpBar.style.backgroundColor = 'var(--accent-orange)';
            else hpBar.style.backgroundColor = 'var(--primary-red)';
        }

        // Stats Table Inputs
        container.querySelectorAll('.stat-input').forEach(input => {
            const statName = input.dataset.stat;
            const type = input.dataset.type;
            if (statName && type && pokemon.stats[statName]) {
                input.value = pokemon.stats[statName][type];
            }
        });

        // Real Stats Display
        // ID: ally-stat-val-hp etc.
        ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'].forEach(stat => {
            const el = document.getElementById(`${teamType}-stat-val-${stat}`);
            if (el) {
                // ポケモン名が未入力(speciesDataがない)なら "-"
                el.textContent = pokemon.speciesData ? pokemon.realStats[stat] : "-";
            }
        });

        // Move Buttons
        const moveBtns = container.querySelectorAll('.move-btn');
        moveBtns.forEach((btn, index) => {
            if (index === pokemon.activeMoveIndex) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Conditions
        container.querySelectorAll('.condition-check').forEach(check => {
            const condName = check.dataset.cond;
            if (condName && pokemon.conditions) {
                check.checked = !!pokemon.conditions[condName];
            }
        });
    }

    function updateSlotLabel(teamType) {
        let currentIndex = (teamType === 'ally') ? appState.currentAllyIndex : appState.currentEnemyIndex;
        
        const activeBtn = document.querySelector(`.poke-slot[data-team="${teamType}"][data-index="${currentIndex}"]`);
        if (activeBtn) {
            let pokemon = (teamType === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
            const name = pokemon.name.trim();

            if (!name) {
                activeBtn.textContent = currentIndex + 1;
                activeBtn.style.backgroundImage = 'none';
                activeBtn.classList.remove('has-image');
                return;
            }

            activeBtn.innerHTML = '';
            const img = document.createElement('img');
            img.src = `../backend/image/${name}.gif`;
            img.alt = name;
            img.classList.add('pokemon-icon');
            
            img.onerror = () => {
                activeBtn.textContent = name;
                activeBtn.classList.remove('has-image');
            };
            img.onload = () => {
                activeBtn.classList.add('has-image');
            };
            activeBtn.appendChild(img);
        }
    }
});
