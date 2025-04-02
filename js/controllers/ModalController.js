/**
 * ModalController 类 - 负责模态框的通用管理
 */
class ModalController {
  /**
   * 构造函数
   */
  constructor() {
    // 模态框集合
    this.modals = {};
    
    // 初始化ESC键关闭模态框功能
    this._setupEscKeyListener();
  }
  
  /**
   * 注册模态框
   * @param {string} id - 模态框ID
   * @param {HTMLElement} modal - 模态框元素
   * @param {Function} closeCallback - 关闭回调函数
   */
  registerModal(id, modal, closeCallback) {
    this.modals[id] = {
      element: modal,
      close: closeCallback || (() => { modal.style.display = 'none'; })
    };
    
    // 添加点击模态框外部关闭功能
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(id);
      }
    });
  }
  
  /**
   * 打开模态框
   * @param {string} id - 模态框ID
   */
  openModal(id) {
    const modal = this.modals[id];
    if (modal && modal.element) {
      modal.element.style.display = 'flex';
    }
  }
  
  /**
   * 关闭模态框
   * @param {string} id - 模态框ID
   */
  closeModal(id) {
    const modal = this.modals[id];
    if (modal && modal.close) {
      modal.close();
    }
  }
  
  /**
   * 关闭所有模态框
   */
  closeAllModals() {
    Object.keys(this.modals).forEach(id => {
      this.closeModal(id);
    });
  }
  
  /**
   * 设置ESC键关闭模态框功能
   * @private
   */
  _setupEscKeyListener() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }
}

// 导出类
export default ModalController;
