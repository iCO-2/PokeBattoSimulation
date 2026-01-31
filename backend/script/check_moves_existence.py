"""
全ポケモンが覚える技が moves_data.json に存在するかを確認するスクリプト

機能:
- pokemon_data_all.json の全ポケモンの技をチェック
- moves_data.json に存在しない技を検出
- 詳細なレポートを出力

使用方法:
    python check_moves_existence.py                    # 基本実行
    python check_moves_existence.py --output report.txt  # レポートをファイルに出力
    python check_moves_existence.py --missing-only       # 存在しない技のみ表示
"""

import json
import os
import argparse
from collections import defaultdict
from typing import Dict, List, Set, Tuple

# スクリプトのディレクトリを取得
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# プロジェクトルート（backend/script の2階層上）
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))

# ファイルパス設定（プロジェクトルート基準）
POKEMON_DATA_FILE = os.path.join(PROJECT_ROOT, 'backend', 'data', 'pokemon_data_all.json')
MOVES_DATA_FILE = os.path.join(PROJECT_ROOT, 'backend', 'data', 'moves_data.json')


def load_moves_data() -> Set[str]:
    """
    moves_data.json を読み込んで、全ての技名のセットを返す
    
    Returns:
        技名のセット
    """
    if not os.path.exists(MOVES_DATA_FILE):
        raise FileNotFoundError(f"{MOVES_DATA_FILE} が見つかりません。")
    
    with open(MOVES_DATA_FILE, 'r', encoding='utf-8') as f:
        moves_data = json.load(f)
    
    # 辞書のキー（技名）をセットとして返す
    moves_set = set(moves_data.keys())
    print(f"moves_data.json を読み込みました: {len(moves_set)} 種類の技")
    return moves_set


def load_pokemon_data() -> List[Dict]:
    """
    pokemon_data_all.json を読み込む
    
    Returns:
        ポケモンデータのリスト
    """
    if not os.path.exists(POKEMON_DATA_FILE):
        raise FileNotFoundError(f"{POKEMON_DATA_FILE} が見つかりません。")
    
    with open(POKEMON_DATA_FILE, 'r', encoding='utf-8') as f:
        pokemon_data = json.load(f)
    
    print(f"pokemon_data_all.json を読み込みました: {len(pokemon_data)} 件のポケモン/フォルム")
    return pokemon_data


def check_moves_existence(pokemon_data: List[Dict], moves_set: Set[str]) -> Dict:
    """
    全ポケモンの技が moves_data.json に存在するかをチェック
    
    Args:
        pokemon_data: ポケモンデータのリスト
        moves_set: moves_data.json に存在する技名のセット
    
    Returns:
        チェック結果の辞書
    """
    # 存在しない技を記録: {技名: [ポケモン情報のリスト]}
    missing_moves: Dict[str, List[Dict]] = defaultdict(list)
    
    # 統計情報
    total_pokemon_checked = 0
    total_moves_checked = 0
    pokemon_with_missing_moves = set()
    
    print("\nチェックを開始します...\n")
    
    for pokemon in pokemon_data:
        pokedex_number = pokemon.get('pokedex_number', 0)
        pokedex_name = pokemon.get('pokedex_name', 'Unknown')
        form_name = pokemon.get('form_name', '通常')
        moves = pokemon.get('moves', [])
        
        total_pokemon_checked += 1
        total_moves_checked += len(moves)
        
        # 各技をチェック
        for move_name in moves:
            if move_name not in moves_set:
                # 存在しない技を記録
                pokemon_info = {
                    'pokedex_number': pokedex_number,
                    'pokedex_name': pokedex_name,
                    'form_name': form_name,
                    'base_species': pokemon.get('base_species', pokedex_name)
                }
                missing_moves[move_name].append(pokemon_info)
                pokemon_with_missing_moves.add((pokedex_number, pokedex_name, form_name))
    
    return {
        'missing_moves': dict(missing_moves),
        'total_pokemon_checked': total_pokemon_checked,
        'total_moves_checked': total_moves_checked,
        'pokemon_with_missing_moves_count': len(pokemon_with_missing_moves),
        'missing_moves_count': len(missing_moves)
    }


