import { AppState } from './AppState.js';
import { SPECIES_DEX } from './data/species.js';
import { MOVES_DEX } from './data/moves.js';
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

            // ターンIDを更新
            globalTurnCounter++;
            const currentTurnId = globalTurnCounter;

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
                
                // 攻撃者の名前を使用（未入力の場合は種族名やデフォルトラベルを表示）
                const atkName = attacker.name.trim() || (isAllyAttacking ? "自分" : "相手");
                
                rangeText.innerHTML = `<strong>${atkName}から受けた攻撃</strong><br>ダメージ: ${min} 〜 ${max} (${minPerc}% 〜 ${maxPerc}%)<br>使用技: ${moveName}`;
            }

            // 16段階乱数リスト更新
            const randomList = defenderContainer.querySelector('.random-list');
            if (randomList) {
                randomList.innerHTML = '';
                if (damageResult.rolls.length > 0) {
                    damageResult.rolls.forEach((val, i) => {
                        const li = document.createElement('li');
                        li.textContent = `${85 + i}%: ${val}`;
                        
                        // 初期選択状態
                        if (i === initialRollIndex) {
                            li.classList.add('selected');
                        }
                        
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
                            
                            // 4. 履歴に記録・更新
                            const rollLabel = `${85 + i}%`;
                            const atkName = attacker.name.trim() || (isAllyAttacking ? "自分" : "相手");
                            const defName = defender.name.trim() || (isAllyAttacking ? "相手" : "自分");

                            const historyEntry = {
                                type: 'attack',
                                turnId: currentTurnId,
                                moveName: moveName,
                                damage: val,
                                attackerName: atkName,
                                defenderName: defName,
                                attackerSide: attackerSide,
                                rollLabel: rollLabel,
                                hpBefore: turnStartHp,
                                hpAfter: defender.currentHp,
                                // スナップショット: パーティ全員のHPを保存
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

                            // 全体の対戦ログを更新 (同じターンの場合は最新の乱数選択で上書き)
                            updateBattleLog(historyEntry);

                            // 5. UI更新
                            updateFormFromState(defenderSide);
                            renderBattleLog();
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

            // 初回計算時にも履歴に追加（デフォルト選択分）
            const initialRollLabel = `${85 + initialRollIndex}%`;
            const atkName = attacker.name.trim() || (isAllyAttacking ? "自分" : "相手");
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
            if (confirm('対戦ログをすべて消去しますか？')) {
                appState.clearBattleHistory();
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
                    <span class="log-hp">（HP: ${entry.hpBefore} → ${entry.hpAfter} / 乱数: ${entry.rollLabel}）</span>
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

        // 履歴の更新
        renderHistory(teamType, pokemon);

        // スロットの状態（ひんし等）を同期
        updateSlotLabel(teamType);

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
                activeBtn.classList.remove('has-image', 'fainted');
                return;
            }

            // ひんし状態の判定
            if (pokemon.currentHp === 0) {
                activeBtn.classList.add('fainted');
            } else {
                activeBtn.classList.remove('fainted');
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
