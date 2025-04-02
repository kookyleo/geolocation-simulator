/**
 * UIController 类 - 负责UI交互和事件处理的主协调器
 */
import InfoPanelController from './InfoPanelController.js';
import ModalController from './ModalController.js';
import EditorController from './EditorController.js';
import LocationUIController from './LocationUIController.js';

class UIController {
  /**
   * 构造函数
   * @param {Object} mapController - 地图控制器
   * @param {Object} locationManager - 位置管理器
   */
  constructor(mapController, locationManager) {
    this.mapController = mapController;
    this.locationManager = locationManager;
    
    // 初始化子控制器
    this.modalController = new ModalController();
    this.editorController = new EditorController();
    this.infoPanelController = new InfoPanelController();
    this.locationUIController = new LocationUIController(
      mapController, 
      locationManager, 
      this.modalController, 
      this.editorController
    );
    
    // 初始化网格管理器按钮事件
    this._setupGridManagerButton();
  }

  /**
   * 设置网格管理器按钮事件
   * @private
   */
  _setupGridManagerButton() {
    const manageGridsBtn = document.getElementById('manageGrids');
    if (manageGridsBtn) {
      manageGridsBtn.addEventListener('click', () => {
        // 触发网格管理器事件，这部分功能将在另一个控制器中实现
        const event = new CustomEvent('openGridManager');
        document.dispatchEvent(event);
      });
    }
  }
}

// 导出类
export default UIController;