def format_pokemon_info(pokemon_info: Dict) -> str:
    """ポケモン情報を文字列にフォーマット"""
    form_suffix = f"（{pokemon_info['form_name']}）" if pokemon_info['form_name'] != '通常' else ''
    return f"  - 図鑑番号{pokemon_info['pokedex_number']}: {pokemon_info['pokedex_name']}{form_suffix}"


def generate_report(result: Dict, missing_only: bool = False) -> str:
    """
    レポートを生成
    
    Args:
        result: チェック結果の辞書
        missing_only: 存在しない技のみ表示するか
    
    Returns:
        レポート文字列
    """
    lines = []
    
    # サマリー
    lines.append("=" * 80)
    lines.append("技データ存在確認レポート")
    lines.append("=" * 80)
    lines.append("")
    lines.append("【サマリー】")
    lines.append(f"  チェックしたポケモン/フォルム数: {result['total_pokemon_checked']:,} 件")
    lines.append(f"  チェックした技の総数: {result['total_moves_checked']:,} 回")
    lines.append(f"  存在しない技の種類数: {result['missing_moves_count']} 種類")
    lines.append(f"  影響を受けるポケモン/フォルム数: {result['pokemon_with_missing_moves_count']} 件")
    lines.append("")
    
    if result['missing_moves_count'] == 0:
        lines.append("✅ 全ての技が moves_data.json に存在しています！")
        return "\n".join(lines)
    
    # 存在しない技の詳細
    lines.append("=" * 80)
    lines.append("【存在しない技の詳細】")
    lines.append("=" * 80)
    lines.append("")
    
    # 影響を受けるポケモン数でソート（多い順）
    sorted_missing = sorted(
        result['missing_moves'].items(),
        key=lambda x: len(x[1]),
        reverse=True
    )
    
    for move_name, pokemon_list in sorted_missing:
        lines.append(f"技名: {move_name}")
        lines.append(f"  影響を受けるポケモン数: {len(pokemon_list)} 件")
        lines.append("  覚えるポケモン一覧:")
        
        # 図鑑番号でソート
        sorted_pokemon = sorted(pokemon_list, key=lambda x: x['pokedex_number'])
        for pokemon_info in sorted_pokemon:
            lines.append(format_pokemon_info(pokemon_info))
        
        lines.append("")
    
    # 統計情報
    if not missing_only:
        lines.append("=" * 80)
        lines.append("【統計情報】")
        lines.append("=" * 80)
        lines.append("")
        
        # 最も多く存在しない技を覚えるポケモン（上位10件）
        if sorted_missing:
            lines.append("影響が大きい技（上位10件）:")
            for i, (move_name, pokemon_list) in enumerate(sorted_missing[:10], 1):
                lines.append(f"  {i}. {move_name}: {len(pokemon_list)} 件のポケモンが覚える")
            lines.append("")
    
    return "\n".join(lines)


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(
        description='全ポケモンの技が moves_data.json に存在するかを確認します'
    )
    parser.add_argument('--output', type=str, default=None,
                        help='レポートをファイルに出力（指定しない場合はコンソールに出力）')
    parser.add_argument('--missing-only', action='store_true',
                        help='存在しない技のみ表示（統計情報を省略）')
    
    args = parser.parse_args()
    
    try:
        # データ読み込み
        moves_set = load_moves_data()
        pokemon_data = load_pokemon_data()
        
        # チェック実行
        result = check_moves_existence(pokemon_data, moves_set)
        
        # レポート生成
        report = generate_report(result, missing_only=args.missing_only)
        
        # 出力
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"\nレポートを {args.output} に保存しました。")
        else:
            print("\n" + report)
        
        # 終了コード
        exit_code = 0 if result['missing_moves_count'] == 0 else 1
        return exit_code
        
    except FileNotFoundError as e:
        print(f"エラー: {str(e)}")
        return 1
    except Exception as e:
        print(f"予期しないエラーが発生しました: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
