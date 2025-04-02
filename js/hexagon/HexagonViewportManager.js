/**
 * HexagonViewportManager 类 - 负责管理六边形网格的视口渲染
 * 
 * 优化大量六边形的渲染性能，该类负责：
 * - 计算当前地图视口范围
 * - 确定哪些六边形在当前视口内可见
 * - 管理可见六边形的集合
 * - 在地图移动或缩放时更新可见六边形
 * - 实现按需渲染，提高性能
 * 
 * 可以将其视为六边形系统的"视野管理员"，决定哪些六边形需要被渲染，哪些可以暂时隐藏。
 */
class HexagonViewportManager {
  constructor(gridLayer) {
    this.gridLayer = gridLayer;
    this.useViewportRendering = true; // 是否使用视口渲染
    this.visibleHexagons = new Set(); // 当前可见的六边形
    this.viewportMargin = 1.2; // 视口扩展系数，预加载视口外的一部分六边形
  }

  /**
   * 设置是否使用视口渲染
   */
  setViewportRendering(enabled) {
    this.useViewportRendering = enabled;
    
    if (this.gridLayer.visible) {
      if (enabled) {
        // 如果启用视口渲染，更新可视六边形
        this.updateVisibleHexagons();
      } else {
        // 如果禁用视口渲染，显示所有六边形
        this.gridLayer.allHexagons.forEach(hex => this._showHexagon(hex));
        this.gridLayer.hexagons = this.gridLayer.allHexagons;
      }
    }
    
    return this.useViewportRendering;
  }

  /**
   * 更新可见的六边形
   */
  updateVisibleHexagons() {
    if (!this.gridLayer.visible || !this.gridLayer.allHexagons.length) return;
    
    console.time('Updating visible hexagons');
    
    // 获取当前地图视口范围
    const bounds = this.gridLayer.map.getBounds();
    
    // 扩展视口范围，预加载一部分视口外的六边形
    const expandedBounds = bounds.pad(this.viewportMargin - 1);
    
    // 记录当前可见的六边形
    const newVisibleHexagons = new Set();
    
    // 遍历所有六边形，确定哪些在视口内
    for (const hex of this.gridLayer.allHexagons) {
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
    
    // Update current visible hexagons array
    this.gridLayer.hexagons = this.gridLayer.allHexagons.filter(hex => this.visibleHexagons.has(hex.id));
    
    console.timeEnd('Updating visible hexagons');
    console.log(`Visible hexagons: ${this.visibleHexagons.size}/${this.gridLayer.allHexagons.length}`);
  }

  /**
   * 显示单个六边形
   * @private
   */
  _showHexagon(hexagon) {
    if (hexagon.polygon && !this.gridLayer.gridLayer.hasLayer(hexagon.polygon)) {
      hexagon.polygon.addTo(this.gridLayer.gridLayer);
    }
    
    if (hexagon.label && !this.gridLayer.gridLayer.hasLayer(hexagon.label)) {
      hexagon.label.addTo(this.gridLayer.gridLayer);
    }
    
    // 显示边缘线（如果有）
    if (hexagon.edges) {
      hexagon.edges.forEach(edge => {
        if (!this.gridLayer.gridLayer.hasLayer(edge)) {
          edge.addTo(this.gridLayer.gridLayer);
        }
      });
    }
  }

  /**
   * 隐藏单个六边形
   * @private
   */
  _hideHexagon(hexagon) {
    if (hexagon.polygon && this.gridLayer.gridLayer.hasLayer(hexagon.polygon)) {
      this.gridLayer.gridLayer.removeLayer(hexagon.polygon);
    }
    
    if (hexagon.label && this.gridLayer.gridLayer.hasLayer(hexagon.label)) {
      this.gridLayer.gridLayer.removeLayer(hexagon.label);
    }
    
    // 隐藏边缘线（如果有）
    if (hexagon.edges) {
      hexagon.edges.forEach(edge => {
        if (this.gridLayer.gridLayer.hasLayer(edge)) {
          this.gridLayer.gridLayer.removeLayer(edge);
        }
      });
    }
  }

  /**
   * 清除可见六边形集合
   */
  clearVisibleHexagons() {
    this.visibleHexagons.clear();
  }
}

export default HexagonViewportManager;
