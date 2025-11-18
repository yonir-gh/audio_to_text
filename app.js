// Web Speech API が使えるかチェック
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const saveDialogBackdrop = document.getElementById('saveDialogBackdrop');
const fileNameInput = document.getElementById('fileNameInput');
const saveDialogOk = document.getElementById('saveDialogOk');
const saveDialogCancel = document.getElementById('saveDialogCancel');

if (!SpeechRecognition) {
  alert('このブラウザでは Web Speech API（音声認識）が利用できません。\nChrome または Edge を使用してください。');
  statusEl.textContent = '状態: Web Speech API 非対応のブラウザです。';
} else {
  const recognition = new SpeechRecognition();

  // 設定
  recognition.lang = 'ja-JP';         // 日本語
  recognition.continuous = true;      // 連続認識
  recognition.interimResults = true;  // 暫定結果も取得

  let isRecognizing = false;
  let finalTranscript = '';

  recognition.onstart = () => {
    isRecognizing = true;
    statusEl.textContent = '状態: 認識中（話しかけてください）';
  };

  recognition.onerror = (event) => {
    console.error('SpeechRecognition error:', event);
    statusEl.textContent = '状態: エラーが発生しました: ' + event.error;
  };

  recognition.onend = () => {
    statusEl.textContent = '状態: 停止しました';
    // 「連続で聞き続けたい」場合は、自動再開
    if (isRecognizing) {
      statusEl.textContent = '状態: 再開中…';
      recognition.start();
    }
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    transcriptEl.value = finalTranscript + interimTranscript;
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  };

  startBtn.addEventListener('click', () => {
    if (isRecognizing) return;
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const timestampLine = `${yyyy}-${mm}-${dd} ${hh}:${mi} 開始`;

      if (finalTranscript) {
        finalTranscript += '\n';
      }
      finalTranscript += `${timestampLine}\n`;
      transcriptEl.value = finalTranscript;
      transcriptEl.scrollTop = transcriptEl.scrollHeight;

      recognition.start();
      statusEl.textContent = '状態: 起動中…（マイク許可ダイアログが出る場合があります）';
    } catch (e) {
      console.error(e);
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!isRecognizing) return;
    isRecognizing = false;
    recognition.stop();
    statusEl.textContent = '状態: 停止要求中…';
  });

  const saveTextToFile = async (rawName) => {
    let fileName = rawName.trim();
    if (!fileName) {
      statusEl.textContent = '状態: ファイル名が空のため保存をキャンセルしました';
      return;
    }

    if (!fileName.toLowerCase().endsWith('.txt')) {
      fileName += '.txt';
    }

    const text = transcriptEl.value || '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });

    // File System Access API が使える場合: 保存ダイアログで保存先を選択
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Text Files',
              accept: { 'text/plain': ['.txt'] },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        statusEl.textContent = `状態: テキストを「${handle.name}」として保存しました`;
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          statusEl.textContent = '状態: 保存をキャンセルしました';
          return;
        }
        console.error(err);
        statusEl.textContent = '状態: 保存中にエラーが発生しました（通常のダウンロードに切り替えます）';
      }
    }

    // それ以外のブラウザ: 従来通りダウンロード（保存先はブラウザ依存）
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    statusEl.textContent = `状態: テキストを「${fileName}」として保存しました`;
  };

  const openSaveDialog = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const defaultName = `${yyyy}${mm}${dd}_`;

    if (!saveDialogBackdrop || !fileNameInput) {
      return;
    }

    saveDialogBackdrop.classList.remove('hidden');
    fileNameInput.value = defaultName;

    setTimeout(() => {
      fileNameInput.focus();
      fileNameInput.setSelectionRange(defaultName.length, defaultName.length);
    }, 0);
  };

  saveBtn.addEventListener('click', () => {
    openSaveDialog();
  });

  if (saveDialogCancel) {
    saveDialogCancel.addEventListener('click', () => {
      saveDialogBackdrop.classList.add('hidden');
      statusEl.textContent = '状態: 保存をキャンセルしました';
    });
  }

  if (saveDialogOk) {
    saveDialogOk.addEventListener('click', async () => {
      const name = fileNameInput.value;
      saveDialogBackdrop.classList.add('hidden');
      await saveTextToFile(name);
    });
  }

  if (fileNameInput) {
    fileNameInput.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveDialogBackdrop.classList.add('hidden');
        await saveTextToFile(fileNameInput.value);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        saveDialogBackdrop.classList.add('hidden');
        statusEl.textContent = '状態: 保存をキャンセルしました';
      }
    });
  }

  clearBtn.addEventListener('click', () => {
    finalTranscript = '';
    transcriptEl.value = '';
    statusEl.textContent = '状態: テキストをクリアしました';
  });
}
