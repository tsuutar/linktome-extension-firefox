// Service Worker用のインポート（必要に応じて）
// importScripts() は使用していません

// コンテキストメニューの作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveLinkToMe",
    title: "LinkToMeに保存",
    contexts: ["page", "link"],
  });
});

// コンテキストメニューのクリックイベント
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveLinkToMe") {
    const url = info.linkUrl || info.pageUrl;
    const title = tab.title || url;

    // 設定を取得
    const { linktomeUrl, token } = await chrome.storage.local.get([
      "linktomeUrl",
      "token",
    ]);

    if (!linktomeUrl || !token) {
      console.error("URLまたはTokenが未設定です");
      return;
    }

    try {
      const response = await fetch(`${linktomeUrl}api/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, url }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`保存失敗: ${response.status} - ${errorText}`);
      } else {
        console.log("LinkToMeに保存しました:", url);
      }
    } catch (error) {
      console.error("保存エラー:", error);
    }
  }
});

// Service Workerの起動確認（デバッグ用）
console.log("LinkToMe Service Worker が起動しました");
