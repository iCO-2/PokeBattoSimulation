import { describe, it, expect } from 'vitest';
import { getTypeEffectiveness } from '../../frontend/js/data/types.js';

describe('getTypeEffectiveness', () => {
    it('抜群: みず → ほのお = 2.0', () => {
        expect(getTypeEffectiveness('みず', ['ほのお'])).toBe(2.0);
    });

    it('今ひとつ: ほのお → みず = 0.5', () => {
        expect(getTypeEffectiveness('ほのお', ['みず'])).toBe(0.5);
    });

    it('無効: ノーマル → ゴースト = 0', () => {
        expect(getTypeEffectiveness('ノーマル', ['ゴースト'])).toBe(0);
    });

    it('4倍抜群: こおり → [くさ, ひこう] = 4.0', () => {
        expect(getTypeEffectiveness('こおり', ['くさ', 'ひこう'])).toBe(4.0);
    });

    it('1/4: ほのお → [みず, いわ] = 0.25', () => {
        expect(getTypeEffectiveness('ほのお', ['みず', 'いわ'])).toBe(0.25);
    });

    it('テラスタル防御: テラタイプのみで判定', () => {
        // テラスタル時はテラタイプ1つのみで計算する想定（呼び出し側が処理）
        const result = getTypeEffectiveness('みず', ['ほのお']);
        expect(result).toBe(2.0);
    });

    it('ステラ防御: 元タイプで判定', () => {
        // ステラ時は元タイプで計算する想定（呼び出し側が処理）
        const result = getTypeEffectiveness('みず', ['ほのお', 'ひこう']);
        expect(result).toBe(2.0);
    });
});
