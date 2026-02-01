"""
PokeAPIを使用して全ポケモン（フォルム違い含む）の基礎データを取得するスクリプト

機能:
- 通常フォルムとフォルム違いを含む全ポケモンを取得
- 技データも各フォルムごとに取得
- 途中保存と再開機能
- 技名・タイプ名・特性名のキャッシュによるAPI呼出し削減

使用方法:
    python fetch_all_pokemon.py                    # 全ポケモンを取得（再開可能）
    python fetch_all_pokemon.py --start-id 1 --max-id 151  # 図鑑番号1〜151のみ
    python fetch_all_pokemon.py --no-resume        # 新規開始（中間ファイル無視）
    python fetch_all_pokemon.py --test 6           # リザードン（図鑑番号6）のみテスト
"""

import requests
import json
import time
import os
import argparse
from typing import Dict, List, Optional, Tuple, Any

try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    print("警告: tqdmライブラリがインストールされていません。プログレスバーを表示できません。")
    print("インストールするには: pip install tqdm")

# ファイルパス設定
OUTPUT_FILE = 'backend/data/pokemon_data_all.json'
PROGRESS_FILE = 'pokemon_fetch_progress.json'
CACHE_FILE = 'pokemon_name_cache.json'

# API設定
BASE_URL = "https://pokeapi.co/api/v2"
API_DELAY = 0.05  # API呼び出し間の待機時間（秒）

# グローバルキャッシュ
name_cache: Dict[str, Dict[str, str]] = {
    "moves": {},
    "types": {},
    "abilities": {}
}


# =============================================================================
# フォルム名マッピング
# =============================================================================

