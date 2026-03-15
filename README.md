# PokeBattoSimulation

## 起動方法

このアプリケーションは静的なWebサイトとして動作します。

### 方法1: ライブリロード（推奨）

ファイル変更時に自動でブラウザがリロードされます。

```bash
npx live-server --port=8000 --open=/frontend/index.html --watch=frontend
```

ブラウザが自動で開きます: [http://localhost:8000/frontend/index.html](http://localhost:8000/frontend/index.html)

### 方法2: Python HTTPサーバー

```bash
python3 -m http.server 8000
```

ブラウザで以下のURLにアクセスしてください: [http://localhost:8000/frontend/index.html](http://localhost:8000/frontend/index.html)