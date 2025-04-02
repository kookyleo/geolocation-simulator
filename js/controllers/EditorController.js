/**
 * EditorController 类 - 负责编辑器的集成和管理
 */
class EditorController {
  /**
   * 构造函数
   */
  constructor() {
    this.editors = new Map();
  }
  
  /**
   * 创建JSON编辑器
   * @param {HTMLElement} container - 编辑器容器
   * @param {Object} data - 初始数据
   * @param {boolean} readOnly - 是否只读
   * @param {Function} onSave - 保存回调
   * @returns {Promise<Object>} 编辑器实例
   */
  async createJSONEditor(container, data, readOnly = true, onSave = null) {
    try {
      // 等待Monaco编辑器加载
      await window.monacoHelpers.waitForMonaco();
      
      // 导入JSON5支持模块
      const { createJSON5Editor } = await import('../editor/json5-support.js');
      
      // 创建JSON5编辑器
      const editor = createJSON5Editor(container, {
        value: JSON.stringify(data, null, 2),
        readOnly: readOnly,
        fontSize: 12,
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false
      });
      
      // 存储编辑器实例
      const editorId = 'editor_' + Math.random().toString(36).substr(2, 9);
      this.editors.set(editorId, {
        editor,
        container,
        onSave
      });
      
      return {
        id: editorId,
        editor,
        
        // 获取编辑器值
        getValue: () => editor.getValue(),
        
        // 设置编辑器值
        setValue: (value) => editor.setValue(value),
        
        // 设置编辑模式
        setEditMode: (isEditing) => {
          editor.editor?.updateOptions?.({ readOnly: !isEditing });
        },
        
        // 销毁编辑器
        dispose: () => {
          editor.editor?.dispose?.();
          this.editors.delete(editorId);
        }
      };
    } catch (error) {
      console.error('Monaco Editor load failed:', error);
      
      // 如果Monaco加载失败，使用普通文本区域作为后备
      return this._createFallbackEditor(container, data, readOnly, onSave);
    }
  }
  
  /**
   * 创建后备编辑器（当Monaco加载失败时）
   * @param {HTMLElement} container - 编辑器容器
   * @param {Object} data - 初始数据
   * @param {boolean} readOnly - 是否只读
   * @param {Function} onSave - 保存回调
   * @returns {Object} 编辑器实例
   * @private
   */
  _createFallbackEditor(container, data, readOnly = true, onSave = null) {
    // 创建文本区域
    const textarea = document.createElement('textarea');
    textarea.className = 'json-editor';
    textarea.value = JSON.stringify(data, null, 2);
    textarea.style.minHeight = '150px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.padding = '8px';
    textarea.style.boxSizing = 'border-box';
    textarea.readOnly = readOnly;
    
    // 清空容器并添加文本区域
    container.innerHTML = '';
    container.appendChild(textarea);
    
    // 存储编辑器实例
    const editorId = 'fallback_' + Math.random().toString(36).substr(2, 9);
    this.editors.set(editorId, {
      textarea,
      container,
      onSave
    });
    
    return {
      id: editorId,
      textarea,
      
      // 获取编辑器值
      getValue: () => textarea.value,
      
      // 设置编辑器值
      setValue: (value) => textarea.value = value,
      
      // 设置编辑模式
      setEditMode: (isEditing) => {
        textarea.readOnly = !isEditing;
      },
      
      // 销毁编辑器
      dispose: () => {
        container.removeChild(textarea);
        this.editors.delete(editorId);
      }
    };
  }
}

// 导出类
export default EditorController;