FORM_NAME_MAP = {
    # メガ進化
    'mega': 'メガ',
    'mega-x': 'メガX',
    'mega-y': 'メガY',
    # キョダイマックス
    'gmax': 'キョダイマックス',
    # リージョンフォルム
    'alola': 'アローラのすがた',
    'alolan': 'アローラのすがた',
    'galar': 'ガラルのすがた',
    'galarian': 'ガラルのすがた',
    'hisui': 'ヒスイのすがた',
    'hisuian': 'ヒスイのすがた',
    'paldea': 'パルデアのすがた',
    'paldean': 'パルデアのすがた',
    'paldea-combat-breed': 'パルデアのすがた（コンバット種）',
    'paldea-blaze-breed': 'パルデアのすがた（ブレイズ種）',
    'paldea-aqua-breed': 'パルデアのすがた（ウォーター種）',
    # その他の特殊フォルム
    'origin': 'オリジンフォルム',
    'altered': 'アナザーフォルム',
    'land': 'けしんフォルム',
    'sky': 'れいじゅうフォルム',
    'therian': 'れいじゅうフォルム',
    'incarnate': 'けしんフォルム',
    'black': 'ブラックキュレム',
    'white': 'ホワイトキュレム',
    'primal': 'ゲンシ',
    'ash': 'サトシゲッコウガ',
    'battle-bond': 'きずなへんげ',
    '10': '10%フォルム',
    '10-power-construct': '10%フォルム',
    '50': '50%フォルム',
    '50-power-construct': '50%フォルム',
    'complete': 'パーフェクトフォルム',
    'solo': 'たんどくのすがた',
    'school': 'むれのすがた',
    'meteor': 'メテオフォルム',
    'core': 'コアフォルム',
    'midnight': 'まよなかのすがた',
    'midday': 'まひるのすがた',
    'dusk': 'たそがれのすがた',
    'original': 'オリジナル',
    'average': 'ふつうのすがた',
    'small': 'ちいさいサイズ',
    'large': 'おおきいサイズ',
    'super': 'スーパーサイズ',
    'crowned': 'けんのおう',
    'crowned-sword': 'けんのおう',
    'crowned-shield': 'たてのおう',
    'eternamax': 'ムゲンダイマックス',
    'ice': 'アイスライダー',
    'ice-rider': 'アイスライダー',
    'shadow': 'シャドーライダー',
    'shadow-rider': 'シャドーライダー',
    'rapid-strike': 'れんげきのかた',
    'single-strike': 'いちげきのかた',
    'hero': 'ヒーローフォルム',
    'hero-of-many-battles': 'れきせんのゆうしゃ',
    'bloodmoon': 'アカツキ',
    'wellspring': 'いどのめん',
    'hearthflame': 'かまどのめん',
    'cornerstone': 'いしずえのめん',
    'teal': 'みどりのめん',
    'teal-mask': 'みどりのめん',
    'combat': 'バトルフォルム',
    'blaze': 'ブレイズフォルム',
    'aqua': 'アクアフォルム',
    'stellar': 'ステラフォルム',
    'terastal': 'テラスタル',
    'family-of-three': '3びきフォルム',
    'family-of-four': '4ひきフォルム',
    'roaming': 'とほフォルム',
    'apex-build': 'アルティメットモード',
    'low-key': 'ローなすがた',
    'amped': 'ハイなすがた',
    'noice': 'ナイスなすがた',
    'hangry': 'まんぷくもよう',
    'gulping': 'うのみのすがた',
    'gorging': 'まるのみのすがた',
    'white-striped': 'しろすじのすがた',
    'blue-striped': 'あおすじのすがた',
    'red-striped': 'あかすじのすがた',
    'zen': 'ダルマモード',
    'standard': 'ノーマルモード',
    'pirouette': 'ステップフォルム',
    'aria': 'ボイスフォルム',
    'resolute': 'かくごのすがた',
    'ordinary': 'ふつうのすがた',
    'blade': 'ブレードフォルム',
    'shield': 'シールドフォルム',
    'confined': 'いましめられしフーパ',
    'unbound': 'ときはなたれしフーパ',
    'baile': 'めらめらスタイル',
    'pom-pom': 'ぱちぱちスタイル',
    'pau': 'ふらふらスタイル',
    'sensu': 'まいまいスタイル',
    'ultra': 'ウルトラネクロズマ',
    'dawn-wings': 'あかつきのつばさ',
    'dusk-mane': 'たそがれのたてがみ',
    'original-color': 'オリジナルカラー',
    'active': 'アクティブモード',
    'neutral': 'トランス',
    'attack': 'アタックフォルム',
    'defense': 'ディフェンスフォルム',
    'speed': 'スピードフォルム',
    'normal': 'ノーマルフォルム',
    'sandy': 'すなちのすがた',
    'trash': 'ゴミのミノ',
    'plant': 'くさきのミノ',
    'overcast': 'ポワルンのすがた',
    'rainy': 'あまみずのすがた',
    'snowy': 'ゆきぐものすがた',
    'sunny': 'たいようのすがた',
    'sunshine': 'たいようのすがた',
    'heat': 'ヒートロトム',
    'wash': 'ウォッシュロトム',
    'frost': 'フロストロトム',
    'fan': 'スピンロトム',
    'mow': 'カットロトム',
}


# =============================================================================
# ユーティリティ関数
# =============================================================================

def format_time(seconds: float) -> str:
    """秒数を読みやすい時間形式に変換する"""
    if seconds < 60:
        return f"{int(seconds)}秒"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}分{secs}秒"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours}時間{minutes}分{secs}秒"


def get_japanese_name(names_list: List[Dict]) -> Optional[str]:
    """APIのnamesリストから日本語名を探して返す"""
    for name_data in names_list:
        if name_data['language']['name'] == 'ja':
            return name_data['name']
    for name_data in names_list:
        if name_data['language']['name'] == 'ja-Hrkt':
            return name_data['name']
    return None


