/**
 * HP計算式: (種族値×2 + 個体値 + 能力P * 2) × Lv/100 + Lv + 10
 */
export function calculateHp(base, iv, ev, level) {
    return Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

/**
 * その他ステータス計算式: ((種族値×2 + 個体値 + 能力P / 4) × Lv/100 + 5) × 性格補正
 */
export function calculateStat(base, iv, ev, level, natureBonus) {
    const raw = Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + 5;
    
    let multiplier = 1.0;
    if (natureBonus === 'up') multiplier = 1.1;
    if (natureBonus === 'down') multiplier = 0.9;
    
    return Math.floor(raw * multiplier);
}
