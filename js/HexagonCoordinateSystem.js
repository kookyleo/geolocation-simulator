/**
 * HexagonCoordinateSystem 类 - 负责六边形坐标系统、几何计算和编号
 */
class HexagonCoordinateSystem {
  constructor() {
    // 初始化代码，如果需要
  }
  
  // ===== 坐标计算部分 =====
  
  /**
   * 计算六边形的轴向坐标（q, r）
   * 使用轴向坐标系统，其中q是从左上到右下的轴，r是垂直轴
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {Object} 包含q和r坐标的对象
   */
  calculateHexCoordinates(row, col) {
    // 对于偶数行，列坐标需要调整
    const q = col - Math.floor(row / 2);
    const r = row;
    
    return { q, r };
  }
  
  /**
   * 从轴向坐标计算行列索引
   * @param {number} q - q坐标
   * @param {number} r - r坐标
   * @returns {Object} 包含行和列索引的对象
   */
  calculateRowCol(q, r) {
    const row = r;
    const col = q + Math.floor(r / 2);
    return { row, col };
  }

  // ===== ID处理部分 =====
  
  /**
   * 根据六边形坐标计算其编号
   * 内部使用 q,r 格式，外部显示使用 p*n* 格式
   * @param {Object} coords - 包含q和r坐标的对象
   * @returns {string} 六边形编号（内部格式）
   */
  getHexagonId(coords) {
    const { q, r } = coords;
    
    // 内部使用 q,r 格式
    return `${q},${r}`;
  }
  
  /**
   * 将内部的 q,r 格式转换为外部显示的 p*n* 格式
   * @param {string} internalId - 内部 q,r 格式的 ID
   * @returns {string} 外部显示的 p*n* 格式 ID
   */
  getDisplayId(internalId) {
    // 如果已经是 p*n* 格式，直接返回
    if (/^[pn]\d+[pn]\d+$/.test(internalId)) {
      return internalId;
    }
    
    // 如果是 q,r 格式，转换为 p*n* 格式
    if (internalId.includes(',')) {
      const [q, r] = internalId.split(',').map(Number);
      const qPrefix = q >= 0 ? 'p' : 'n';
      const rPrefix = r >= 0 ? 'p' : 'n';
      return qPrefix + Math.abs(q) + rPrefix + Math.abs(r);
    }
    
    return internalId; // 如果不能转换，返回原始 ID
  }
  
  /**
   * 将外部显示的 p*n* 格式转换为内部的 q,r 格式
   * @param {string} displayId - 外部显示的 p*n* 格式 ID
   * @returns {string} 内部 q,r 格式的 ID
   */
  getInternalId(displayId) {
    // 如果已经是 q,r 格式，直接返回
    if (displayId.includes(',')) {
      return displayId;
    }
    
    // 如果是 p*n* 格式，转换为 q,r 格式
    if (/^[pn]\d+[pn]\d+$/.test(displayId)) {
      const match = displayId.match(/^([pn])(\d+)([pn])(\d+)$/);
      if (match) {
        const [, qPrefix, qAbs, rPrefix, rAbs] = match;
        const q = qPrefix === 'p' ? Number(qAbs) : -Number(qAbs);
        const r = rPrefix === 'p' ? Number(rAbs) : -Number(rAbs);
        return `${q},${r}`;
      }
    }
    
    return displayId; // 如果不能转换，返回原始 ID
  }
  
  // ===== 几何计算部分 =====
  
  /**
   * 计算六边形的顶点坐标
   * @param {L.LatLng} center - 六边形中心点
   * @param {number} radius - 六边形半径（米）
   * @returns {Array} 顶点坐标数组
   */
  calculateHexagonVertices(center, radius) {
    const vertices = [];
    
    // 计算六边形的6个顶点
    // 从正上方开始，顺时针方向
    for (let i = 0; i < 6; i++) {
      // 每个点旋转60度，从正上方开始
      const angle = (Math.PI / 3) * i;
      
      // 计算顶点在平面上的偏移（米）
      // 对于尖顶六边形，我们需要将模型旋转30度
      const adjustedAngle = angle + Math.PI / 6; // 旋转30度（即PI/6）
      const x = radius * Math.cos(adjustedAngle);
      const y = radius * Math.sin(adjustedAngle);
      
      // 将偏移转换为经纬度
      const latChange = y / 111111;
      const lngChange = x / (111111 * Math.cos(center.lat * Math.PI / 180));
      
      // 添加顶点
      vertices.push([
        center.lat + latChange,
        center.lng + lngChange
      ]);
    }
    
    return vertices;
  }

  /**
   * 将平面坐标转换为地理坐标
   * @param {number} x - x坐标（米）
   * @param {number} y - y坐标（米）
   * @param {L.LatLng} centerLatLng - 中心点地理坐标
   * @returns {L.LatLng} 地理坐标
   */
  xyToLatLng(x, y, centerLatLng) {
    // 使用Leaflet的计算方法将米转换为经纬度
    // 计算纬度变化（北/南方向）
    const latChange = y / 111111; // 大约每111111米对应1度纬度
    
    // 计算经度变化（东/西方向）- 需要考虑纬度
    const lngChange = x / (111111 * Math.cos(centerLatLng.lat * Math.PI / 180));
    
    return L.latLng(
      centerLatLng.lat + latChange,
      centerLatLng.lng + lngChange
    );
  }
  
  /**
   * 计算两点之间的距离
   * @param {L.LatLng} point1 - 第一个点
   * @param {L.LatLng} point2 - 第二个点
   * @returns {number} 距离（米）
   */
  calculateDistance(point1, point2) {
    return point1.distanceTo(point2);
  }
}

export default HexagonCoordinateSystem;
