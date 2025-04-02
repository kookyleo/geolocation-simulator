/**
 * InfoPanelController 类 - 负责信息面板的显示和隐藏
 */
class InfoPanelController {
  /**
   * 构造函数
   */
  constructor() {
    // 信息面板相关元素
    this.infoPanel = document.querySelector('.info-panel');
    this.infoToggle = document.querySelector('.info-toggle');
    
    // 初始化信息面板的收起/展开功能
    this._setupInfoPanelToggle();
  }
  
  /**
   * 设置信息面板的收起/展开功能
   * @private
   */
  _setupInfoPanelToggle() {
    // 初始状态：显示信息面板，隐藏切换按钮
    this.infoPanel.classList.remove('collapsed');
    this.infoToggle.classList.add('hidden');

    // 点击信息面板外部区域时收起信息面板
    document.addEventListener('click', (e) => {
      // 如果点击的不是信息面板内部或切换按钮
      if (!this.infoPanel.contains(e.target) && !this.infoToggle.contains(e.target)) {
        // 如果信息面板当前是展开状态，则收起
        if (!this.infoPanel.classList.contains('collapsed')) {
          // 同时显示切换按钮和收起面板，实现平滑过渡
          this.infoToggle.classList.remove('hidden');
          this.infoPanel.classList.add('collapsed');
        }
      }
    });

    // 点击切换按钮时展开信息面板
    this.infoToggle.addEventListener('click', () => {
      // 同时隐藏切换按钮和展开面板，实现平滑过渡
      this.infoToggle.classList.add('hidden');
      this.infoPanel.classList.remove('collapsed');
    });
  }
}

// 导出类
export default InfoPanelController;
