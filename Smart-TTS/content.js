/**
 * @file content.js
 * @description 內容腳本，注入到網頁中，負責接收朗讀命令、偵測語言、執行語音合成。
 * @author Your Name
 * @version 1.0
 */

// 監聽 'beforeunload' 事件，當使用者刷新或關閉頁面時觸發
// 這是為了防止頁面刷新後，上一次的朗讀還在繼續播放的問題
window.addEventListener('beforeunload', () => {
    // 取消目前所有正在排隊或正在播放的語音請求
    window.speechSynthesis.cancel();
});

// 監聽來自其他腳本（如此處的 background.js）的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 檢查收到的訊息是否是我們定義的 "speak" 動作
    if (request.action === "speak") {
        // 如果是，就呼叫 speak 函數來朗讀指定的文字
        speak(request.text);
        // 向發送方回覆一個訊息，表示已處理
        sendResponse({ status: "done" });
    }
    // `return true;` 讓訊息通道保持開啟，以支援非同步的 sendResponse
    return true;
});

/**
 * 根據文字內容，簡單地偵測其主要語言是日文還是英文
 * @param {string} text - 需要被偵測的文字
 * @returns {string} - 返回 'ja' 代表日文, 'en' 代表英文
 */
function detectLanguage(text) {
    // 這個正則表達式用來匹配日文中常見的字元範圍：
    // \u3040-\u30ff: 平假名與片假名
    // \u4e00-\u9faf: 常見的 CJK (中日韓) 漢字
    const japaneseRegex = /[\u3040-\u30ff\u4e00-\u9faf]/;
    // 如果文字中包含任何日文字元，就判定為日文
    if (japaneseRegex.test(text)) {
        return 'ja';
    }
    // 否則，預設為英文
    return 'en';
}

/**
 * 執行語音合成的主要函數
 * @param {string} text - 需要朗讀的文字
 */
async function speak(text) {
    // 步驟 1: 偵測語言
    const lang = detectLanguage(text);
    
    // 步驟 2: 根據偵測到的語言，決定要從儲存空間讀取哪一組設定的鍵 (key)
    const keysToGet = (lang === 'ja')
        ? ['jpVoiceURI', 'jpRate']  // 如果是日文，讀取日文的聲音和語速設定
        : ['enVoiceURI', 'enRate']; // 如果是英文，讀取英文的聲音和語速設定
    
    // 從 Chrome 的同步儲存空間非同步地獲取設定值
    const settings = await chrome.storage.sync.get(keysToGet);

    // 步驟 3: 確保瀏覽器的語音列表已成功載入
    let availableVoices = window.speechSynthesis.getVoices();
    // 如果第一次獲取時列表為空（常見的非同步問題）
    if (availableVoices.length === 0) {
        // 就建立一個 Promise 等待 `onvoiceschanged` 事件觸發
        await new Promise(resolve => {
            window.speechSynthesis.onvoiceschanged = () => {
                // 當事件觸發後，再次獲取語音列表，然後結束等待
                availableVoices = window.speechSynthesis.getVoices();
                resolve();
            };
        });
    }

    // 步驟 4: 準備並執行朗讀
    // 先取消上一次可能還在進行的朗讀，避免聲音重疊
    window.speechSynthesis.cancel();

    // 建立一個新的語音合成請求 (utterance)
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 根據語言設定對應的聲音 (voice) 和語速 (rate)
    if (lang === 'ja') {
        // 在所有可用聲音中，尋找 voiceURI 與我們儲存的日文設定匹配的聲音
        utterance.voice = availableVoices.find(v => v.voiceURI === settings.jpVoiceURI);
        utterance.rate = parseFloat(settings.jpRate || 1.0); // 使用儲存的語速，若無則預設為 1
    } else {
        // 在所有可用聲音中，尋找 voiceURI 與我們儲存的英文設定匹配的聲音
        utterance.voice = availableVoices.find(v => v.voiceURI === settings.enVoiceURI);
        utterance.rate = parseFloat(settings.enRate || 1.0); // 使用儲存的語速，若無則預設為 1
    }
    
    // 如果根據儲存的 voiceURI 沒找到對應的聲音（例如該聲音被移除了），瀏覽器會自動使用預設聲音
    window.speechSynthesis.speak(utterance);
}