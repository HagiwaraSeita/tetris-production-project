# Tetris with AI Advisor

ブラウザでプレイできるテトリスに、AIがリアルタイムで最善手を提案する機能を組み込んだWebアプリケーションです。

## 特徴

- **本格的なテトリス実装** — SRS（Super Rotation System）準拠の回転、ゴーストピース、ホールド、ネクスト5ピース表示
- **上級者向けの仕様** — SRSや180度回転などを採用
- **AI提案機能** — ボタン1つで現在の盤面をサーバー側で全探索し、GPT-4oが最善手を日本語で説明

## アーキテクチャ

```
Frontend (React + TypeScript)
    │  WebSocket（ゲーム操作・状態同期）
    │  HTTP POST /chat（AI提案リクエスト）
    ▼
Backend (FastAPI + Python)
    ├── model/          ゲーム状態のデータ構造・ミノ定義
    ├── controller/     純粋なゲームロジック（I/O なし）
    ├── solver/         全配置探索 + ヒューリスティック評価
    └── main.py         WebSocket サーバー・AI エンドポイント
```

ゲームロジックはバックエンドで一元管理し、フロントエンドはキー入力の送信と状態の描画のみを担当するMVC構造です。

## ディレクトリ構成

```
tetris-app/
├── backend/
│   ├── main.py                  FastAPI エントリーポイント
│   ├── model/
│   │   ├── pieces.py            ミノ定義・SRS キックテーブル
│   │   └── game_state.py        GameState データクラス
│   ├── controller/
│   │   └── game_controller.py   ゲーム操作ロジック
│   ├── solver/
│   │   └── placement_solver.py  配置全探索 + ヒューリスティック評価
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── hooks/useGame.ts      WebSocket 接続・キー入力・DAS
    │   └── components/
    │       ├── Board.tsx         盤面描画（ゴースト・AIハイライト）
    │       ├── Chat.tsx          AI提案パネル
    │       ├── HoldPiece.tsx
    │       └── NextPieces.tsx
    └── package.json
```

## セットアップ

### 必要なもの

- Python 3.10 以上
- Node.js 18 以上
- OpenAI API キー

### バックエンド

```bash
cd tetris-app/backend
pip install -r requirements.txt
```

`.env` ファイルを作成して API キーを設定します：

```
OPENAI_API_KEY=sk-...
```

### フロントエンド

```bash
cd tetris-app/frontend
npm install
```

## 起動方法

バックエンドとフロントエンドをそれぞれ別のターミナルで起動します。

```bash
# バックエンド
cd tetris-app/backend
uvicorn main:app --reload
```

```bash
# フロントエンド
cd tetris-app/frontend
npm run dev
```

ブラウザで `http://localhost:5173` を開くとゲームが始まります。

## 操作方法

| キー | 操作 |
|------|------|
| `A` | 左移動 |
| `D` | 右移動 |
| `W` | ソフトドロップ |
| `S` | ハードドロップ |
| `J` | 時計回り回転 |
| `L` | 反時計回り回転 |
| `I` | 180度回転 |
| `K` | ホールド |

## AI提案機能

画面右の **「AIに聞く」** ボタンを押すと：

1. 現在の盤面・ミノ・ネクスト・ホールドをサーバーに送信
2. サーバー側でホールドを含む全配置パターンを探索
3. 各配置をヒューリスティック（高さ・穴・凹凸・ライン消去など）でスコアリング
4. 上位5候補を GPT-4o に渡し、最善手とその理由を日本語で返答
5. 推奨配置がピンク色で盤面にハイライト表示

### ヒューリスティック重み

| 指標 | 重み |
|------|------|
| 全列高さの合計 | −0.510 |
| ライン消去（1/2/3/4ライン = 1/2/3/10点） | +0.761 |
| 穴の数 | −0.720 |
| 凹凸（隣接列の高さの差の合計） | −0.184 |

4ライン消去（テトリス）を高く評価しつつ、穴ペナルティを強化することで、無理な積み上げを抑制しています。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React 18, TypeScript, Vite |
| バックエンド | FastAPI, Python |
| リアルタイム通信 | WebSocket |
| AI | OpenAI GPT-4o |
