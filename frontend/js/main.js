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
    
    // ターン実行ロジック (共通化)
    const handleAttack = (attackerSide) => {
        try {
            const isAllyAttacking = (attackerSide === 'ally');
            const attacker = isAllyAttacking ? appState.getAllyPokemon() : appState.getEnemyPokemon();
            const defender = isAllyAttacking ? appState.getEnemyPokemon() : appState.getAllyPokemon();
            const defenderSide = isAllyAttacking ? 'enemy' : 'ally';

            // ダメージ計算
            const moveName = attacker.moves[attacker.activeMoveIndex];
            const move = MOVES_DEX[moveName] || { power: 0, type: 'Normal', category: 'Physical' };

            const damageResult = calculateDamage(attacker, defender, move, {});
            
            // ターン開始時点のHPを記録（乱数選択でここから引く）
            const turnStartHp = defender.currentHp;

            // 結果表示更新
            // 変更点: calc-container配下ではなく、各サイド (.poke-settings) 内の要素を更新する
            const defenderContainer = document.querySelector(`.poke-settings.${defenderSide}`);
            if (!defenderContainer) return;

            const rangeText = defenderContainer.querySelector('.damage-range');
            if (rangeText) {
                const min = damageResult.min || 0;
                const max = damageResult.max || 0;
                const minPerc = (defender.maxHp > 0) ? (min / defender.maxHp * 100).toFixed(1) : 0;
                const maxPerc = (defender.maxHp > 0) ? (max / defender.maxHp * 100).toFixed(1) : 0;
                const atkLabel = isAllyAttacking ? "自分" : "相手";
                // 詳細表示: 攻撃側などの情報も少し入れたほうが分かりやすいかもしれないが、シンプルに
                rangeText.innerHTML = `<strong>${atkLabel}からの攻撃</strong><br>ダメージ: ${min} 〜 ${max} (${minPerc}% 〜 ${maxPerc}%)<br>使用技: ${moveName}`;
            }

            // 16段階乱数リスト更新
            const randomList = defenderContainer.querySelector('.random-list');
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
                                defender.currentHp = Math.max(0, turnStartHp - val);
                            }
                            
                            // 4. UI更新
                            updateFormFromState(defenderSide);
                            console.log(`Manual damage applied: ${val}. Target: ${defenderSide}, HP: ${turnStartHp} -> ${defender.currentHp}`);
                        });

                        randomList.appendChild(li);
                    });
                } else {
                    randomList.innerHTML = '<li>ダメージなし</li>';
                }
            }

            // 確定数（Kill Chance）の更新
            const killChanceText = defenderContainer.querySelector('.kill-chance');
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

            console.log(`Turn executed (${attackerSide} -> ${defenderSide}). Waiting for manual roll selection.`);

            updateFormFromState('ally');
            updateFormFromState('enemy');
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました: ' + e.message);
        }
    };

    // ボタンイベントリスナー設定
    const allyAtkBtn = document.getElementById('execute-ally-attack');
    if (allyAtkBtn) {
        allyAtkBtn.addEventListener('click', () => handleAttack('ally'));
    }

    const enemyAtkBtn = document.getElementById('execute-enemy-attack');
    if (enemyAtkBtn) {
        enemyAtkBtn.addEventListener('click', () => handleAttack('enemy'));
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
