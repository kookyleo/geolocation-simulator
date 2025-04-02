/**
 * HexagonGridGenerator 类 - 负责生成六边形网格
 */
class HexagonGridGenerator {
  /**
   * 构造函数
   * @param {HexagonCoordinateSystem} coordSystem - 六边形坐标系统
   * @param {HexagonRenderer} renderer - 六边形渲染器
   */
  constructor(coordSystem, renderer) {
    this.coordSystem = coordSystem;
    this.renderer = renderer;
  }

  /**
   * 生成六边形网格
   * @param {L.LatLng} centerLatLng - 网格中心点
   * @param {number} hexRadius - 六边形半径（米）
   * @param {number} areaRadius - 覆盖区域半径（米）
   * @returns {Array} 生成的六边形数组
   */
  generateHexagonGrid(centerLatLng, hexRadius, areaRadius) {
    console.time('Generating hexagon grid');
    
    // 存储生成的六边形
    const hexagons = [];
    const hexagonCoords = {};
    
    // 计算六边形尺寸
    const hexWidth = hexRadius * Math.sqrt(3);
    const hexHeight = hexRadius * 2;
    
    // 计算转换因子，用于将轴向坐标转换为像素坐标
    const widthFactor = hexWidth;
    const heightFactor = hexHeight * 3/4;
    
    // 计算覆盖范围内的轴向坐标范围
    // 使用轴向坐标系统而非圆形范围
    const axialRadius = Math.ceil(areaRadius / Math.min(hexWidth, hexHeight));
    
    // 使用轴向坐标系统生成六边形
    // 这种方法避免了大量的距离计算
    for (let q = -axialRadius; q <= axialRadius; q++) {
      const r1 = Math.max(-axialRadius, -q - axialRadius);
      const r2 = Math.min(axialRadius, -q + axialRadius);
      
      for (let r = r1; r <= r2; r++) {
        // 计算六边形的坐标编号
        const hexCoords = { q, r, s: -q-r };
        
        // 计算六边形的编号
        const hexId = this.coordSystem.getHexagonId(hexCoords);
        
        // 将轴向坐标转换为像素坐标
        const x = (q + r/2) * widthFactor;
        const y = r * heightFactor;
        
        // 将像素坐标转换为地理坐标
        const point = this.coordSystem.xyToLatLng(x, y, centerLatLng);
        
        // 计算六边形的顶点
        const vertices = this.coordSystem.calculateHexagonVertices(point, hexRadius);
        
        // 添加六边形并显示编号
        const hexagon = this.renderer.addHexagon(point, hexRadius, hexId, hexCoords, vertices);
        
        // 添加到结果数组
        hexagons.push(hexagon);
        
        // 存储坐标和索引的映射
        // 使用与 hexId 相同的 p*n* 格式作为键
        hexagonCoords[hexId] = hexId;
      }
    }
    
    console.timeEnd('Generating hexagon grid');
    console.log(`Generated ${hexagons.length} hexagons`);
    
    return { hexagons, hexagonCoords };
  }


  // 移除了序列化和反序列化相关方法
}

export default HexagonGridGenerator;