def get_form_display_name(internal_name: str, species_ja_name: str) -> Tuple[str, str]:
    """
    フォルムの内部名から表示用の日本語名を生成する
    
    Returns:
        (display_name, form_label) のタプル
    """
    # 内部名からフォルム部分を抽出
    base_name = internal_name.split('-')[0]
    form_parts = internal_name.replace(base_name + '-', '') if '-' in internal_name else ''
    
    if not form_parts or internal_name == base_name:
        return species_ja_name, "通常"
    
    form_label = form_parts
    
    if form_parts in FORM_NAME_MAP:
        suffix = FORM_NAME_MAP[form_parts]
        form_label = suffix
        
        # フォルム名に応じた表示名生成
        if any(x in suffix for x in ['のすがた', 'フォルム', 'ライダー', 'のかた', 'のめん', 
                                       'のゆうしゃ', 'モード', 'スタイル', 'ミノ', 'サイズ']):
            display_name = f"{species_ja_name}（{suffix}）"
        elif suffix == 'メガ':
            display_name = f"メガ{species_ja_name}"
        elif suffix == 'メガX':
            display_name = f"メガ{species_ja_name}X"
            form_label = "メガX"
        elif suffix == 'メガY':
            display_name = f"メガ{species_ja_name}Y"
            form_label = "メガY"
        elif suffix == 'ゲンシ':
            display_name = f"ゲンシ{species_ja_name}"
        elif suffix == 'キョダイマックス':
            display_name = f"{species_ja_name}（{suffix}）"
        elif suffix in ['ブラックキュレム', 'ホワイトキュレム', 'サトシゲッコウガ', 'ウルトラネクロズマ']:
            display_name = suffix
        else:
            display_name = f"{species_ja_name}（{suffix}）"
    else:
        display_name = f"{species_ja_name}（{form_parts}）"
    
    return display_name, form_label


# =============================================================================
# キャッシュ管理
# =============================================================================

def load_cache() -> None:
    """キャッシュファイルを読み込む"""
    global name_cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                name_cache["moves"] = loaded.get("moves", {})
                name_cache["types"] = loaded.get("types", {})
                name_cache["abilities"] = loaded.get("abilities", {})
            print(f"キャッシュを読み込みました: 技名 {len(name_cache['moves'])}件, "
                  f"タイプ {len(name_cache['types'])}件, 特性 {len(name_cache['abilities'])}件")
        except Exception as e:
            print(f"キャッシュ読み込みエラー: {str(e)}")


def save_cache() -> None:
    """キャッシュをファイルに保存する"""
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(name_cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"キャッシュ保存エラー: {str(e)}")


def get_cached_name(category: str, english_name: str, api_url: str) -> Optional[str]:
    """
    キャッシュから日本語名を取得、なければAPIから取得してキャッシュに追加
    
    Args:
        category: 'moves', 'types', 'abilities' のいずれか
        english_name: 英語名（キャッシュキー）
        api_url: APIのURL
    
    Returns:
        日本語名
    """
    # キャッシュにあれば返す
    if english_name in name_cache[category]:
        return name_cache[category][english_name]
    
    # APIから取得
    try:
        res = requests.get(api_url)
        res.raise_for_status()
        ja_name = get_japanese_name(res.json()['names'])
        
        # キャッシュに追加
        if ja_name:
            name_cache[category][english_name] = ja_name
        
        time.sleep(API_DELAY)
        return ja_name
    except Exception as e:
        print(f"    警告: {category} '{english_name}' の日本語名取得に失敗: {str(e)}")
        return None


# =============================================================================
# 進捗管理
# =============================================================================

def load_progress() -> Tuple[List[Dict], int]:
    """
    進捗ファイルを読み込む
    
    Returns:
        (取得済みデータリスト, 最後の図鑑番号) のタプル
    """
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            pokemon_data = data.get('pokemon_data', [])
            last_id = data.get('last_pokedex_number', 0)
            print(f"進捗を読み込みました: {len(pokemon_data)}件（最後の図鑑番号: {last_id}）")
            return pokemon_data, last_id
        except Exception as e:
            print(f"進捗読み込みエラー: {str(e)}")
    return [], 0


def save_progress(pokemon_data: List[Dict], last_id: int) -> None:
    """進捗をファイルに保存する"""
    try:
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                'pokemon_data': pokemon_data,
                'last_pokedex_number': last_id
            }, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"進捗保存エラー: {str(e)}")


