/**
 * HexagonRenderer 类 - 负责在地图上渲染六边形和管理其样式
 */
class HexagonRenderer {
  /**
   * 构造函数
   * @param {L.LayerGroup} gridLayer - Leaflet图层组，用于添加六边形
   * @param {HexagonCoordinateSystem} coordSystem - 六边形坐标系统
   * @param {HexagonGridLayer} parentGridLayer - 父级六边形网格层（可选）
   */
  constructor(gridLayer, coordSystem, parentGridLayer = null) {
    this.gridLayer = gridLayer;
    this.coordSystem = coordSystem;
    this.parentGridLayer = parentGridLayer; // 父级网格层引用，用于查找标签等
  }

  // ===== 基本渲染功能 =====

  /**
   * 在地图上添加一个六边形
   * @param {L.LatLng} center - 六边形中心点
   * @param {number} radius - 六边形半径（米）
   * @param {string} id - 六边形的编号
   * @param {Object} coords - 六边形的坐标
   * @param {Array} vertices - 六边形的顶点坐标
   * @returns {HexagonObject} 包含六边形多边形和标签的对象
   */
  addHexagon(center, radius, id, coords, vertices) {
    // 第一步: 创建无边框的六边形区块
    const hexagon = L.polygon(vertices, {
      color: '#3388ff',
      weight: 0,  // 设置边框宽度为0，不显示边框
      opacity: 0,  // 边框透明度为0
      fillColor: '#3388ff', // 填充背景颜色
      fillOpacity: 0.2
    }).addTo(this.gridLayer);
    
    // 将编号和坐标添加到六边形属性中
    hexagon.id = id;
    hexagon.coords = coords;
    
    // 初始化边信息数组，默认所有边都可见，但不绘制
    const edgeInfo = [];
    for (let i = 0; i < vertices.length; i++) {
      edgeInfo.push({
        visible: true,  // 默认可见，但需要根据合并配置决定是否绘制
        neighborId: null,  // 初始没有相邻六边形
        isOuterEdge: true  // 默认所有边都是外边缘
      });
    }
    
    // 存储边信息
    hexagon.edgeInfo = edgeInfo;
    hexagon.edges = [];  // 初始化边数组，但不立即创建边
    
    // 第二步: 边框将在合并处理后通过recreateHexagonWithVisibleEdges方法绘制
    // 这样可以确保只在需要的地方绘制边框
    
    // 将内部 q,r 格式的 ID 转换为显示用的 p*n* 格式
    const displayId = this.coordSystem ? this.coordSystem.getDisplayId(id) : id;
    
    // 创建编号标签，默认隐藏
    const label = L.marker(center, {
      icon: L.divIcon({
        className: 'hex-label',
        html: `<div style="text-align: center; font-size: 12px; font-weight: bold; color: #3388ff; opacity: 0;" class="hex-label-content">${displayId}</div>`,
        iconSize: [50, 20],
        iconAnchor: [25, 10]
      }),
      interactive: false // 标签不响应鼠标事件，避免干扰多边形的交互
    }).addTo(this.gridLayer);
    
    // 存储显示 ID
    hexagon.displayId = displayId;
    
    // 使用通用的事件处理函数
    this.setupHexagonEvents(hexagon, label);
    
    // 返回六边形对象
    return {
      polygon: hexagon,
      label: label,
      id: id,
      coords: coords,
      center: center,  // 添加中心点属性，便于序列化
      edgeInfo: edgeInfo  // 添加边信息
    };
  }

  // ===== 事件处理功能 =====
  
  /**
   * 为六边形添加鼠标事件处理
   * @param {L.Polygon} hexagon - 六边形多边形
   * @param {L.Marker} label - 六边形标签
   */
  setupHexagonEvents(hexagon, label) {
    // 在添加事件前先存储原始样式
    const originalStyle = {
      fillOpacity: hexagon.options.fillOpacity || 0.2,
      weight: hexagon.options.weight || 0,
      opacity: hexagon.options.opacity || 0
    };
    
    // 添加鼠标事件处理
    hexagon.on('mouseover', () => {
      // 显示标签
      if (label && label._icon) {
        const labelContent = label._icon.querySelector('.hex-label-content');
        if (labelContent) {
          labelContent.style.opacity = '1';
        }
      }
      
      // 高亮显示六边形
      hexagon.setStyle({
        fillOpacity: 0.4  // 增加背景不透明度
      });
    });
    
    hexagon.on('mouseout', () => {
      // 隐藏标签
      if (label && label._icon) {
        const labelContent = label._icon.querySelector('.hex-label-content');
        if (labelContent) {
          labelContent.style.opacity = '0';
        }
      }
      
      // 恢复六边形样式
      hexagon.setStyle({
        fillOpacity: originalStyle.fillOpacity,
        weight: originalStyle.weight,
        opacity: originalStyle.opacity
      });
    });
  }

