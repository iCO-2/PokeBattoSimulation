import { AppState } from './AppState.js';
import { SPECIES_DEX } from './data/species.js';
import { MOVES_DEX } from './data/moves.js';
import { ITEMS_DEX } from './data/items.js';
import { calculateDamage } from './calc/damage.js';

const appState = new AppState();

// ターン管理用ID
let globalTurnCounter = 0;

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

    // datalistの生成
    const datalist = document.getElementById('pokemon-list');
    if (datalist) {
        Object.keys(SPECIES_DEX).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
    }

    // --- Move Configuration Logic ---
    function populateMoveDatalist() {
        const datalist = document.getElementById('move-list');
        if (!datalist) return;

        datalist.innerHTML = ''; // Clear existing
        Object.keys(MOVES_DEX).forEach(move => {
            const opt = document.createElement('option');
            opt.value = move;
            datalist.appendChild(opt);
        });
    }

    function setupMoveInputs(side) {
        const prefix = (side === 'ally') ? 'ally' : 'enemy';
        
        for (let i = 0; i < 4; i++) {
            const input = document.getElementById(`${prefix}-move-${i}`);
            if (!input) continue;

            // Set initial value
            const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
            if (pokemon && pokemon.moves[i]) {
                input.value = pokemon.moves[i];
            }

            // Event Listener
            input.addEventListener('change', (e) => {
                const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
                if (pokemon) {
                    pokemon.moves[i] = e.target.value;
                    renderMoveButtons(side);
                }
            });
            
            // Also update on 'input' for smoother feel? 
            // 'change' is sufficiently standard for datalist selection.
        }
    }

    function renderMoveButtons(side) {
        const prefix = (side === 'ally') ? 'ally' : 'enemy';
        const grid = document.getElementById(`${prefix}-move-grid`);
        const pokemon = (side === 'ally') ? appState.getAllyPokemon() : appState.getEnemyPokemon();
        
        if (!grid || !pokemon) return;

        grid.innerHTML = '';
        pokemon.moves.forEach((moveName, index) => {
            const btn = document.createElement('button');
            btn.className = 'move-btn';
            btn.dataset.index = index;
            
            if (index === pokemon.activeMoveIndex) {
                btn.classList.add('active');
            }

            if (moveName && MOVES_DEX[moveName]) {
                const moveData = MOVES_DEX[moveName];
                const powerText = (moveData.power > 0) ? `威力: ${moveData.power}` : (moveData.category === 'Status' ? '-' : '特殊');
                btn.innerHTML = `${moveName}<br><small>${powerText}</small>`;
            } else {
                btn.textContent = moveName || '(なし)';
                if (!moveName) btn.disabled = true;
            }

            grid.appendChild(btn);
        });
    }

    // Initialize Moves
    populateMoveDatalist();
    ['ally', 'enemy'].forEach(side => {
        setupMoveInputs(side);
        renderMoveButtons(side);
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
                    const allyIcon = document.getElementById('result-ally-icon');
                    if (allyIcon && allyPoke) {
                        const name = allyPoke.name.trim();
                        allyIcon.src = `../backend/image/${name}.gif`;
                        allyIcon.alt = name;
                        allyIcon.onerror = () => { allyIcon.src = ''; allyIcon.alt = name; };
                    }

                    // Enemy Icon
                    const enemyIcon = document.getElementById('result-enemy-icon');
                    if (enemyIcon && enemyPoke) {
                        const name = enemyPoke.name.trim();
                        enemyIcon.src = `../backend/image/${name}.gif`;
                        enemyIcon.alt = name;
                        enemyIcon.onerror = () => { enemyIcon.src = ''; enemyIcon.alt = name; };
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

    function renderBaseStats(side, poke) {
        const container = document.getElementById(`${side}-base-stats`);
        if (!container) return;

        if (!poke.speciesData || !poke.name.trim()) {
            container.innerHTML = '';
            return;
        }

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

        container.innerHTML = stats.map(s => `
            <div class="stat-item">
                <span class="label">${s.label}:</span>
                <span class="value">${s.val}</span>
            </div>
        `).join('') + `<div class="stat-item"><span class="label">計:</span><span class="value">${total}</span></div>`;
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

        // アイテム・特性 (今は空文字)
        // These lines are redundant if the above if/else block already handles it.
        // Assuming the intent is to ensure these are always updated, even if the inputs are not present.
        // However, the original code already updates them via allyItemSelect, enemyItemSelect etc.
        // I will interpret this as a general update for the current pokemon's item/ability,
        // but since the inputs are already handled, I'll skip adding redundant lines here.
        // If the HTML elements for item/ability are *not* the inputs, then this would be needed.
        // Given the context, the existing input updates are sufficient.

        // 種族値の表示
        renderBaseStats(teamType, pokemon);

        // 履歴の更新
        renderHistory(teamType, pokemon);

        // スロットの状態（ひんし等）を同期
        updateTeamSlots(teamType);

        // HP Bar
        const currentHpSpan = document.getElementById(`${teamType}-current-hp`);
        const maxHpSpan = document.getElementById(`${teamType}-max-hp`);
        const hpBar = document.getElementById(`${teamType}-hp-bar`);
        
        // Item Status & Button
        const itemStatus = document.getElementById(`${teamType}-item-status`);
        const itemBtn = container.querySelector('.item-trigger-btn');
        if (itemStatus && itemBtn) {
            if (pokemon.itemConsumed) {
                itemStatus.textContent = "（使用済み）";
                itemBtn.disabled = true;
            } else {
                itemStatus.textContent = "";
                const itemInfo = ITEMS_DEX[pokemon.item];
                itemBtn.disabled = !itemInfo;
                if (itemInfo) {
                    itemBtn.textContent = itemInfo.type === 'berry' ? 'きのみ発動' : '回復実行';
                } else {
                    itemBtn.textContent = '発動';
                }
            }
        }

        if (currentHpSpan && maxHpSpan && hpBar) {
            currentHpSpan.textContent = pokemon.currentHp;
            maxHpSpan.textContent = pokemon.maxHp;
            
            const ratio = (pokemon.maxHp > 0) ? (pokemon.currentHp / pokemon.maxHp) * 100 : 0;
            hpBar.style.width = `${Math.max(0, ratio)}%`;
            
            if (ratio >= 50) hpBar.style.backgroundColor = 'var(--primary-green)';
            else if (ratio >= 25) hpBar.style.backgroundColor = 'var(--accent-orange)';
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

        // Move Buttons & Selects Sync
        renderMoveButtons(teamType);
        
        // Update Selects values
        for (let i = 0; i < 4; i++) {
            const select = document.getElementById(`${teamType}-move-${i}`);
            if (select && pokemon.moves[i]) {
                select.value = pokemon.moves[i];
            } else if (select) {
                select.value = "";
            }
        }

        // Conditions
        container.querySelectorAll('.condition-check').forEach(check => {
            const condName = check.dataset.cond;
            if (condName && pokemon.conditions) {
                check.checked = !!pokemon.conditions[condName];
            }
        });
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

            const expectedSrc = `../backend/image/${name}.gif`;

            // Only update if src changed
            if (img.dataset.key !== name) {
                img.dataset.key = name;
                img.src = expectedSrc;
                img.alt = name;
                
                // Reset display states
                img.style.display = '';
                nameSpan.style.display = 'none';
                
                img.onerror = () => {
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
});

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
});
