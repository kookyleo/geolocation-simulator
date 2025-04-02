import HexagonCoordinateSystem from './HexagonCoordinateSystem.js';
import HexagonRenderer from './HexagonRenderer.js';
import HexagonGridGenerator from './HexagonGridGenerator.js';
import HexagonViewportManager from './HexagonViewportManager.js';
import HexagonMergeManager from './HexagonMergeManager.js';

/**
 * HexagonGridLayer 类 - 负责在地图上创建和管理六边形网格
 */
class HexagonGridLayer {
  constructor(map) {
    this.map = map;
    this.gridLayer = null;
    this.centerLatLng = null;
    this.radius = 500; // 默认半径500米
    this.areaRadius = 5000; // 默认区域半径5000米
    this.visible = false;
    this.hexagons = [];
    this.hexagonCoords = {}; // 存储六边形坐标和索引的映射
    this.allHexagons = []; // 所有生成的六边形，包括可见和不可见的
    this.mergeConfig = []; // 存储需要合并的六边形相邻对

    // 初始化坐标系统
    this.coordSystem = new HexagonCoordinateSystem();

    // 初始化管理器
    this.viewportManager = new HexagonViewportManager(this);
    this.mergeManager = new HexagonMergeManager(this);

    // 添加地图事件监听器
    this._setupMapEventListeners();
  }

  /**
   * 设置网格参数
   * @param {Object} options - 网格配置选项
   * @param {number} options.radius - 六边形半径（米）
   * @param {number} options.areaRadius - 覆盖区域半径（米）
   * @param {Array} options.center - 中心点坐标 [lat, lng]
   */
  setGridOptions(options) {
    if (options.radius) this.radius = options.radius;
    if (options.areaRadius) this.areaRadius = options.areaRadius;
    if (options.center) this.centerLatLng = L.latLng(options.center[0], options.center[1]);

    // 如果网格已显示，则更新网格
    if (this.visible) {
      this.hideGrid();
      this.showGrid();
    }
  }

  /**
   * 显示六边形网格
   */
  showGrid() {
    // 如果没有设置中心点，使用当前地图中心
    if (!this.centerLatLng) {
      this.centerLatLng = this.map.getCenter();
    }

    // 创建网格图层
    this.gridLayer = L.layerGroup().addTo(this.map);

    // 初始化渲染器和网格生成器
    this.renderer = new HexagonRenderer(this.gridLayer, this.coordSystem, this);
    this.gridGenerator = new HexagonGridGenerator(this.coordSystem, this.renderer);

    console.log('Generating hexagon grid...');

    // 生成六边形网格
    const result = this.gridGenerator.generateHexagonGrid(
      this.centerLatLng,
      this.radius,
      this.areaRadius
    );

    // 存储生成的六边形和坐标映射
    this.hexagons = result.hexagons;
    this.allHexagons = [...this.hexagons]; // 保存所有六边形的备份
    this.hexagonCoords = result.hexagonCoords;
    
    console.log('Preprocessing hexagon merge relations before rendering...');
    
    // 预先初始化每个六边形的边信息
    this.allHexagons.forEach(hexagon => {
      if (hexagon.polygon) {
        this.renderer.initializeHexagonEdges(hexagon);
      }
    });
    
    // 如果有合并配置，先预处理合并关系
    if (this.mergeManager && this.mergeConfig && this.mergeConfig.length > 0) {
      console.log('Starting to apply merge configuration, total adjacent pairs: ' + this.mergeConfig.length);
      console.log('Merge configuration content:', JSON.stringify(this.mergeConfig));
      
      // 设置合并配置
      this.mergeManager.setMergeConfig(this.mergeConfig);
      
      // 预处理合并关系
      const { mergeInfo } = this.mergeManager.preprocessMergeRelations(this.allHexagons);
      
      console.log('Generated merge info:', JSON.stringify(mergeInfo));
      
      // 检查合并信息是否为空
      if (Object.keys(mergeInfo).length === 0) {
        console.log('Warning: Generated merge info is empty, please check adjacent pair configuration');
      } else {
        // 应用合并信息到每个六边形
        this.allHexagons.forEach(hexagon => {
          if (hexagon.polygon) {
            // 检查该六边形是否需要应用合并信息
            if (mergeInfo[hexagon.id]) {
              console.log(`Applying merge info to hexagon ${hexagon.id}`);
              // 应用合并信息（applyMergeInfo 内部会调用 recreateHexagonWithVisibleEdges）
              this.mergeManager.applyMergeInfo(hexagon, mergeInfo);
            }
          }
        });
        
        console.log('Merge relation preprocessing complete, processed ' + this.allHexagons.length + ' hexagons');
      }
    }
    
    this.visible = true;
    
    // 如果启用了视口渲染，只显示当前视口内的六边形
    if (this.viewportManager.useViewportRendering) {
      this.viewportManager.updateVisibleHexagons();
    }
  }

  /**
   * 隐藏六边形网格
   */
  hideGrid() {
    if (this.gridLayer) {
      this.map.removeLayer(this.gridLayer);
      this.gridLayer = null;
      this.hexagons = [];
      this.allHexagons = [];
      this.viewportManager.clearVisibleHexagons();
      this.visible = false;
    }
  }

  /**
   * 切换网格显示状态
   * @returns {boolean} 切换后的显示状态
   */
  toggleGrid() {
    if (this.visible) {
      this.hideGrid();
    } else {
      this.showGrid();
    }
    return this.visible;
  }

  /**
   * 根据坐标获取六边形ID
   * @param {Object} coords - 包含q和r坐标的对象
   * @returns {string|null} 六边形ID，如果不存在则返回null
   */
  getHexagonIdByCoords(coords) {
    // 使用坐标系统生成内部 q,r 格式的 ID
    const id = this.coordSystem.getHexagonId(coords);
    return this.hexagonCoords[id] || null;
  }

