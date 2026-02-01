/**
 * HP計算式: (種族値×2 + 個体値) × Lv/100 + Lv + 10 + 能力P
 * 能力P: 0-32, 1Pにつき実数値+1
 */
export function calculateHp(base, iv, statPoints, level) {
    return Math.floor((base * 2 + iv) * level / 100) + level + 10 + statPoints;
}

/**
 * その他ステータス計算式: ((種族値×2 + 個体値) × Lv/100 + 5) × 性格補正 + 能力P
 * 能力P: 0-32, 1Pにつき実数値+1
 */
export function calculateStat(base, iv, statPoints, level, natureBonus) {
    const raw = Math.floor((base * 2 + iv) * level / 100) + 5;
    
    let multiplier = 1.0;
    if (natureBonus === 'up') multiplier = 1.1;
    if (natureBonus === 'down') multiplier = 0.9;
    
    return Math.floor(raw * multiplier) + statPoints;
}
