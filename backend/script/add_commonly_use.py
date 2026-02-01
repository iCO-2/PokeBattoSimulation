
import json
import os

# プロジェクトのルートディレクトリからのパス
# backend/script/add_commonly_use.py から見て frontend/data/pokemon_data_all.json を指す
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_FILE = os.path.join(BASE_DIR, 'frontend', 'data', 'pokemon_data_all.json')

def main():
    if not os.path.exists(DATA_FILE):
        print(f"Error: File not found at {DATA_FILE}")
        return

    print(f"Reading data from: {DATA_FILE}")
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            return

    updated_count = 0
    total_count = len(data)
    
    for pokemon in data:
        # commonly_use フィールドがなければ追加
        if 'commonly_use' not in pokemon:
            pokemon['commonly_use'] = []
            updated_count += 1
    
    if updated_count > 0:
        print(f"Updating {updated_count} entries out of {total_count}...")
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("Done.")
    else:
        print("All entries already have 'commonly_use' field. No changes made.")

if __name__ == '__main__':
    main()
