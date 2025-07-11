/**
 * @file background.js
 * @description 擴充功能的背景腳本，主要負責建立右鍵選單並與 content script 溝通。
 * @author Your Name
 * @version 1.0
 */

// 擴充功能安裝或更新時觸發，用來建立右鍵選單
chrome.runtime.onInstalled.addListener(() => {
  // 建立一個右鍵選單項目
  chrome.contextMenus.create({
    id: "speak-selection",         // 選單項目的唯一 ID
    title: "朗讀選取的文字",         // 顯示在選單上的文字
    contexts: ["selection"]        // 只在使用者選取了文字時顯示
  });
});

// 監聽所有右鍵選單的點擊事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // 檢查被點擊的選單項目是否是我們建立的，並且確實有選取的文字
  if (info.menuItemId === "speak-selection" && info.selectionText) {
    // 將一個包含 "speak" 指令和選取文字的訊息，發送給當前分頁的 content script
    chrome.tabs.sendMessage(tab.id, {
      action: "speak",
      text: info.selectionText
    });
  }
});