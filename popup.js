let currentPage = 1;
let totalPages = 1;
let allLinks = []; // APIから取得した全リンクを保持
let filteredLinks = []; // 検索結果を保持
const ITEMS_PER_PAGE = 20;
let currentTabUrl = ""; // 現在のタブのURL

// 設定を取得するヘルパー関数
async function getSettings() {
  return await chrome.storage.local.get(["linktomeUrl", "token"]);
}

// 現在のタブのURLを取得
async function getCurrentTabUrl() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      return tabs[0].url || "";
    }
  } catch (error) {
    console.error("タブURL取得エラー:", error);
  }
  return "";
}

// リンクをソートする関数（現在のタブのURLと一致するものを最優先）
function sortLinksByCurrentTab(links) {
  if (!currentTabUrl) return links;

  return [...links].sort((a, b) => {
    const aMatches = a.url === currentTabUrl;
    const bMatches = b.url === currentTabUrl;

    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    return 0;
  });
}

// 設定を保存
document.getElementById("save").addEventListener("click", async () => {
  let linktomeUrl = document.getElementById("linktomeUrl").value;
  const token = document.getElementById("token").value;

  if (linktomeUrl && token) {
    // URLの末尾に/がなければ追加
    if (linktomeUrl && !linktomeUrl.endsWith("/")) {
      linktomeUrl += "/";
    }

    // 設定が正しいかどうか実際にAPIを叩いて確認
    try {
      const response = await fetch(`${linktomeUrl}api/urls?_=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        alert("APIの確認に失敗しました。URLとTokenを再確認してください");
        return;
      }

      // 保存
      await chrome.storage.local.set({ linktomeUrl, token });
      alert("設定を保存しました");

      // 設定が保存されたら設定画面を非表示にし、リンク一覧を表示
      document.querySelector(".authentication").classList.add("hidden");
      document.querySelector(".authenticated").classList.remove("hidden");

      // リンクを取得
      fetchLinks(currentPage);
    } catch (error) {
      console.error("API確認エラー:", error);
      alert("APIの確認に失敗しました。URLとTokenを再確認してください");
      return;
    }
  } else {
    alert("URLとTokenは必須です");
  }
});

// 設定変更ボタンで設定画面に戻る
// 設定画面を表示し、リンク一覧画面を隠す
// 入力欄には保存済みの値をセット
document.getElementById("settingsBtn").addEventListener("click", async () => {
  // 設定画面表示
  document.querySelector(".authentication").classList.remove("hidden");
  document.querySelector(".authenticated").classList.add("hidden");
  // 保存済み値をセット
  const { linktomeUrl, token } = await chrome.storage.local.get([
    "linktomeUrl",
    "token",
  ]);
  document.getElementById("linktomeUrl").value = linktomeUrl || "";
  document.getElementById("token").value = token || "";
});

// 初期ロード時にリンクを取得
document.addEventListener("DOMContentLoaded", async () => {
  const { linktomeUrl, token } = await chrome.storage.local.get([
    "linktomeUrl",
    "token",
  ]);
  if (linktomeUrl && token) {
    // 設定が保存されている場合はリンク一覧画面を表示
    document.querySelector(".authentication").classList.add("hidden");
    document.querySelector(".authenticated").classList.remove("hidden");
    fetchLinks(currentPage);
  }
});

// リンクを取得する関数
// ページ番号を引数にとり、デフォルトは1
async function fetchLinks(page = 1) {
  // 現在のタブのURLを取得
  currentTabUrl = await getCurrentTabUrl();

  // 設定の取得
  const { linktomeUrl } = await chrome.storage.local.get("linktomeUrl");
  if (!linktomeUrl) {
    alert("URLが未設定です");
    return;
  }

  const { token } = await chrome.storage.local.get("token");
  if (!token) {
    alert("トークンが未設定です");
    return;
  }

  try {
    const response = await fetch(`${linktomeUrl}api/urls?_=${Date.now()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`APIエラー: ${response.status}`);
    }

    const data = await response.json();
    allLinks = data;

    // 検索条件を取得してフィルタリング
    const { searchInputValue } = await chrome.storage.local.get([
      "searchInputValue",
    ]);
    const searchQuery = (searchInputValue || "").toLowerCase();

    if (searchQuery) {
      filteredLinks = allLinks.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery) ||
          item.url.toLowerCase().includes(searchQuery)
      );
    } else {
      filteredLinks = allLinks;
    }

    // 現在のタブと一致するブックマークを最優先でソート
    filteredLinks = sortLinksByCurrentTab(filteredLinks);

    // フィルタ後のリンク数でページ数を計算
    totalPages = Math.ceil(filteredLinks.length / ITEMS_PER_PAGE);

    // 保存されているページ番号を取得し、範囲チェック
    const { paginationPage } = await chrome.storage.local.get([
      "paginationPage",
    ]);
    if (paginationPage && paginationPage <= totalPages) {
      currentPage = paginationPage;
    } else {
      currentPage = 1;
    }

    updatePagination();
    displayLinks();
  } catch (error) {
    console.error("取得エラー:", error);
    alert("リンク取得に失敗しました");
  }
}