def save_final_output(pokemon_data: List[Dict]) -> None:
    """最終出力ファイルに保存する"""
    # ディレクトリが存在しない場合は作成
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    # 図鑑番号とデフォルトフラグでソート
    sorted_data = sorted(pokemon_data, key=lambda x: (
        x.get('pokedex_number', 0),
        0 if x.get('is_default', True) else 1
    ))
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(sorted_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n最終出力: {OUTPUT_FILE} に保存しました（{len(sorted_data)}件）")


# =============================================================================
# API呼び出し
# =============================================================================

def fetch_pokemon_variety(pokemon_url: str, species_ja_name: str, 
                          is_default: bool, pokedex_number: int,
                          version_group: str = 'scarlet-violet') -> Optional[Dict]:
    """
    ポケモンの1つのバリエーション（フォルム）のデータを取得
    
    Args:
        pokemon_url: ポケモンAPIのURL
        species_ja_name: 種族の日本語名
        is_default: デフォルトフォルムかどうか
        pokedex_number: 図鑑番号
        version_group: バージョングループ（例: 'scarlet-violet', 'sword-shield'）
    
    Returns:
        フォルムデータの辞書
    """
    res = requests.get(pokemon_url)
    res.raise_for_status()
    p_data = res.json()
    time.sleep(API_DELAY)
    
    internal_name = p_data['name']
    display_name, form_label = get_form_display_name(internal_name, species_ja_name)
    
    # タイプ取得（キャッシュ利用）
    types_ja = []
    for type_info in p_data['types']:
        type_name = type_info['type']['name']
        type_ja = get_cached_name('types', type_name, type_info['type']['url'])
        if type_ja:
            types_ja.append({
                "name": type_ja,
                "slot": type_info['slot']
            })
    
    # 特性取得（キャッシュ利用）
    abilities_ja = []
    for ab in p_data['abilities']:
        ab_name = ab['ability']['name']
        ab_ja = get_cached_name('abilities', ab_name, ab['ability']['url'])
        if ab_ja:
            abilities_ja.append({
                "name": ab_ja,
                "is_hidden": ab['is_hidden']
            })
    
    # 種族値
    base_stats = {s['stat']['name']: s['base_stat'] for s in p_data['stats']}
    
    # 重さと高さ
    weight_kg = p_data.get('weight', 0) / 10
    height_m = p_data.get('height', 0) / 10
    
    # 技取得（バージョングループ指定、キャッシュ利用）
    moves_ja = []
    for m in p_data['moves']:
        # version_group_details をチェックして、指定されたバージョングループに存在する技のみを取得
        version_group_details = m.get('version_group_details', [])
        is_available_in_version = False
        
        for vg_detail in version_group_details:
            vg_name = vg_detail.get('version_group', {}).get('name', '')
            if vg_name == version_group:
                is_available_in_version = True
                break
        
        if is_available_in_version:
            move_name = m['move']['name']
            move_ja = get_cached_name('moves', move_name, m['move']['url'])
            if move_ja:
                moves_ja.append(move_ja)
    
    # 画像URL取得（アニメーションGIF優先）
    sprites = p_data.get('sprites', {})
    animated_sprite = None
    if sprites.get('versions'):
        bw_animated = sprites.get('versions', {}).get('generation-v', {}).get('black-white', {}).get('animated', {})
        animated_sprite = bw_animated.get('front_default')
    sprite_url = animated_sprite or sprites.get('front_default')
    
    return {
        "pokedex_name": display_name,
        "sprite_url": sprite_url,
        "pokedex_number": pokedex_number,
        "weight_kg": weight_kg,
        "height_m": height_m,
        "is_default": is_default,
        "form_name": form_label,
        "base_species": species_ja_name,
        "types": types_ja,
        "base_stats": base_stats,
        "abilities": abilities_ja,
        "moves": moves_ja,
        "commonly_use": []
    }


def fetch_species_all_forms(species_id: int, version_group: str = 'scarlet-violet') -> List[Dict]:
    """
    指定した図鑑番号のポケモンの全フォルムを取得
    
    Args:
        species_id: 図鑑番号
        version_group: バージョングループ（例: 'scarlet-violet', 'sword-shield'）
    
    Returns:
        全フォルムのデータリスト
    """
    # Species情報を取得
    species_url = f"{BASE_URL}/pokemon-species/{species_id}"
    species_res = requests.get(species_url)
    species_res.raise_for_status()
    species_data = species_res.json()
    time.sleep(API_DELAY)
    
    # 種族の日本語名を取得
    species_ja_name = get_japanese_name(species_data['names'])
    
    all_forms = []
    
    # 全てのVariety（フォルム）をループ
    for variety in species_data['varieties']:
        pokemon_url = variety['pokemon']['url']
        is_default = variety['is_default']
        
        try:
            form_data = fetch_pokemon_variety(
                pokemon_url, species_ja_name, is_default, species_data['id'], version_group
            )
            if form_data:
                all_forms.append(form_data)
        except Exception as e:
            print(f"    警告: フォルム {variety['pokemon']['name']} の取得に失敗: {str(e)}")
            continue
    
    return all_forms


# =============================================================================
# メイン処理
# =============================================================================

def fetch_all_pokemon(start_id: int = 1, max_id: Optional[int] = None,
                      resume: bool = True, save_interval: int = 10,
                      version_group: str = 'scarlet-violet') -> int:
    """
    全ポケモンのデータを取得してJSONファイルに保存
    
    Args:
        start_id: 開始図鑑番号（resume=Trueの場合は無視）
        max_id: 最大図鑑番号（Noneの場合は404まで）
        resume: 中断から再開するか
        save_interval: 何体ごとに中間保存するか
        version_group: バージョングループ（例: 'scarlet-violet', 'sword-shield'）
    
    Returns:
        取得したポケモン数
    """
    # キャッシュを読み込む
    load_cache()
    
    # 進捗を読み込む
    if resume:
        all_pokemon_data, last_id = load_progress()
        if last_id > 0:
            pokemon_id = last_id + 1
            print(f"図鑑番号 {pokemon_id} から再開します。")
        else:
            pokemon_id = start_id
            all_pokemon_data = []
    else:
        all_pokemon_data = []
        pokemon_id = start_id
    
    # 開始メッセージ
    if max_id:
        print(f"\nポケモンデータの取得を開始します（図鑑番号 {pokemon_id} から {max_id} まで）...")
    else:
        print(f"\nポケモンデータの取得を開始します（図鑑番号 {pokemon_id} から）...")
    print(f"バージョングループ: {version_group}")
    print(f"{save_interval}体ごとに中間保存します。\n")
    
    start_time = time.time()
    count_since_last_save = 0
    
    # プログレスバー
    pbar = None
    if TQDM_AVAILABLE and max_id:
        total = max_id - pokemon_id + 1
        pbar = tqdm(total=total, desc="取得中", unit="種")
    
    try:
        while True:
            # 最大ID チェック
            if max_id and pokemon_id > max_id:
                print(f"\n最大図鑑番号 {max_id} に到達しました。")
                break
            
            try:
                if pbar:
                    pbar.set_postfix_str(f"図鑑番号 {pokemon_id}")
                else:
                    print(f"図鑑番号 {pokemon_id} を取得中...", end=" ", flush=True)
                
                # 全フォルムを取得
                forms = fetch_species_all_forms(pokemon_id, version_group)
                
                if forms:
                    all_pokemon_data.extend(forms)
                    count_since_last_save += 1
                    
                    species_name = forms[0].get('base_species', 'Unknown')
                    if pbar:
                        pbar.set_postfix_str(f"{species_name} ({len(forms)}フォルム)")
                        pbar.update(1)
                    else:
                        print(f"✓ {species_name} ({len(forms)}フォルム)")
                
                # 中間保存
                if count_since_last_save >= save_interval:
                    save_progress(all_pokemon_data, pokemon_id)
                    save_cache()
                    if not pbar:
                        print(f"  → 中間保存完了（合計 {len(all_pokemon_data)}件）")
                    count_since_last_save = 0
                
                pokemon_id += 1
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    if pbar:
                        pbar.close()
                    print(f"\n図鑑番号 {pokemon_id} が見つかりませんでした。取得完了。")
                    break
                else:
                    print(f"\nHTTPエラー: {str(e)}")
                    pokemon_id += 1
                    continue
                    
            except Exception as e:
                print(f"\nエラー（図鑑番号 {pokemon_id}）: {str(e)}")
                # エラー時も中間保存
                save_progress(all_pokemon_data, pokemon_id - 1)
                save_cache()
                pokemon_id += 1
                continue
    
    except KeyboardInterrupt:
        if pbar:
            pbar.close()
        print(f"\n\n処理が中断されました。進捗を保存します...")
        save_progress(all_pokemon_data, pokemon_id - 1)
        save_cache()
        print(f"保存完了（{len(all_pokemon_data)}件）")
        return len(all_pokemon_data)
    
    # 最終保存
    if pbar:
        pbar.close()
    
    elapsed_time = time.time() - start_time
    print(f"\n=== 取得完了 ===")
    print(f"総処理時間: {format_time(elapsed_time)}")
    print(f"取得ポケモン数: {len(all_pokemon_data)}件")
    print(f"キャッシュ: 技名 {len(name_cache['moves'])}件, "
          f"タイプ {len(name_cache['types'])}件, 特性 {len(name_cache['abilities'])}件")
    
    # 最終出力ファイルに保存
    save_final_output(all_pokemon_data)
    
    # キャッシュも保存
    save_cache()
    
    return len(all_pokemon_data)


def test_single_pokemon(pokemon_id: int, version_group: str = 'scarlet-violet') -> None:
    """単一ポケモンのフォルム取得をテスト"""
    print(f"\n=== 図鑑番号 {pokemon_id} のテスト（バージョングループ: {version_group}）===\n")
    
    load_cache()
    
    try:
        forms = fetch_species_all_forms(pokemon_id, version_group)
        
        if forms:
            print(f"種族名: {forms[0].get('base_species')}")
            print(f"フォルム数: {len(forms)}")
            
            for form in forms:
                default_mark = "★" if form.get('is_default') else "  "
                print(f"\n{default_mark} 【{form['pokedex_name']}】")
                print(f"    フォルム: {form['form_name']}")
                print(f"    タイプ: {', '.join([t['name'] for t in form['types']])}")
                print(f"    種族値合計: {sum(form['base_stats'].values())}")
                print(f"    特性: {', '.join([a['name'] for a in form['abilities']])}")
                print(f"    技数: {len(form['moves'])}件")
                if form['moves']:
                    print(f"    技（一部）: {', '.join(form['moves'][:5])}...")
        else:
            print("データが取得できませんでした。")
            
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"図鑑番号 {pokemon_id} は存在しません。")
        else:
            print(f"エラー: {str(e)}")
    except Exception as e:
        print(f"エラー: {str(e)}")
    
    # テスト後もキャッシュを保存
    save_cache()


# =============================================================================
# エントリーポイント
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='PokeAPIから全ポケモン（フォルム違い含む）のデータを取得してJSONに保存します'
    )
    parser.add_argument('--start-id', type=int, default=1,
                        help='開始図鑑番号（デフォルト: 1）')
    parser.add_argument('--max-id', type=int, default=None,
                        help='最大図鑑番号（指定しない場合は404まで）')
    parser.add_argument('--no-resume', action='store_true',
                        help='中断から再開しない（新規開始）')
    parser.add_argument('--save-interval', type=int, default=10,
                        help='何体ごとに中間保存するか（デフォルト: 10）')
    parser.add_argument('--version-group', type=str, default='scarlet-violet',
                        help='バージョングループ（デフォルト: scarlet-violet）例: sword-shield, sun-moon')
    parser.add_argument('--test', type=int, default=None,
                        help='単一ポケモンのテスト（図鑑番号を指定）')
    
    args = parser.parse_args()
    
    if args.test:
        test_single_pokemon(args.test, args.version_group)
    else:
        fetch_all_pokemon(
            start_id=args.start_id,
            max_id=args.max_id,
            resume=not args.no_resume,
            save_interval=args.save_interval,
            version_group=args.version_group
        )
