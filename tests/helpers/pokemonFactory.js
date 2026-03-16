// テスト用ファクトリー関数

/**
 * テスト用ポケモンオブジェクトを生成
 */
export function createPokemon(overrides = {}) {
    const defaults = {
        name: 'テストポケモン',
        level: 50,
        item: '',
        ability: '',
        teraType: 'なし',
        stellarUsedTypes: new Set(),
        currentHp: 200,
        maxHp: 200,
        speciesData: {
            types: ['ノーマル'],
            weight_kg: 50,
            baseStats: {
                hp: 100, attack: 100, defence: 100,
                spAtk: 100, spDef: 100, speed: 100
            }
        },
        stats: {
            attack: { rank: 0 },
            defence: { rank: 0 },
            spAtk: { rank: 0 },
            spDef: { rank: 0 },
            speed: { rank: 0 }
        },
        realStats: {
            attack: 120, defence: 120,
            spAtk: 120, spDef: 120,
            speed: 120
        }
    };

    // Deep merge
    const result = { ...defaults, ...overrides };

    if (overrides.speciesData) {
        result.speciesData = { ...defaults.speciesData, ...overrides.speciesData };
    }
    if (overrides.stats) {
        result.stats = {
            attack: { rank: 0, ...defaults.stats.attack, ...overrides.stats.attack },
            defence: { rank: 0, ...defaults.stats.defence, ...overrides.stats.defence },
            spAtk: { rank: 0, ...defaults.stats.spAtk, ...overrides.stats.spAtk },
            spDef: { rank: 0, ...defaults.stats.spDef, ...overrides.stats.spDef },
            speed: { rank: 0, ...defaults.stats.speed, ...overrides.stats.speed }
        };
    }
    if (overrides.realStats) {
        result.realStats = { ...defaults.realStats, ...overrides.realStats };
    }

    return result;
}

/**
 * テスト用技オブジェクトを生成
 */
export function createMove(overrides = {}) {
    return {
        name: 'テスト技',
        type: 'ノーマル',
        category: 'Physical',
        power: 80,
        ...overrides
    };
}
