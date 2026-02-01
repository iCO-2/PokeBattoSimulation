export const SPECIES_DEX = {};
export const MOVES_DEX = {};

export async function loadAllData() {
    try {
        const [pokemonRes, movesRes] = await Promise.all([
            fetch('./data/pokemon_data_all.json'),
            fetch('./data/moves_data.json')
        ]);

        if (!pokemonRes.ok) throw new Error(`Failed to load pokemon data: ${pokemonRes.status}`);
        if (!movesRes.ok) throw new Error(`Failed to load moves data: ${movesRes.status}`);

        const pokemonList = await pokemonRes.json();
        const movesData = await movesRes.json();

        // Parse Pokemon Data
        pokemonList.forEach(p => {
            // Transform types array to array of strings
            const typeList = p.types.sort((a, b) => a.slot - b.slot).map(t => t.name);
            
            // Map keys "special-attack" -> "spAtk", "special-defense" -> "spDef"
            const bs = p.base_stats;
            const stats = {
                hp: bs.hp,
                attack: bs.attack,
                defense: bs.defense,
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

        console.log("Data loaded successfully.");
        console.log(`Loaded ${Object.keys(SPECIES_DEX).length} species.`);
        console.log(`Loaded ${Object.keys(MOVES_DEX).length} moves.`);

    } catch (error) {
        console.error("Error loading data:", error);
        alert("データの読み込みに失敗しました。詳細はコンソールを確認してください。");
    }
}
