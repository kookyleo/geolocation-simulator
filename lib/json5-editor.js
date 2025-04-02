// 使用全局变量monaco而不是导入，因为monaco已经通过script标签加载
// 原来的导入语句: import * as monaco from 'monaco-editor';
// 我们将使用JSON而不JSON5，因为JSON5需要额外导入
// 原来的导入语句: import JSON5 from 'json5';

/**
 * JSON5Editor - 支持 JSON5 的 Monaco Editor 封装类
 */
class JSON5Editor {
  /**
   * 创建新的 JSON5Editor 实例
   * @param {HTMLElement|string} container - 容器元素或其ID
   * @param {Object} options - 编辑器配置选项
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    
    if (!this.container) {
      throw new Error('找不到编辑器容器元素');
    }
    
    // 默认选项
    this.options = {
      theme: 'vs',
      fontSize: 14,
      tabSize: 2,
      automaticLayout: true,
      wordWrap: 'on',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      ...options
    };
    
    // JSON5 语言 ID
    this.JSON5_LANGUAGE_ID = 'json5';
    
    // 初始化编辑器
    this._initializeLanguage();
    this._createEditor();
    
    // 绑定事件处理函数到实例
    this.format = this.format.bind(this);
    this.setValue = this.setValue.bind(this);
    this.getValue = this.getValue.bind(this);
  }
  
  /**
   * 初始化 JSON5 语言支持
   * @private
   */
  _initializeLanguage() {
    if (!monaco.languages.getLanguages().some(lang => lang.id === this.JSON5_LANGUAGE_ID)) {
      // 注册 JSON5 语言
      monaco.languages.register({ id: this.JSON5_LANGUAGE_ID });
      
      // 定义 JSON5 语法高亮规则
      monaco.languages.setMonarchTokensProvider(this.JSON5_LANGUAGE_ID, {
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
      monaco.languages.setLanguageConfiguration(this.JSON5_LANGUAGE_ID, {
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
      monaco.languages.registerDocumentFormattingEditProvider(this.JSON5_LANGUAGE_ID, {
        provideDocumentFormattingEdits: (model) => {
          const text = model.getValue();
          const formatted = this.formatJSON5WithComments(text);
          return [{
            range: model.getFullModelRange(),
            text: formatted,
          }];
        }
      });
      
      // 悬浮提示
      monaco.languages.registerHoverProvider(this.JSON5_LANGUAGE_ID, {
        provideHover: (model, position) => {
          return {
            range: new monaco.Range(
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
  }
  
  /**
   * 创建编辑器实例
   * @private
   */
  _createEditor() {
    // 默认示例内容
    const defaultContent = `{
  // 这是一个 JSON5 文件示例
  title: 'JSON5 示例',
  
  /* 
   * JSON5 支持多行注释
   */
  description: '比 JSON 更友好的数据交换格式',
  
  // 数字支持十六进制、无限和 NaN
  positiveInfinity: Infinity,
  negativeInfinity: -Infinity,
  notANumber: NaN,
  hexadecimal: 0xdecaf,
  
  // 对象支持尾随逗号
  features: {
    comments: true,
    unquotedKeys: true,
    trailingCommas: true,
    singleQuotes: true,
  },
  
  // 数组也支持尾随逗号
  compatibility: [
    'JSON',
    'ECMAScript 5',
  ],
}`;

    // 创建编辑器
    this.editor = monaco.editor.create(this.container, {
      value: this.options.value || defaultContent,
      language: this.JSON5_LANGUAGE_ID,
      ...this.options
    });
    
    // 添加内容变更监听器
    this.editor.onDidChangeModelContent(() => {
      this._validateContent();
      
      // 触发变更事件
      if (typeof this.onContentChange === 'function') {
        this.onContentChange(this.getValue());
      }
    });
    
    // 初始校验
    this._validateContent();
  }
  
  /**
   * 验证编辑器内容
   * @private
   */
  _validateContent() {
    const model = this.editor.getModel();
    const content = model.getValue();
    const markers = [];
    
    try {
      JSON5.parse(content);
    } catch (e) {
      const message = e.message;
      const match = /at position (\d+)/.exec(message);
      if (match) {
        const position = parseInt(match[1], 10);
        const textUntilPosition = content.substring(0, position);
        const lastNewLine = textUntilPosition.lastIndexOf('\n');
        const lineNumber = (textUntilPosition.match(/\n/g) || []).length + 1;
        const column = position - lastNewLine;
        
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column + 1,
          message: `JSON5 语法错误: ${message}`
        });
      } else {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 2,
          message: `JSON5 语法错误: ${message}`
        });
      }
    }
    
    monaco.editor.setModelMarkers(model, "json5-validator", markers);
    
    // 触发验证事件
    if (typeof this.onValidate === 'function') {
      this.onValidate({
        isValid: markers.length === 0,
        errors: markers
      });
    }
    
    return markers.length === 0;
  }
  
  /**
   * 格式化 JSON5 文本并保留注释
   * @param {string} text - 要格式化的 JSON5 文本
   * @returns {string} 格式化后的文本
   */
  formatJSON5WithComments(text) {
    try {
      // 首先尝试解析确保语法正确
      JSON5.parse(text);
      
      // 使用正则表达式保存所有注释
      const comments = [];
      const commentRegex = /\/\/.*$|\/\*[\s\S]*?\*\//gm;
      let commentedText = text.replace(commentRegex, (comment) => {
        const placeholder = `__COMMENT_${comments.length}__`;
        comments.push(comment);
        return placeholder;
      });
      
      // 解析和格式化不含注释的 JSON
      try {
        // 移除可能导致 JSON 解析错误的占位符后的逗号
        commentedText = commentedText.replace(/(__COMMENT_\d+__)\s*,\s*(?=}|\])/g, '$1');
        
        // 解析并格式化
        const parsed = JSON5.parse(commentedText);
        let formatted = JSON5.stringify(parsed, null, 2);
        
        // 恢复注释
        for (let i = 0; i < comments.length; i++) {
          // 处理行注释：确保它们在行尾
          if (comments[i].startsWith('//')) {
            formatted = formatted.replace(
              new RegExp(`\\s*__COMMENT_${i}__\\s*`),
              ` ${comments[i]}\n`
            );
          } 
          // 处理块注释：保留原位置
          else {
            formatted = formatted.replace(
              new RegExp(`__COMMENT_${i}__`),
              comments[i]
            );
          }
        }
        
        return formatted;
      } catch (e) {
        // 如果解析失败，回退到原始文本的基本格式化
        console.warn('高级格式化失败，使用基本格式化', e);
        
        // 基本缩进格式化但保留注释
        let indentLevel = 0;
        const lines = text.split('\n');
        const formattedLines = lines.map(line => {
          // 移除行前的空白
          let trimmedLine = line.trim();
          if (!trimmedLine) return '';
          
          // 根据括号调整缩进级别
          const closingBrackets = (trimmedLine.match(/^[}\]]/g) || []).length;
          indentLevel = Math.max(0, indentLevel - closingBrackets);
          
          // 计算当前行的缩进
          const indent = '  '.repeat(indentLevel);
          const formattedLine = indent + trimmedLine;
          
          // 为下一行计算缩进级别
          const openingBrackets = (trimmedLine.match(/[{\[]$/g) || []).length;
          indentLevel += openingBrackets;
          
          return formattedLine;
        });
        
        return formattedLines.join('\n');
      }
    } catch (error) {
      console.error('格式化 JSON5 失败:', error);
      return text;
    }
  }
  
  /**
   * 格式化当前编辑器内容
   * @returns {Promise<void>}
   */
  async format() {
    try {
      const action = this.editor.getAction('editor.action.formatDocument');
      if (action) {
        await action.run();
      } else {
        const model = this.editor.getModel();
        const text = model.getValue();
        const formatted = this.formatJSON5WithComments(text);
        this.editor.setValue(formatted);
      }
      return true;
    } catch (error) {
      console.error("格式化失败:", error);
      return false;
    }
  }
  
  /**
   * 设置编辑器内容
   * @param {string} value - 要设置的内容
   */
  setValue(value) {
    this.editor.setValue(value || '');
    // 设置后立即验证
    setTimeout(() => this._validateContent(), 0);
  }
  
  /**
   * 获取编辑器内容
   * @returns {string} 编辑器内容
   */
  getValue() {
    return this.editor.getValue();
  }
  
  /**
   * 设置编辑器主题
   * @param {string} theme - 主题名称 ('vs', 'vs-dark', 'hc-black')
   */
  setTheme(theme) {
    monaco.editor.setTheme(theme);
  }
  
  /**
   * 检查内容是否为有效的 JSON5
   * @returns {boolean} 是否有效
   */
  isValid() {
    try {
      JSON5.parse(this.getValue());
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 将内容保存为文件
   * @param {string} [filename='data.json5'] - 文件名
   * @returns {boolean} 是否保存成功
   */
  saveToFile(filename = 'data.json5') {
    try {
      if (!this.isValid()) {
        throw new Error('无法保存，JSON5 内容无效');
      }
      
      const content = this.getValue();
      const blob = new Blob([content], { type: 'application/json5' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error("保存失败:", error);
      return false;
    }
  }
  
  /**
   * 从 File 对象加载内容
   * @param {File} file - 要加载的文件
   * @returns {Promise<boolean>} 是否加载成功
   */
  loadFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('未提供文件'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          // 尝试解析以确保它是有效的 JSON5
          JSON5.parse(content);
          this.setValue(content);
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }
  
  /**
   * 创建文件输入元素来加载文件
   * @returns {Promise<boolean>} 是否加载成功
   */
  showOpenFilePicker() {
    return new Promise((resolve, reject) => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,.json5,.txt';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      
      fileInput.addEventListener('change', async (event) => {
        try {
          const file = event.target.files[0];
          if (file) {
            await this.loadFromFile(file);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          reject(error);
        } finally {
          document.body.removeChild(fileInput);
        }
      });
      
      fileInput.click();
    });
  }
  
  /**
   * 调整编辑器大小
   */
  layout() {
    this.editor.layout();
  }
  
  /**
   * 销毁编辑器实例
   */
  dispose() {
    if (this.editor) {
      this.editor.dispose();
    }
  }
}

// 导出 JSON5Editor 类
export default JSON5Editor;
