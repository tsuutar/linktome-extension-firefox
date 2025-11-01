# LinkToMe Firefox Extension

LinkToMe を firefox で使うためのアドオン

## 機能

- 現在のタブを LinkToMe に保存
- 保存済みリンクの一覧表示・検索
- リンクの削除
- 右クリックメニューからページ/リンクを保存

## ビルド方法

### 手動作成する場合

```powershell
# 必要なファイルをzipに圧縮
Compress-Archive -Path manifest.json,background.js,popup.html,popup.js,style.css,icons -DestinationPath linktome.zip

# 拡張子を.xpiに変更
Rename-Item linktome.zip linktome.xpi
```

## 開発・テスト

### 一時的なアドオンの読み込み

1. `about:debugging` ページを開く
2. 「この Firefox」から「一時的なアドオンを読み込む」を選択
3. `manifest.json` を選択して読み込みする
4. 拡張機能の画面より初期設定を行う (URL とトークンを設定)

## 初期設定

1. 拡張機能のポップアップを開く
2. LinkToMe の URL を入力（例: `http://localhost:3000/`）
3. アクセストークンを入力
4. 「保存」をクリック

## 使い方

- **現在のタブを保存**: ポップアップの「追加」ボタンをクリック
- **右クリックから保存**: ページや選択したリンクを右クリック → 「LinkToMe に保存」
- **リンクを開く**: 一覧のリンクをクリック
- **リンクを削除**: 一覧のゴミ箱アイコンをクリック
- **検索**: 検索バーでタイトルや URL を絞り込み
