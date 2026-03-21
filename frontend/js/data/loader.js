export const SPECIES_DEX = {};
export const MOVES_DEX = {};
export let ITEMS_DEX = {};
export let USAGE_RATE_DATA = [];
export let ABILITIES_DEX = {};
export let MOVE_TYPE_MOVES = {};
export let KNOWN_DAMAGE_MOVES = {};
export let SPECIFIC_MOVES = {};
export let RECOIL_MOVES = {};

export async function loadAllData() {
    try {
        const [pokemonRes, movesRes, itemsRes, usageRateRes] = await Promise.all([
            fetch('./data/pokemon_data_all.json'),
            fetch('./data/moves_data.json'),
            fetch('./data/items_data.json'),
            fetch('./data/pokemon_sv_season_trend.json')
        ]);

        if (!pokemonRes.ok) throw new Error(`Failed to load pokemon data: ${pokemonRes.status}`);
        if (!movesRes.ok) throw new Error(`Failed to load moves data: ${movesRes.status}`);
        if (!itemsRes.ok) throw new Error(`Failed to load items data: ${itemsRes.status}`);
        if (!usageRateRes.ok) {
            console.warn(`Failed to load usage rate data: ${usageRateRes.status}. Using fallback.`);
        }

        const pokemonList = await pokemonRes.json();
        const movesData = await movesRes.json();
        const itemsData = await itemsRes.json();
        
        // Load usage rate data (optional, fallback to empty array if not available)
        if (usageRateRes.ok) {
            USAGE_RATE_DATA = await usageRateRes.json();
            console.log(`Loaded ${USAGE_RATE_DATA.length} usage rate entries.`);
        } else {
            USAGE_RATE_DATA = [];
        }

        // Parse Pokemon Data
        pokemonList.forEach(p => {
            // Transform types array to array of strings
            const typeList = p.types.sort((a, b) => a.slot - b.slot).map(t => t.name);
            
            // Map keys "special-attack" -> "spAtk", "special-defense" -> "spDef"
            const bs = p.base_stats;
            const stats = {
                hp: bs.hp,
                attack: bs.attack,
                defence: bs.defense,
                spAtk: bs['special-attack'],
                spDef: bs['special-defense'],
                speed: bs.speed
            };

            SPECIES_DEX[p.pokedex_name] = {
                baseStats: stats,
                types: typeList,
                abilities: p.abilities,
                moves: p.moves,
                commonly_use: p.commonly_use || [],
                sprite_url: p.sprite_url,
                weight_kg: p.weight_kg,
                height_m: p.height_m
            };

            // Map forms if needed, but current usage seems to rely on exact pokedex_name matching inputs
        });

const TYPE_TRANSLATION = {
    "Normal": "ノーマル",
    "Fire": "ほのお",
    "Water": "みず",
    "Grass": "くさ",
    "Electric": "でんき",
    "Ice": "こおり",
    "Fighting": "かくとう",
    "Poison": "どく",
    "Ground": "じめん",
    "Flying": "ひこう",
    "Psychic": "エスパー",
    "Bug": "むし",
    "Rock": "いわ",
    "Ghost": "ゴースト",
    "Dragon": "ドラゴン",
    "Dark": "あく",
    "Steel": "はがね",
    "Fairy": "フェアリー"
};

        // Parse Moves Data
        for (const [key, move] of Object.entries(movesData)) {
            if (move.type && TYPE_TRANSLATION[move.type]) {
                move.type = TYPE_TRANSLATION[move.type];
            }
            MOVES_DEX[key] = move;
        }

        // Parse Items Data
        ITEMS_DEX = itemsData || {};

        console.log("Data loaded successfully.");
        console.log(`Loaded ${Object.keys(SPECIES_DEX).length} species.`);
        console.log(`Loaded ${Object.keys(MOVES_DEX).length} moves.`);
        console.log(`Loaded ${Object.keys(ITEMS_DEX).length} items.`);

        // Parse Abilities Data (メインデータのロード完了後にフェッチ)
        try {
            const abilitiesRes = await fetch('./data/abilities.json');
            if (abilitiesRes.ok) {
                ABILITIES_DEX = await abilitiesRes.json();
                console.log(`Loaded ${Object.keys(ABILITIES_DEX).length} abilities.`);

                // 一意のtypeリストを取得し、対応するmoves_{type}.jsonをロード（dezaster, skinはJSONなし）
                // 技リストJSONが存在するtypeのみロード（技分類に紐づくもの）
                const typesWithoutMoveList = new Set([
                    'dezaster', 'skin', 'filter', 'fullhp_guard', 'hp_threshold_boost', 'hp_threshold_debuff',
                    'power_boost', 'reckless', 'rock_head', 'technician', 'tinted_lens',
                    'type_halve_attack', 'type_nullify', 'supreme_overlord', 'conditional',
                    'fluffy', 'fur_coat', 'ice_scales'
                ]);
                const types = [...new Set(Object.values(ABILITIES_DEX).map(a => a.type))].filter(t => !typesWithoutMoveList.has(t));
                const moveTypePromises = types.map(async (type) => {
                    try {
                        const res = await fetch(`./data/moves_info/moves_${type}.json`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.moves && Array.isArray(data.moves)) {
                                MOVE_TYPE_MOVES[type] = new Set(data.moves);
                            }
                        } else {
                            console.warn(`moves_${type}.json not found (status: ${res.status})`);
                        }
                    } catch (e) {
                        console.warn(`Failed to load moves_${type}.json:`, e);
                    }
                });
                await Promise.all(moveTypePromises);
                console.log(`Loaded move type data for: ${Object.keys(MOVE_TYPE_MOVES).join(', ')}`);

            } else {
                console.warn(`Failed to load abilities data: ${abilitiesRes.status}`);
            }
        } catch (e) {
            console.warn('Failed to load abilities data:', e);
        }

        // 固定ダメージ技データの読み込み
        try {
            const knownDmgRes = await fetch('./data/moves_info/moves_known_damage.json');
            if (knownDmgRes.ok) {
                const knownDmgData = await knownDmgRes.json();
                KNOWN_DAMAGE_MOVES = knownDmgData.moves || {};
                console.log(`Loaded ${Object.keys(KNOWN_DAMAGE_MOVES).length} known damage moves.`);
            } else {
                console.warn(`Failed to load moves_known_damage.json: ${knownDmgRes.status}`);
            }
        } catch (e) {
            console.warn('Failed to load moves_known_damage.json:', e);
        }

        // 特殊ダメージ計算技データの読み込み
        try {
            const specificRes = await fetch('./data/moves_info/moves_specific.json');
            if (specificRes.ok) {
                SPECIFIC_MOVES = await specificRes.json();
                console.log(`Loaded ${Object.keys(SPECIFIC_MOVES).length} specific moves.`);
            } else {
                console.warn(`Failed to load moves_specific.json: ${specificRes.status}`);
            }
        } catch (e) {
            console.warn('Failed to load moves_specific.json:', e);
        }

        // 反動技データの読み込み
        try {
            const recoilRes = await fetch('./data/moves_info/moves_recoil.json');
            if (recoilRes.ok) {
                RECOIL_MOVES = await recoilRes.json();
                console.log(`Loaded ${Object.keys(RECOIL_MOVES).length} recoil moves.`);
            } else {
                console.warn(`Failed to load moves_recoil.json: ${recoilRes.status}`);
            }
        } catch (e) {
            console.warn('Failed to load moves_recoil.json:', e);
        }

    } catch (error) {
        console.error("Error loading data:", error);
        alert("データの読み込みに失敗しました。詳細はコンソールを確認してください。");
    }
}
