# Tetris with AI Advisor

ブラウザでプレイできるテトリスに、AIがリアルタイムで最善手を提案する機能を組み込んだWebアプリケーション。

**プレイはこちら → https://hagiwaraseita.github.io/tetris-ai-advisor/**
（ゲーム本体はブラウザのみで動作します。AI提案機能を使う場合はバックエンドをローカルで起動してください）

## 特徴

- **上級者向けの実装** — 回転法則SRSの採用、ミノのゴースト、ホールド、ネクスト(5ミノ)、180度回転など
- **フロントエンド完結のゲームロジック** — 衝突判定・回転・ライン消去などはすべてブラウザ内(TypeScript)で計算され、サーバーとの通信なしにプレイ可能
- **AI提案機能** — ボタン1つで現在の盤面をサーバー側で全探索し、GPT-4oが推定最適手を日本語で説明

## アーキテクチャ

ゲーム本体とAI提案機能は、現在別々の仕組みで動いています。

```
[ゲーム本体・フロントエンドのみで完結]
Frontend (React + TypeScript)
    └── src/game/
        ├── pieces.ts            ミノ定義・SRS キックテーブル
        ├── gameState.ts         GameState 型定義・初期状態
        ├── gameController.ts    衝突判定・移動・回転・固定・ライン消去（純粋関数）
        └── placementSolver.ts   配置探索（未実装・移植予定）

[AI提案機能のみ、サーバーが必要]
Frontend ── HTTP POST /chat ──▶ Backend (FastAPI + Python)
                                    ├── model/       ゲーム状態のデータ構造・ミノ定義（参照用）
                                    ├── controller/   旧WebSocket用ゲームロジック（未使用・参照用）
                                    ├── solver/       全配置探索 + ヒューリスティック評価（/chat が使用）
                                    └── main.py       /chat エンドポイント（GPT-4o 呼び出し）
```

以前はゲームロジックをバックエンドが一元管理し、WebSocketで毎手同期する構成でしたが、
サーバー負荷・通信遅延の削減、および単純な静的ホスティング（GitHub Pages）での公開を目的に、
ゲームロジックをフロントエンド（TypeScript）へ移植しました。バックエンドは現在、AI提案機能
（`/chat`）専用として残っています。

## ディレクトリ構成

```
tetris-app/
├── backend/
│   ├── main.py                  FastAPI エントリーポイント（/chat エンドポイントのみ稼働）
│   ├── model/
│   │   ├── pieces.py            ミノ定義・SRS キックテーブル（参照用・/chat が間接的に使用）
│   │   └── game_state.py        GameState データクラス（未使用・参照用）
│   ├── controller/
│   │   └── game_controller.py   旧WebSocket用ゲームロジック（未使用・参照用）
│   ├── solver/
│   │   └── placement_solver.py  配置全探索 + ヒューリスティック評価（/chat が使用）
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── game/                  ゲームロジック（今回フロントエンドに移植）
    │   │   ├── pieces.ts
    │   │   ├── gameState.ts
    │   │   ├── gameController.ts
    │   │   └── placementSolver.ts （未実装・Python版からの移植予定）
    │   ├── hooks/useGame.ts       キー入力・DAS・ローカル状態管理（WebSocket廃止済み）
    │   └── components/
    │       ├── Board.tsx          盤面描画（ゴースト・AIハイライト）
    │       ├── Chat.tsx           AI提案パネル
    │       ├── HoldPiece.tsx
    │       └── NextPieces.tsx
    └── package.json
```

> `backend/model/`, `backend/controller/`は、`/ws`エンドポイント廃止に伴い現在未使用ですが、
> 参照用・将来の模倣学習実装の元ネタとして残しています。将来的に`backend/archive/`へ整理予定です。

## セットアップ

### 必要なもの

- Node.js 18 以上（ゲーム本体のみプレイする場合はこれだけで十分）
- Python 3.10 以上、OpenAI API キー（AI提案機能を使う場合のみ）

### フロントエンド（ゲーム本体）

```bash
cd tetris-app/frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173`（または表示されたポート）を開くとゲームが始まります。
**バックエンドを起動しなくてもプレイできます。**

### バックエンド（AI提案機能を使う場合のみ）

```bash
cd tetris-app/backend
pip install -r requirements.txt
```

`.env` ファイルを作成して API キーを設定します：

```
OPENAI_API_KEY=sk-...
```

```bash
uvicorn main:app --reload
```

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
| `R` | リスタート |

## AI提案機能

画面右の **「AIに聞く」** ボタンを押すと：

1. 現在の盤面・ミノ・ネクスト・ホールドをサーバーに送信
2. サーバー側でホールドを含む全配置パターンを探索
3. 各配置をヒューリスティック（高さ・穴・凹凸・ライン消去など）でスコアリング
4. 上位5候補を GPT-4o に渡し、最善手とその理由を日本語で返答
5. 推奨配置がピンク色で盤面にハイライト表示

現時点ではこの機能はローカルでバックエンドを起動している場合のみ動作します
（GitHub Pages は静的ファイルのみの配信のため、サーバー側の処理は実行できません）。

### ヒューリスティック重み

| 指標 | 重み |
|------|------|
| 全列高さの合計 | −0.510 |
| ライン消去（1/2/3/4ライン = 1/2/3/10点） | +0.761 |
| 穴の数 | −0.720 |
| 凹凸（隣接列の高さの差の合計） | −0.184 |

4ライン消去（テトリス）を高く評価しつつ、穴ペナルティを強化することで、無理な積み上げを抑制しています。

## デプロイ

`main`ブランチへの push をトリガーに、GitHub Actions が自動的にフロントエンドをビルドし
GitHub Pages へ公開します（`.github/workflows/deploy.yml`）。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React 18, TypeScript, Vite, lodash |
| バックエンド（AI提案機能のみ） | FastAPI, Python |
| AI | OpenAI GPT-4o |
| ホスティング | GitHub Pages（フロントエンド）, GitHub Actions（CI/CD） |

## 既知の制約・今後の予定

- スコアはライン消去数のみに基づく簡易計算（1ラインあたり100点）。T-spinボーナスやコンボは未実装
- 重力による自動落下・接地後のロック遅延タイマーは未実装
- `/chat`エンドポイントは今後、フロントエンドで計算した配置候補を受け取る形に書き換え予定（現在はサーバー側で全探索を再計算）
- 変数・プロパティ名は移植元のPython（snake_case）に揃えたままで、TypeScript標準のcamelCaseへの統一は未実施
- `backend/model/`, `backend/controller/`は`archive/`への整理が未実施