// リストを画面に表示
function displayLinks() {
  const list = document.getElementById("linkList");
  list.innerHTML = "";

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredLinks.length);

  for (let i = startIndex; i < endIndex; i++) {
    const item = filteredLinks[i];
    const li = document.createElement("li");
    li.style.cursor = "pointer";

    // 現在のタブと一致する場合は特別なスタイルを適用
    const isCurrentTab = item.url === currentTabUrl;
    if (isCurrentTab) {
      li.classList.add("current-tab");
    }

    li.addEventListener("click", () => {
      chrome.tabs.create({ url: item.url });
    });

    // タイトル行
    const titleRow = document.createElement("div");
    titleRow.className = "link-title-row";

    // タイトル
    const titleSpan = document.createElement("span");
    titleSpan.className = "link-title";
    titleSpan.textContent = item.title || item.url;
    titleSpan.title = item.title || item.url;
    titleRow.appendChild(titleSpan);

    // 削除アイコン
    const del = document.createElement("span");
    del.className = "delete-icon";
    del.innerHTML = "&#128465;"; // ゴミ箱アイコン
    del.title = "削除";
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm("本当に削除しますか？")) {
        const { linktomeUrl, token } = await getSettings();
        try {
          const res = await fetch(
            `${linktomeUrl}api/delete?id=${encodeURIComponent(item.id)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`削除失敗 (${res.status}): ${errorText}`);
          }
          fetchLinks(currentPage);
        } catch (err) {
          console.error("削除エラー:", err);
          alert(`削除に失敗しました: ${err.message}`);
        }
      }
    });
    titleRow.appendChild(del);
    li.appendChild(titleRow);

    // URL行
    const urlSpan = document.createElement("span");
    urlSpan.className = "link-url";
    urlSpan.textContent = item.url;
    urlSpan.title = item.url;
    li.appendChild(urlSpan);

    list.appendChild(li);
  }
}

// リストを更新
document.getElementById("refreshBtn").addEventListener("click", () => {
  fetchLinks(currentPage);
});

// ページネーションを更新
function updatePagination() {
  const paginationSelector = document.getElementById("pagination-select");
  paginationSelector.innerHTML = "";

  // ページが1つもない場合のデフォルト
  if (totalPages === 0) {
    totalPages = 1;
  }

  for (let i = 1; i <= totalPages; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `ページ ${i}`;
    paginationSelector.appendChild(option);
  }

  paginationSelector.value = currentPage;
}

// 検索機能を追加
const searchInputElem = document.getElementById("searchInput");
searchInputElem.addEventListener("input", (event) => {
  const searchQuery = event.target.value.toLowerCase();
  chrome.storage.local.set({ searchInputValue: event.target.value });
  // タイトルまたはURLに検索クエリが含まれているかをチェック
  filteredLinks = allLinks.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery) ||
      item.url.toLowerCase().includes(searchQuery)
  );
  // 現在のタブと一致するブックマークを最優先でソート
  filteredLinks = sortLinksByCurrentTab(filteredLinks);
  // フィルタ後のリンク数でページ数を再計算
  totalPages = Math.ceil(filteredLinks.length / ITEMS_PER_PAGE);
  // 検索後に1ページ目に戻る
  currentPage = 1;
  chrome.storage.local.set({ paginationPage: currentPage });
  updatePagination();
  displayLinks();
});

// ページ変更時の処理
const paginationSelectElem = document.getElementById("pagination-select");
paginationSelectElem.addEventListener("change", (event) => {
  currentPage = Number(event.target.value);
  chrome.storage.local.set({ paginationPage: currentPage });
  displayLinks();
});

// 検索バーの内容・ページ番号を保存・復元
// 検索バー復元（初期化時に実行）
chrome.storage.local.get(["searchInputValue"], (result) => {
  if (result.searchInputValue !== undefined) {
    document.getElementById("searchInput").value = result.searchInputValue;
  }
});

// 前のページボタン
document.querySelector(".pagination-previous").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    chrome.storage.local.set({ paginationPage: currentPage });
    // セレクトボックスも更新
    document.getElementById("pagination-select").value = currentPage;
    displayLinks();
  }
});

// 次のページボタン
document.querySelector(".pagination-next").addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    chrome.storage.local.set({ paginationPage: currentPage });
    // セレクトボックスも更新
    document.getElementById("pagination-select").value = currentPage;
    displayLinks();
  }
});

// 「追加」ボタンで現在のタブを保存
document
  .getElementById("addCurrentTabBtn")
  .addEventListener("click", async () => {
    // 現在のタブを取得
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || tabs.length === 0) {
        alert("タブ情報が取得できませんでした");
        return;
      }
      const tab = tabs[0];
      const title = tab.title || tab.url;
      const url = tab.url;
      if (!url) {
        alert("URLが取得できませんでした");
        return;
      }
      // 設定取得
      const { linktomeUrl, token } = await getSettings();
      if (!linktomeUrl || !token) {
        alert("URLまたはTokenが未設定です");
        return;
      }
      try {
        const res = await fetch(`${linktomeUrl}api/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, url }),
        });
        const text = await res.text();
        console.log("status:", res.status, "body:", text);
        if (!res.ok) {
          alert(`保存失敗: status=${res.status}\n${text}`);
          return;
        }
        alert("現在のタブを保存しました");
        fetchLinks(currentPage); // 保存後にリスト更新
      } catch (err) {
        console.error("保存エラー:", err);
        alert(`保存に失敗しました: ${err.message}`);
        fetchLinks(currentPage); // リスト更新
      }
    });
  });