  /**
   * 初始化六边形的边信息
   * @param {Object} hexagon - 六边形对象
   */
  initializeHexagonEdges(hexagon) {
    if (!hexagon || !hexagon.polygon) {
      console.error('Hexagon object invalid, cannot initialize edges');
      return;
    }
    
    // 获取顶点
    const vertices = hexagon.polygon.getLatLngs()[0];
    
    // 初始化边信息数组
    if (!hexagon.edgeInfo) {
      hexagon.edgeInfo = [];
      for (let e = 0; e < vertices.length; e++) {
        hexagon.edgeInfo.push({
          visible: true,
          neighborId: null,
          isOuterEdge: true // 默认所有边都是外边缘
        });
      }
    }
    
    // 清除旧的边缘线（如果有）
    if (hexagon.edges) {
      hexagon.edges.forEach(edge => {
        if (this.gridLayer.hasLayer(edge)) {
          this.gridLayer.removeLayer(edge);
        }
      });
    }
    
    // 初始化边数组
    hexagon.edges = [];
    
    // 使用更新后的recreateHexagonWithVisibleEdges方法来绘制边框
    this.recreateHexagonWithVisibleEdges(hexagon);
  }
  
  /**
   * 确保六边形有边信息
   * @param {Object} hexagon - 六边形对象
   * @param {Object} neighborHex - 相邻六边形对象
   */
  ensureHexagonsHaveEdgeInfo(hexagon, neighborHex) {
    // 确保两个六边形都有边信息
    if (!hexagon.edgeInfo) {
      this.initializeHexagonEdges(hexagon);
    }
    
    if (!neighborHex.edgeInfo) {
      this.initializeHexagonEdges(neighborHex);
    }
  }

  /**
   * 更新六边形的边缘显示
   * @param {Object} hexagon - 六边形对象
   */
  recreateHexagonWithVisibleEdges(hexagon) {
    if (!hexagon || !hexagon.polygon || !hexagon.edgeInfo) {
      console.error('Hexagon object invalid, cannot update edges');
      return;
    }
    
    // 获取六边形顶点
    const vertices = hexagon.polygon.getLatLngs()[0];
    
    // 清除旧的边缘线（如果有）
    if (hexagon.edges) {
      hexagon.edges.forEach(edge => {
        if (this.gridLayer.hasLayer(edge)) {
          this.gridLayer.removeLayer(edge);
        }
      });
      hexagon.edges = [];
    }
    
    // 检查六边形是否参与了任何相邻配置
    const hasAnyNeighbor = hexagon.edgeInfo.some(info => info.neighborId);
    
    // 如果没有参与任何相邻配置，绘制完整边框
    if (!hasAnyNeighbor) {
      // 对于未出现在相邻配置中的六边形，绘制完整边框
      const regularEdgeStyle = {
        color: '#3388ff',
        weight: 0.6,  // 使用细线，与记忆中的优化保持一致
        opacity: 0.6   // 标准透明度，与记忆中的优化保持一致
      };
      
      // 绘制完整 6 条边框
      for (let i = 0; i < vertices.length; i++) {
        const nextIndex = (i + 1) % vertices.length;
        const edge = L.polyline([
          vertices[i],
          vertices[nextIndex]
        ], regularEdgeStyle).addTo(this.gridLayer);
        
        if (!hexagon.edges) hexagon.edges = [];
        hexagon.edges.push(edge);
      }
      return; // 已处理完毕，直接返回
    }
    
    // 对于参与了相邻配置的六边形，实现有限描边逻辑
    for (let i = 0; i < vertices.length; i++) {
      const nextIndex = (i + 1) % vertices.length;
      
      // 判断这条边是否有相邻六边形
      const hasNeighbor = hexagon.edgeInfo[i] && hexagon.edgeInfo[i].neighborId;
      
      if (!hasNeighbor) {
        // 外边框样式 - 清晰可见
        const edgeStyle = {
          color: '#3388ff',
          weight: 0.6,  // 使用细线
          opacity: 0.8   // 适度透明度，使外边框清晰可见
        };
        
        // 创建外边框线
        const edge = L.polyline([
          vertices[i],
          vertices[nextIndex]
        ], edgeStyle).addTo(this.gridLayer);
        
        if (!hexagon.edges) hexagon.edges = [];
        hexagon.edges.push(edge);
      } else {
        // 内部边框样式 - 几乎不可见
        const edgeStyle = {
          color: '#3388ff',
          weight: 0.06,  // 非常细的线
          opacity: 0.1    // 非常低的透明度，几乎不可见
        };
        
        // 内部边框线（非常淡）
        const edge = L.polyline([
          vertices[i],
          vertices[nextIndex]
        ], edgeStyle).addTo(this.gridLayer);
        
        if (!hexagon.edges) hexagon.edges = [];
        hexagon.edges.push(edge);
      }
    }
  }
}

export default HexagonRenderer;