  /**
   * 根据ID查找六边形
   * @param {string} id - 六边形ID
   * @returns {Object|null} 六边形对象，如果不存在则返回null
   */
  findHexagonById(id) {
    return this.hexagons.find(hex => hex.id === id) || null;
  }

  /**
   * 设置地图事件监听器
   * @private
   */
  _setupMapEventListeners() {
    // 地图移动结束和缩放结束时更新可见的六边形
    this.map.on('moveend', () => {
      if (this.visible && this.viewportManager.useViewportRendering) {
        this.viewportManager.updateVisibleHexagons();
      }
    });

    this.map.on('zoomend', () => {
      if (this.visible && this.viewportManager.useViewportRendering) {
        this.viewportManager.updateVisibleHexagons();
      }
    });
  }

  /**
   * 更新可见的六边形
   * @private
   */
  _updateVisibleHexagons() {
    if (!this.visible || !this.allHexagons.length) return;

    console.time('Update visible hexagons');

    // 获取当前地图视口范围
    const bounds = this.map.getBounds();

    // 扩展视口范围，预加载一部分视口外的六边形
    const expandedBounds = bounds.pad(this.viewportMargin - 1);

    // 记录当前可见的六边形
    const newVisibleHexagons = new Set();

    // 遍历所有六边形，确定哪些在视口内
    for (const hex of this.allHexagons) {
      const center = hex.center || (hex.polygon && hex.polygon._latlng);

      if (center && expandedBounds.contains(center)) {
        // 如果六边形在视口内，添加到可见集合
        newVisibleHexagons.add(hex.id);

        // 如果这个六边形之前不可见，现在显示它
        if (!this.visibleHexagons.has(hex.id)) {
          this._showHexagon(hex);
        }
      } else {
        // 如果六边形不在视口内，但之前是可见的，隐藏它
        if (this.visibleHexagons.has(hex.id)) {
          this._hideHexagon(hex);
        }
      }
    }

    // 更新可见六边形集合
    this.visibleHexagons = newVisibleHexagons;

    // 更新当前可见的六边形数组
    this.hexagons = this.allHexagons.filter(hex => this.visibleHexagons.has(hex.id));

    console.timeEnd('Update visible hexagons');
    console.log(`Visible hexagons: ${this.visibleHexagons.size}/${this.allHexagons.length}`);
  }

  /**
   * 显示单个六边形
   * @param {Object} hexagon - 六边形对象
   * @private
   */
  _showHexagon(hexagon) {
    if (hexagon.polygon && !this.gridLayer.hasLayer(hexagon.polygon)) {
      hexagon.polygon.addTo(this.gridLayer);
    }

    if (hexagon.label && !this.gridLayer.hasLayer(hexagon.label)) {
      hexagon.label.addTo(this.gridLayer);
    }
  }

  /**
   * 隐藏单个六边形
   * @param {Object} hexagon - 六边形对象
   * @private
   */
  _hideHexagon(hexagon) {
    if (hexagon.polygon && this.gridLayer.hasLayer(hexagon.polygon)) {
      this.gridLayer.removeLayer(hexagon.polygon);
    }

    if (hexagon.label && this.gridLayer.hasLayer(hexagon.label)) {
      this.gridLayer.removeLayer(hexagon.label);
    }
  }

  /**
   * 设置是否使用视口渲染
   * @param {boolean} enabled - 是否启用
   */
  setViewportRendering(enabled) {
    return this.viewportManager.setViewportRendering(enabled);
  }

  /**
   * 创建六边形网格
   * @param {Object} options - 网格配置选项
   * @param {number} options.centerLat - 中心纬度
   * @param {number} options.centerLng - 中心经度
   * @param {number} options.areaRadius - 区域半径（米）
   * @param {number} options.hexRadius - 六边形半径（米）
   * @param {string} options.name - 网格名称（用于标识）
   * @returns {Object} 创建的网格信息
   */
  createHexagonGrid(options) {
    // 如果没有指定参数，使用默认值
    const centerLat = options.centerLat || 37.7749;
    const centerLng = options.centerLng || -122.4194;
    const areaRadius = options.areaRadius || 5000;
    const hexRadius = options.hexRadius || 500;
    const gridName = options.name || '';

    // 设置网格参数
    this.centerLatLng = L.latLng(centerLat, centerLng);
    this.radius = hexRadius;
    this.areaRadius = areaRadius;
    this.gridName = gridName;

    // 显示网格
    this.showGrid();

    return {
      centerLat,
      centerLng,
      areaRadius,
      hexRadius,
      hexagonCount: this.allHexagons.length
    };
  }

  /**
   * 清除所有网格
   */
  clearAllGrids() {
    this.hideGrid();
  }

  /**
   * 合并相邻六边形网格
   * @param {Array} adjacentPairs - 相邻对数组，每对包含两个网格 ID
   */
  mergeAdjacentHexagons(adjacentPairs) {
    console.log('Merge adjacent hexagons stage: setting merge configuration, total ' + (adjacentPairs ? adjacentPairs.length : 0) + ' pairs');
    
    // 保存合并配置
    this.mergeConfig = adjacentPairs || [];
    
    if (this.visible && this.gridLayer) {
      // 如果网格已经显示，则重新应用合并配置
      this.hideGrid();
      this.showGrid();
    } else {
      // 如果网格还没有显示，只保存配置，等到显示时再应用
      console.log('Merge adjacent hexagons stage: grid not displayed, configuration saved for later application');
    }
  }
}

export default HexagonGridLayer;