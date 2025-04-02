/**
 * JSON5 支持模块 - 为Monaco编辑器添加JSON5支持
 */

// JSON5 语言 ID
const JSON5_LANGUAGE_ID = 'json5';

/**
 * 初始化 JSON5 语言支持
 */
function initializeJSON5Language() {
  if (!window.monaco) {
    console.warn('Monaco Editor 尚未加载完成');
    return;
  }
  
  // 如果已经注册过，则不再重复注册
  if (window.monaco.languages.getLanguages().some(lang => lang.id === JSON5_LANGUAGE_ID)) {
    return;
  }
  
  // 注册 JSON5 语言
  window.monaco.languages.register({ id: JSON5_LANGUAGE_ID });
  
  // 定义 JSON5 语法高亮规则
  window.monaco.languages.setMonarchTokensProvider(JSON5_LANGUAGE_ID, {
    defaultToken: 'invalid',
    tokenPostfix: '.json5',
    tokenizer: {
      root: [
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
        [/[{}()\[\]]/, '@brackets'],
        [/[,]/, 'delimiter'],
        [/:/, 'delimiter'],
        [/true|false/, 'keyword'],
        [/null|undefined/, 'keyword'],
        [/Infinity|NaN/, 'keyword'],
        [/-?(\d+)([eE][+-]?\d+)?/, 'number'],
        [/-?(\d*\.\d+)([eE][+-]?\d+)?/, 'number.float'],
        [/-?0[xX][\da-fA-F]+/, 'number.hex'],
        [/[+-]?[0-9]+[lL]?/, 'number'],
        [/[+-]\s+[0-9]+/, 'number'],
        [/[+-][.]/, 'number'],
        [/[a-zA-Z_$][\w$]*/, 'identifier'],
        [/[ \t\r\n]+/, 'white'],
      ],
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop']
      ],
      string_single: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop']
      ],
    }
  });
  
  // JSON5 语言配置
  window.monaco.languages.setLanguageConfiguration(JSON5_LANGUAGE_ID, {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: '\'', close: '\'', notIn: ['string'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '\'', close: '\'' },
    ],
  });
  
  // 注册格式化提供程序
  window.monaco.languages.registerDocumentFormattingEditProvider(JSON5_LANGUAGE_ID, {
    provideDocumentFormattingEdits: (model) => {
      const text = model.getValue();
      try {
        // 尝试解析并格式化
        const parsed = JSON.parse(text);
        const formatted = JSON.stringify(parsed, null, 2);
        return [{
          range: model.getFullModelRange(),
          text: formatted,
        }];
      } catch (error) {
        console.error('格式化JSON失败:', error);
        return [];
      }
    }
  });
  
  // 悬浮提示
  window.monaco.languages.registerHoverProvider(JSON5_LANGUAGE_ID, {
    provideHover: (model, position) => {
      return {
        range: new window.monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        contents: [
          { value: 'JSON5 支持注释、尾随逗号、单引号字符串、十六进制数等功能' }
        ]
      };
    }
  });
}

/**
 * 创建 JSON5 编辑器
 * @param {HTMLElement} container - 容器元素
 * @param {Object} options - 编辑器选项
 * @returns {Object} 编辑器实例和辅助方法
 */
function createJSON5Editor(container, options = {}) {
  if (!window.monaco) {
    console.warn('Monaco Editor 尚未加载完成');
    return null;
  }
  
  // 确保 JSON5 语言支持已初始化
  initializeJSON5Language();
  
  // 默认选项
  const editorOptions = {
    language: JSON5_LANGUAGE_ID,
    theme: 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on',
    scrollbar: {
      vertical: 'hidden',
      horizontal: 'hidden',
      alwaysConsumeMouseWheel: false
    },
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    renderLineHighlight: 'none',
    occurrencesHighlight: false,
    selectionHighlight: false,
    renderWhitespace: 'none',
    ...options
  };
  
  // 设置容器样式
  container.style.overflow = 'visible';
  container.style.height = 'auto';
  container.style.minHeight = '150px';
  
  // 创建编辑器
  const editor = window.monaco.editor.create(container, editorOptions);
  
  // 添加内容变化监听器，自动调整高度
  editor.onDidChangeModelContent(() => {
    updateEditorHeight(editor, container);
  });
  
  // 初始化时调整高度
  setTimeout(() => updateEditorHeight(editor, container), 100);
  
  // 返回编辑器实例和辅助方法
  return {
    editor,
    
    // 获取编辑器值
    getValue() {
      return editor.getValue();
    },
    
    // 设置编辑器值
    setValue(value) {
      editor.setValue(value);
    },
    
    // 格式化内容
    format() {
      try {
        const text = editor.getValue();
        const parsed = JSON.parse(text);
        const formatted = JSON.stringify(parsed, null, 2);
        editor.setValue(formatted);
      } catch (error) {
        console.error('格式化JSON失败:', error);
      }
    },
    
    // 检查内容是否有效
    isValid() {
      try {
        JSON.parse(editor.getValue());
        return true;
      } catch (error) {
        return false;
      }
    },
    
    // 调整编辑器大小
    layout() {
      editor.layout();
    },
    
    // 销毁编辑器
    dispose() {
      editor.dispose();
    }
  };
}

/**
 * 更新编辑器高度以适应内容
 * @param {Object} editor - Monaco 编辑器实例
 * @param {HTMLElement} container - 编辑器容器
 */
function updateEditorHeight(editor, container) {
  const lineHeight = editor.getOption(window.monaco.editor.EditorOption.lineHeight);
  const lineCount = editor.getModel().getLineCount();
  const contentHeight = lineHeight * lineCount;
  
  // 添加额外空间用于编辑器内边距
  const editorPadding = 20;
  const height = Math.max(150, contentHeight + editorPadding);
  
  // 设置编辑器高度
  editor.layout({ width: container.clientWidth, height: height });
  container.style.height = `${height}px`;
}

// 导出方法
export { initializeJSON5Language, createJSON5Editor };
