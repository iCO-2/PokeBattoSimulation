"""
pokemon_data_all.json の types.name を日本語表記から英語表記に変換するスクリプト

機能:
- pokemon_name_cache.json からタイプマッピングを読み込み
- 日本語→英語の逆マッピングを作成
- pokemon_data_all.json の全ポケモンの types.name を英語に変換

使用方法:
    python convert_types_to_english.py                    # 基本実行（上書き）
    python convert_types_to_english.py --backup            # バックアップを作成してから変換
    python convert_types_to_english.py --output output.json  # 別ファイルに出力
"""

import json
import os
import argparse
import shutil
from typing import Dict, List, Set
from collections import defaultdict

# スクリプトのディレクトリを取得
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# プロジェクトルート（backend/script の2階層上）
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))

# ファイルパス設定（プロジェクトルート基準）
POKEMON_DATA_FILE = os.path.join(PROJECT_ROOT, 'backend', 'data', 'pokemon_data_all.json')
# pokemon_name_cache.json はプロジェクトルートまたはbackend/dataに存在する可能性がある
CACHE_FILE_CANDIDATES = [
    os.path.join(PROJECT_ROOT, 'pokemon_name_cache.json'),
    os.path.join(PROJECT_ROOT, 'backend', 'data', 'pokemon_name_cache.json')
]
BACKUP_SUFFIX = '.backup'


def load_type_mapping() -> Dict[str, str]:
    """
    pokemon_name_cache.json からタイプマッピングを読み込み、
    日本語→英語の逆マッピングを作成
    
    Returns:
        日本語→英語のタイプマッピング辞書
    """
    cache_file = None
    for candidate in CACHE_FILE_CANDIDATES:
        if os.path.exists(candidate):
            cache_file = candidate
            break
    
    if cache_file is None:
        raise FileNotFoundError(
            f"pokemon_name_cache.json が見つかりません。以下の場所を確認しました:\n" +
            "\n".join(f"  - {c}" for c in CACHE_FILE_CANDIDATES)
        )
    
    with open(cache_file, 'r', encoding='utf-8') as f:
        cache_data = json.load(f)
    
    types_en_to_ja = cache_data.get('types', {})
    
    # 逆マッピングを作成（日本語→英語）
    type_ja_to_en = {}
    for en_name, ja_name in types_en_to_ja.items():
        type_ja_to_en[ja_name] = en_name.capitalize()  # 先頭大文字に変換（Fire, Water等）
    
    print(f"タイプマッピングを読み込みました: {len(type_ja_to_en)} 種類")
    return type_ja_to_en


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


def convert_types_to_english(pokemon_data: List[Dict], type_mapping: Dict[str, str]) -> Dict:
    """
    全ポケモンの types.name を日本語から英語に変換
    
    Args:
        pokemon_data: ポケモンデータのリスト
        type_mapping: 日本語→英語のタイプマッピング
    
    Returns:
        変換結果の統計情報
    """
    converted_count = 0
    failed_conversions = defaultdict(list)
    
    print("\n変換を開始します...\n")
    
    for pokemon in pokemon_data:
        pokedex_number = pokemon.get('pokedex_number', 0)
        pokedex_name = pokemon.get('pokedex_name', 'Unknown')
        form_name = pokemon.get('form_name', '通常')
        types = pokemon.get('types', [])
        
        pokemon_converted = False
        
        for type_info in types:
            type_name = type_info.get('name', '')
            
            # 既に英語表記の場合はスキップ
            if type_name in type_mapping.values():
                continue
            
            # 日本語→英語に変換
            if type_name in type_mapping:
                type_info['name'] = type_mapping[type_name]
                pokemon_converted = True
            else:
                # 変換できないタイプ名を記録
                pokemon_key = f"#{pokedex_number} {pokedex_name}"
                if form_name != '通常':
                    pokemon_key += f"（{form_name}）"
                failed_conversions[type_name].append(pokemon_key)
        
        if pokemon_converted:
            converted_count += 1
    
    return {
        'converted_pokemon_count': converted_count,
        'failed_conversions': dict(failed_conversions),
        'total_pokemon': len(pokemon_data)
    }


def save_pokemon_data(pokemon_data: List[Dict], output_file: str) -> None:
    """
    変換済みポケモンデータを保存
    
    Args:
        pokemon_data: ポケモンデータのリスト
        output_file: 出力ファイルパス
    """
    # ディレクトリが存在しない場合は作成
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(pokemon_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n変換済みデータを {output_file} に保存しました。")


def create_backup(source_file: str) -> str:
    """
    バックアップファイルを作成
    
    Args:
        source_file: 元のファイルパス
    
    Returns:
        バックアップファイルパス
    """
    backup_file = source_file + BACKUP_SUFFIX
    shutil.copy2(source_file, backup_file)
    print(f"バックアップを作成しました: {backup_file}")
    return backup_file


def generate_report(result: Dict) -> str:
    """
    変換結果のレポートを生成
    
    Args:
        result: 変換結果の統計情報
    
    Returns:
        レポート文字列
    """
    lines = []
    
    lines.append("=" * 80)
    lines.append("タイプ名変換レポート")
    lines.append("=" * 80)
    lines.append("")
    lines.append("【サマリー】")
    lines.append(f"  変換したポケモン/フォルム数: {result['converted_pokemon_count']:,} 件")
    lines.append(f"  総ポケモン/フォルム数: {result['total_pokemon']:,} 件")
    lines.append("")
    
    if result['failed_conversions']:
        lines.append("=" * 80)
        lines.append("【変換できなかったタイプ名】")
        lines.append("=" * 80)
        lines.append("")
        
        for type_name, pokemon_list in sorted(result['failed_conversions'].items()):
            lines.append(f"タイプ名: {type_name}")
            lines.append(f"  影響を受けるポケモン数: {len(pokemon_list)} 件")
            lines.append("  ポケモン一覧:")
            for pokemon_key in pokemon_list[:10]:  # 最大10件まで表示
                lines.append(f"    - {pokemon_key}")
            if len(pokemon_list) > 10:
                lines.append(f"    ... 他 {len(pokemon_list) - 10} 件")
            lines.append("")
    else:
        lines.append("✅ 全てのタイプ名が正常に変換されました！")
        lines.append("")
    
    return "\n".join(lines)


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(
        description='pokemon_data_all.json の types.name を日本語から英語に変換します'
    )
    parser.add_argument('--backup', action='store_true',
                        help='変換前にバックアップを作成')
    parser.add_argument('--output', type=str, default=None,
                        help='出力ファイル名（指定しない場合は元ファイルを上書き）')
    
    args = parser.parse_args()
    
    try:
        # タイプマッピングを読み込み
        type_mapping = load_type_mapping()
        
        # ポケモンデータを読み込み
        pokemon_data = load_pokemon_data()
        
        # バックアップ作成
        if args.backup and args.output is None:
            create_backup(POKEMON_DATA_FILE)
        
        # 変換実行
        result = convert_types_to_english(pokemon_data, type_mapping)
        
        # 出力ファイルの決定
        output_file = args.output if args.output else POKEMON_DATA_FILE
        
        # 保存
        save_pokemon_data(pokemon_data, output_file)
        
        # レポート生成・表示
        report = generate_report(result)
        print("\n" + report)
        
        # 終了コード
        exit_code = 0 if not result['failed_conversions'] else 1
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
