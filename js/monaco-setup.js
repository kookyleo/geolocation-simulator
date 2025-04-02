// Monaco Editor 加载状态
window.monacoReady = false;

// 创建编辑器
function createEditor(container, options) {
  if (!window.monaco) {
    console.warn('Monaco Editor 尚未加载完成');
    return null;
  }
  return window.monaco.editor.create(container, {
    language: 'json',
    theme: 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    ...options
  });
}

// 等待 Monaco 加载
function waitForMonaco() {
  return new Promise((resolve) => {
    if (window.monaco) {
      resolve(window.monaco);
    } else {
      const checkMonaco = setInterval(() => {
        if (window.monaco) {
          clearInterval(checkMonaco);
          resolve(window.monaco);
        }
      }, 100);
    }
  });
}

window.monacoHelpers = {
  createEditor,
  waitForMonaco
};

// 标记加载完成
window.require(['vs/editor/editor.main'], () => {
  window.monacoReady = true;
});
