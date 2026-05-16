# BOSJ33 2026 予想ツール

## 概要
BOSJ33 2026のAブロック / Bブロック各10人によるリーグ戦と、上位選手による決勝トーナメントの予想を入力・保存・復元する静的Webアプリです。
各ブロックの総当たり結果を入力すると、勝点と順位を自動集計します。

## 機能
- **2ブロック対戦表**: Aブロック、Bブロックを各10人で表示
- **選手名編集**: 画面上の入力欄から選手名を変更可能
- **試合結果入力**: セルクリックで勝敗切り替え（○勝利、△引分、×敗北、空白未定）
- **勝点計算**: 勝利2点、引分1点、敗北0点で自動集計
- **順位表示**: ブロック全試合入力後に順位を表示
- **決勝トーナメント予想**: A1位 vs B2位、B1位 vs A2位の準決勝と決勝の勝者を切り替え
- **表示切替**: 全表示 / タブ表示
- **個人対戦一覧**: 表ヘッダーの選手名クリックで対戦一覧を表示
- **データ入出力**: 予想データと確定データをJSONでダウンロード / アップロード
- **ヘッダー画像**: BOSJ33向けのヘッダー背景画像を表示

## ローカル開発環境

### 必要な環境
- Node.js v14以上

### セットアップ
```bash
npm install
npm start
```

ブラウザで以下にアクセスします。

```text
http://localhost:8000
```

## データ形式
予想データと確定データは以下の形式で保存されます。

```json
{
  "format": "two-block-10-player-prediction",
  "version": "2.0",
  "lastUpdate": "2026-05-16T12:08:41.975Z",
  "players": {
    "block-a": [{ "id": "a1", "name": "田口隆祐" }],
    "block-b": [{ "id": "b1", "name": "エル・デスペラード" }]
  },
  "results": {
    "block-a-a1-a8": "win",
    "block-a-a8-a1": "lose"
  },
  "playoffResults": {
    "semifinal1": null,
    "semifinal2": null,
    "final": null
  },
  "finalResult": null,
  "confirmed": {
    "block-a-a1-a8": "win",
    "block-a-a8-a1": "lose"
  },
  "totalMatches": 1
}
```

`results` は予想データ、`confirmed` は確定データを表します。
`playoffResults` は準決勝・決勝の選択状態で、値は `player1`、`player2`、または `null` です。
`finalResult` は優勝予想選手のID、未選択の場合は `null` です。

確定データとして配布する場合は、ダウンロードされる `result.json` をアプリと同じディレクトリに配置します。
確定データは読み込み時に予想データより優先されます。

## ファイル構成
```text
.
├── index.html              # 画面本体
├── script.js               # 2ブロック制の生成・集計・入出力
├── style.css               # 画面スタイル
├── result.json             # 確定済み結果データ
├── server.js               # 開発用HTTPサーバー
├── package.json            # Node.js設定
└── assets/
    └── bosj33-header.png   # ヘッダー背景画像
```

## 注意
`file://` で直接開くと `result.json` の読み込みに失敗することがあります。
確定データを使う場合は `npm start` などのHTTPサーバー経由で開いてください。
