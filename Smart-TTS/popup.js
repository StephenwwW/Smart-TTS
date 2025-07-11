/**
 * @file popup.js
 * @description 擴充功能彈出視窗的腳本，處理使用者介面、語音選擇和設定儲存。
 * @author Your Name
 * @version 1.0
 */

// 等待整個彈出視窗的 HTML 文件載入並解析完畢後再執行
document.addEventListener('DOMContentLoaded', () => {
    // 獲取所有需要操作的 HTML 元素
    const jpVoiceSelect = document.getElementById('japanese-voice-select');
    const enVoiceSelect = document.getElementById('english-voice-select');
    const jpRateSlider = document.getElementById('japanese-rate-slider');
    const enRateSlider = document.getElementById('english-rate-slider');
    const jpRateValue = document.getElementById('japanese-rate-value');
    const enRateValue = document.getElementById('english-rate-value');
    const saveButton = document.getElementById('save-button');
    const status = document.getElementById('status');

    /**
     * 填充日文和英文的聲音下拉選單
     */
    function populateVoiceLists() {
        // 從瀏覽器獲取所有可用的語音
        const voices = window.speechSynthesis.getVoices();
        
        // 先清空下拉選單，以防重複填充
        jpVoiceSelect.innerHTML = '';
        enVoiceSelect.innerHTML = '';

        // 遍歷所有可用語音
        voices.forEach(voice => {
            // 進行篩選，盡量只保留女聲
            const isFemale = voice.name.toLowerCase().includes('female') || voice.gender === 'female';
            const isExcluded = /male|ichiro|david/i.test(voice.name); // 根據名字排除已知的男聲

            // 如果聲音是女性或沒有被明確排除
            if (isFemale || !isExcluded) {
                 const option = document.createElement('option');
                 option.textContent = `${voice.name} (${voice.lang})`; // 顯示的文字，如 "Microsoft Ayumi (ja-JP)"
                 option.value = voice.voiceURI; // 選項的值，是聲音的唯一識別碼

                // 根據語言代碼，將選項加入對應的下拉選單
                if (voice.lang.startsWith('ja')) {
                    jpVoiceSelect.appendChild(option);
                } else if (voice.lang.startsWith('en')) {
                    // 使用 cloneNode(true) 複製一個選項，避免重複建立元素
                    enVoiceSelect.appendChild(option.cloneNode(true));
                }
            }
        });
        // 填充完列表後，載入使用者已儲存的設定
        loadSettings();
    }

    /**
     * 從 Chrome 儲存空間載入使用者設定，並更新到介面上
     */
    function loadSettings() {
        // 定義要讀取的四個設定鍵
        const keys = ['jpVoiceURI', 'enVoiceURI', 'jpRate', 'enRate'];
        chrome.storage.sync.get(keys, (result) => {
            // 如果儲存空間中有對應的值，就更新介面
            if (result.jpVoiceURI) jpVoiceSelect.value = result.jpVoiceURI;
            if (result.enVoiceURI) enVoiceSelect.value = result.enVoiceURI;
            if (result.jpRate) {
                jpRateSlider.value = result.jpRate;
                jpRateValue.textContent = `${result.jpRate}x`;
            }
            if (result.enRate) {
                enRateSlider.value = result.enRate;
                enRateValue.textContent = `${result.enRate}x`;
            }
        });
    }

    // 為「儲存」按鈕添加點擊事件監聽器
    saveButton.addEventListener('click', () => {
        // 收集目前介面上的所有設定值
        const settings = {
            jpVoiceURI: jpVoiceSelect.value,
            enVoiceURI: enVoiceSelect.value,
            jpRate: jpRateSlider.value,
            enRate: enRateSlider.value
        };
        // 將設定物件儲存到 Chrome 的同步儲存空間
        chrome.storage.sync.set(settings, () => {
            // 儲存成功後的回呼函數
            status.textContent = '設定已儲存！';
            // 2 秒後自動清除提示訊息
            setTimeout(() => { status.textContent = ''; }, 2000);
        });
    });

    // 為兩個語速拉桿添加 'input' 事件監聽器，即時更新顯示的語速值
    jpRateSlider.addEventListener('input', () => { jpRateValue.textContent = `${jpRateSlider.value}x`; });
    enRateSlider.addEventListener('input', () => { enRateValue.textContent = `${enRateSlider.value}x`; });

    // 初始化：
    // 監聽 `onvoiceschanged` 事件，因為語音列表是異步加載的，當列表更新時需要重新填充
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceLists;
    }
    // 立即執行一次，以處理語音列表已經加載完畢的情況
    populateVoiceLists();
});