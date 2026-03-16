import { describe, it, expect } from 'vitest';
import { calculateHp, calculateStat } from '../../frontend/js/calc/stats.js';

describe('calculateHp', () => {
    it('base=100, IV=31, statPoints=32, Lv=50 → 207', () => {
        // floor((100*2 + 31) * 50/100) + 50 + 10 + 32
        // = floor(231 * 0.5) + 50 + 10 + 32
        // = 115 + 50 + 10 + 32 = 207
        expect(calculateHp(100, 31, 32, 50)).toBe(207);
    });
});

describe('calculateStat', () => {
    it('性格上昇 (up): base=100, IV=31, statPoints=0, Lv=50', () => {
        // raw = floor((100*2 + 31) * 50/100) + 5 = 115 + 5 = 120
        // floor((120 + 0) * 1.1) = floor(132) = 132
        expect(calculateStat(100, 31, 0, 50, 'up')).toBe(132);
    });

    it('性格下降 (down): base=100, IV=31, statPoints=0, Lv=50', () => {
        // floor((120 + 0) * 0.9) = floor(108) = 108
        expect(calculateStat(100, 31, 0, 50, 'down')).toBe(108);
    });

    it('性格無補正 (neutral): base=100, IV=31, statPoints=0, Lv=50', () => {
        // floor((120 + 0) * 1.0) = 120
        expect(calculateStat(100, 31, 0, 50, 'neutral')).toBe(120);
    });
});
