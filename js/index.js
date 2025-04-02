/**
 * 主入口文件 - 初始化应用
 */
import MapController from './MapController.js';
import LocationManager from './LocationManager.js';
import UIController from './UIController.js';
import GridManager from './GridManager.js';
import HexagonGridLayer from './HexagonGridLayer.js';

document.addEventListener('DOMContentLoaded', () => {
  // 初始化地图控制器
  const mapController = new MapController();
  mapController.initMap();
  
  // 初始化六边形网格图层
  const hexagonGridLayer = new HexagonGridLayer(mapController.map);
  
  // 初始化位置管理器
  const locationManager = new LocationManager();
  
  // 初始化网格管理器
  const gridManager = new GridManager(hexagonGridLayer);
  
  // 初始化UI控制器
  const uiController = new UIController(mapController, locationManager);
  
  // 注册网格管理器事件
  document.addEventListener('openGridManager', () => {
    gridManager.openGridManager();
  });
});
