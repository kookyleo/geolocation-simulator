/**
 * HexagonMergeManager 类 - 负责处理六边形网格的合并
 */
class HexagonMergeManager {
  constructor(gridLayer) {
    this.gridLayer = gridLayer;
    this.mergeConfig = []; // 存储需要合并的相邻对
  }

  /**
   * 设置合并配置
   * @param {Array} adjacentPairs - 相邻对数组，每对包含两个网格 ID
   */
  setMergeConfig(adjacentPairs) {
    if (!adjacentPairs || adjacentPairs.length === 0) {
      console.log('No adjacent pairs configuration provided');
      this.mergeConfig = [];
      return;
    }
    
    console.log(`Setting merge configuration... Total: ${adjacentPairs.length}`);
    this.mergeConfig = [...adjacentPairs];
  }
  
  /**
   * 预处理六边形合并关系
   * @param {Array} hexagons - 六边形数组
   * @returns {Object} 包含合并信息的对象
   */
  /**
   * 确保使用统一的 p*n* 格式的ID
   * 标准格式: p0p0, n1p2 (前缀 + 数字 + 前缀 + 数字)
   */
  convertLegacyId(id) {
    // 保持内部使用 q,r 格式
    // 如果是 p*n* 格式，转换为 q,r 格式
    if (/^[pn]\d+[pn]\d+$/.test(id)) {
      const match = id.match(/^([pn])(\d+)([pn])(\d+)$/);
      if (match) {
        const [, qPrefix, qAbs, rPrefix, rAbs] = match;
        const q = qPrefix === 'p' ? Number(qAbs) : -Number(qAbs);
        const r = rPrefix === 'p' ? Number(rAbs) : -Number(rAbs);
        return `${q},${r}`;
      }
    }
    
    // 如果已经是 q,r 格式，直接返回
    if (id.includes(',')) {
      return id;
    }
    
    // 如果不是上述两种格式，返回原始ID
    console.log(`Unable to parse ID: ${id}`);
    return id;
  }
  
  preprocessMergeRelations(hexagons) {
    if (!this.mergeConfig || this.mergeConfig.length === 0) {
      console.log('No merge configuration, skipping preprocessing');
      return { mergeInfo: {} };
    }
    
    console.log(`Preprocessing merge relations... Total groups: ${this.mergeConfig.length}`);
    
    // 创建六边形ID到对象的映射，加快查找
    const hexagonMap = new Map();
    hexagons.forEach(hex => {
      if (hex.polygon) {
        hexagonMap.set(hex.id, hex);
      }
    });
    
    // 预先计算所有六边形的圆心
    const hexCenters = this._precomputeHexagonCenters(hexagons.filter(h => h.polygon));
    
    // 创建合并信息对象
    const mergeInfo = {};
    
    // 处理每个合并组
    this.mergeConfig.forEach(group => {
      // 处理组内所有可能的相邻关系
      for (let i = 0; i < group.length; i++) {
        for (let j = 0; j < group.length; j++) {
          if (i === j) continue; // 跳过自身
          
          const id1Raw = group[i];
          const id2Raw = group[j];
          
          // 确保使用 p*n* 格式的 ID
          const id1 = this.convertLegacyId(id1Raw);
          const id2 = this.convertLegacyId(id2Raw);
          
          console.log(`Checking possible adjacent pair: [${id1Raw}${id1Raw !== id1 ? ' -> ' + id1 : ''}, ${id2Raw}${id2Raw !== id2 ? ' -> ' + id2 : ''}]`);
          
          // 获取两个六边形
          const hexagon1 = hexagonMap.get(id1);
          const hexagon2 = hexagonMap.get(id2);
          
          if (!hexagon1 || !hexagon2) {
            console.log(`Cannot find hexagon ${!hexagon1 ? id1 : id2}, skipping this pair`);
            continue;
          }
          
          // 获取六边形的顶点坐标
          const vertices1 = hexagon1.polygon.getLatLngs()[0];
          const vertices2 = hexagon2.polygon.getLatLngs()[0];
          
          // 获取六边形的圆心
          const hexCenter1 = hexCenters.get(id1);
          const hexCenter2 = hexCenters.get(id2);
          
          if (!hexCenter1 || !hexCenter2) {
            console.log(`Cannot get center for hexagon ${!hexCenter1 ? id1 : id2}, skipping this pair`);
            continue;
          }
          
          // 检测相邻边并记录信息
          const edgeInfo = this._detectAdjacentEdgesPreprocess(
            vertices1, 
            vertices2, 
            hexCenter1, 
            hexCenter2, 
            id1, 
            id2
          );
          
          if (edgeInfo) {
            // 将边缘信息添加到合并信息中
            if (!mergeInfo[id1]) mergeInfo[id1] = [];
            if (!mergeInfo[id2]) mergeInfo[id2] = [];
            
            mergeInfo[id1].push({ edge: edgeInfo.edge1, neighborId: id2 });
            mergeInfo[id2].push({ edge: edgeInfo.edge2, neighborId: id1 });
          }
        }
      }
    });
    
    console.log(`Preprocessing complete, found ${Object.keys(mergeInfo).length} hexagons to merge`);
    return { mergeInfo };
  }
  
  /**
   * 应用合并信息到六边形
   * @param {Object} hexagon - 六边形对象
   * @param {Map} mergeInfo - 合并信息映射
   */
  applyMergeInfo(hexagon, mergeInfo) {
    if (!hexagon) {
      console.error(`Error: Attempting to apply merge info to null hexagon object`);
      return;
    }
    
    if (!mergeInfo || !mergeInfo[hexagon.id]) {
      console.log(`Hexagon ${hexagon.id} has no merge info, skipping`);
      return;
    }
    
    console.log(`Starting to apply merge info to hexagon ${hexagon.id}`);
    const edgeInfoList = mergeInfo[hexagon.id];
    console.log(`Merge info list:`, JSON.stringify(edgeInfoList));
    
    // 检查合并信息是否有效
    if (!Array.isArray(edgeInfoList) || edgeInfoList.length === 0) {
      console.log(`Hexagon ${hexagon.id} has empty or invalid merge info list`);
      return;
    }
    
    // 初始化边缘信息数组（如果不存在）
    if (!hexagon.edgeInfo) {
      console.log(`Initializing edge info array for hexagon ${hexagon.id}`);
      hexagon.edgeInfo = [];
      for (let i = 0; i < 6; i++) {
        hexagon.edgeInfo.push({ visible: true, neighborId: null });
      }
    }
    
    // 输出应用前的边缘可见性状态
    console.log(`Edge states before applying:`, hexagon.edgeInfo.map((info, idx) => 
      `Edge${idx}: ${info.visible === true ? 'visible' : 'hidden'}${info.neighborId ? ', neighbor: ' + info.neighborId : ''}`
    ));
    
    // 标记需要隐藏的边
    edgeInfoList.forEach(info => {
      // 检查边缘索引是否有效
      if (info.edge < 0 || info.edge >= hexagon.edgeInfo.length) {
        console.error(`Error: Edge index ${info.edge} out of range for hexagon ${hexagon.id}`);
        return;
      }
      
      console.log(`Marking edge ${info.edge} of hexagon ${hexagon.id} as hidden, neighbor: ${info.neighborId}`);
      hexagon.edgeInfo[info.edge].visible = false;  // 显式设置为false
      hexagon.edgeInfo[info.edge].neighborId = info.neighborId;
    });
    
    // 输出应用后的边缘可见性状态
    console.log(`Edge states after applying:`, hexagon.edgeInfo.map((info, idx) => 
      `Edge${idx}: ${info.visible === true ? 'visible' : 'hidden'}${info.neighborId ? ', neighbor: ' + info.neighborId : ''}`
    ));
    
    // 重新创建六边形，只显示可见的边
    console.log(`Recreating hexagon ${hexagon.id} to show only visible edges`);
    this.gridLayer.renderer.recreateHexagonWithVisibleEdges(hexagon);
  }
  
  /**
   * 合并相邻六边形网格
   * @param {Array} adjacentPairs - 相邻对数组，每对包含两个网格 ID
   */
  mergeAdjacentHexagons(adjacentPairs) {
    if (!this.gridLayer.gridLayer) {
      console.log('Merge adjacent hexagons stage: grid layer does not exist, cannot merge hexagons');
      return;
    }
    
    // 设置合并配置
    this.setMergeConfig(adjacentPairs);
    
    // 输出当前所有六边形的ID
    console.log('Merge adjacent hexagons stage: current hexagon IDs:', this.gridLayer.hexagons.map(h => h.id));
    
    // 如果没有提供相邻对，直接返回
    if (!adjacentPairs || adjacentPairs.length === 0) {
      console.log('Merge adjacent hexagons stage: no adjacent pairs provided, skipping');
      return;
    }
    
    console.log(`Merge adjacent hexagons stage: processing pre-defined adjacent pairs... 共 ${adjacentPairs.length} 个`);
    
    // 创建六边形ID到对象的映射，加快查找
    const hexagonMap = new Map();
    this.gridLayer.allHexagons.forEach(hex => {
      if (hex.polygon) {
        hexagonMap.set(hex.id, hex);
      }
    });
    
    // 预先计算所有六边形的圆心
    const hexCenters = this._precomputeHexagonCenters(this.gridLayer.allHexagons.filter(h => h.polygon));
    
    // 只处理指定的相邻对
    adjacentPairs.forEach(pair => {
      const [id1, id2] = pair;
      console.log(`Merge adjacent hexagons stage: processing adjacent pair: [${id1}, ${id2}]`);
      
      // 获取两个六边形
      const hexagon1 = hexagonMap.get(id1);
      const hexagon2 = hexagonMap.get(id2);
      
      if (!hexagon1 || !hexagon2) {
        console.log(`Cannot find hexagon ${!hexagon1 ? id1 : id2}, skipping this pair`);
        return;
      }
      
      // 获取六边形的顶点坐标
      const vertices1 = hexagon1.polygon.getLatLngs()[0];
      const vertices2 = hexagon2.polygon.getLatLngs()[0];
      
      // 获取六边形的圆心
      const hexCenter1 = hexCenters.get(id1);
      const hexCenter2 = hexCenters.get(id2);
      
      if (!hexCenter1 || !hexCenter2) {
        console.log(`Cannot get center for hexagon ${!hexCenter1 ? id1 : id2}, skipping this pair`);
        return;
      }
      
      // 检测相邻边
      const adjacentEdges = this._detectAdjacentEdges(
        hexagon1, 
        hexagon2, 
        vertices1, 
        vertices2, 
        hexCenter1, 
        hexCenter2, 
        id1, 
        id2
      );
      
      // 如果找到相邻边，将其标记为不可见
      if (adjacentEdges) {
        const { edge1, edge2 } = adjacentEdges;
        
        // 将边缘标记为不可见
        if (!mergeInfo[id1]) mergeInfo[id1] = [];
        if (!mergeInfo[id2]) mergeInfo[id2] = [];
        
        mergeInfo[id1].push({ edge: edge1, neighborId: id2 });
        mergeInfo[id2].push({ edge: edge2, neighborId: id1 });
        
        console.log(`Preprocessing stage: marking edge ${edge1} of hexagon ${id1} and edge ${edge2} of hexagon ${id2} as hidden`);
      }
    });
    
    console.log(`Adjacent hexagon grid merge completed, processed ${this.gridLayer.allHexagons.length} hexagons`);
  }

  /**
   * 预计算所有六边形的圆心
   * @private
   */
  _precomputeHexagonCenters(hexagons) {
    const hexCenters = new Map();
    hexagons.forEach(hex => {
      const vertices = hex.polygon.getLatLngs()[0];
      const center = L.latLng(
        vertices.reduce((sum, v) => sum + v.lat, 0) / vertices.length,
        vertices.reduce((sum, v) => sum + v.lng, 0) / vertices.length
      );
      hexCenters.set(hex.id, center);
    });
    return hexCenters;
  }

  /**
   * 预处理检测相邻边，只返回边的索引信息，不进行实际的样式修改
   * @private
   */
  _detectAdjacentEdgesPreprocess(vertices1, vertices2, hexCenter1, hexCenter2, hexId1, hexId2) {
    // 计算外接圆半径的 0.9 倍
    const searchRadius = this.gridLayer.radius * 0.9;
    console.log(`Preprocessing stage: adjacent edge detection - search radius: ${searchRadius} meters`);
    
    // 找出第一个六边形中与这条线最近的边
    let closestEdge1 = -1;
    let minDistance1 = Number.MAX_VALUE;
      
    for (let i = 0; i < vertices1.length; i++) {
      const nextIndex = (i + 1) % vertices1.length;
      const edgeMidpoint = L.latLng(
        (vertices1[i].lat + vertices1[nextIndex].lat) / 2,
        (vertices1[i].lng + vertices1[nextIndex].lng) / 2
      );
      
      // 计算边的中点到圆心的距离
      const distToCenter = edgeMidpoint.distanceTo(hexCenter1);
      
      // 计算边的中点到相邻六边形圆心的距离
      const distToNeighborCenter = edgeMidpoint.distanceTo(hexCenter2);
      
      // 如果这条边在两个圆心之间，则它可能是共享边
      if (distToCenter < searchRadius && distToNeighborCenter < searchRadius) {
        // 计算边的中点到两个圆心连线的垂直距离
        const dx = hexCenter2.lng - hexCenter1.lng;
        const dy = hexCenter2.lat - hexCenter1.lat;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // 计算垂直距离
        const perpDistance = Math.abs((dy * (edgeMidpoint.lng - hexCenter1.lng) - dx * (edgeMidpoint.lat - hexCenter1.lat)) / length);
        
        console.log(`Preprocessing stage: hexagon ${hexId1} edge ${i} perpendicular distance: ${perpDistance.toFixed(2)} meters`);
        
        if (perpDistance < minDistance1) {
          minDistance1 = perpDistance;
          closestEdge1 = i;
        }
      }
    }
    
    // 找出第二个六边形中与这条线最近的边
    let closestEdge2 = -1;
    let minDistance2 = Number.MAX_VALUE;
    
    for (let j = 0; j < vertices2.length; j++) {
      const neighborNextIndex = (j + 1) % vertices2.length;
      const neighborEdgeMidpoint = L.latLng(
        (vertices2[j].lat + vertices2[neighborNextIndex].lat) / 2,
        (vertices2[j].lng + vertices2[neighborNextIndex].lng) / 2
      );
      
      // 计算边的中点到圆心的距离
      const distToCenter = neighborEdgeMidpoint.distanceTo(hexCenter2);
      
      // 计算边的中点到相邻六边形圆心的距离
      const distToHexCenter = neighborEdgeMidpoint.distanceTo(hexCenter1);
      
      // 如果这条边在两个圆心之间，则它可能是共享边
      if (distToCenter < searchRadius && distToHexCenter < searchRadius) {
        // 计算边的中点到两个圆心连线的垂直距离
        const dx = hexCenter1.lng - hexCenter2.lng;
        const dy = hexCenter1.lat - hexCenter2.lat;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // 计算垂直距离 - 修正计算错误
        const perpDistance = Math.abs((dy * (neighborEdgeMidpoint.lng - hexCenter2.lng) - dx * (neighborEdgeMidpoint.lat - hexCenter2.lat)) / length);
        
        console.log(`Preprocessing stage: hexagon ${hexId2} edge ${j} perpendicular distance: ${perpDistance.toFixed(2)} meters`);
        
        if (perpDistance < minDistance2) {
          minDistance2 = perpDistance;
          closestEdge2 = j;
        }
      }
    }
    
    // 如果找到了两个最近的边，则返回边的索引信息
    if (closestEdge1 >= 0 && closestEdge2 >= 0) {
      const i = closestEdge1;
      const nextIndex = (i + 1) % vertices1.length;
      const j = closestEdge2;
      const neighborNextIndex = (j + 1) % vertices2.length;
      
      console.log(`Preprocessing stage: discovered adjacent edge! Hexagon ${hexId1} edge ${i}->${nextIndex} with hexagon ${hexId2} edge ${j}->${neighborNextIndex}`);
      console.log(`Minimum perpendicular distances: Hexagon ${hexId1} edge ${i} = ${minDistance1.toFixed(2)}, Hexagon ${hexId2} edge ${j} = ${minDistance2.toFixed(2)}`);
      
      return { edge1: i, edge2: j };
    }
    
    console.log(`Preprocessing stage: no adjacent edge found between hexagons ${hexId1} and ${hexId2}`);
    return null;
  }
  
  /**
   * 检测两个六边形之间的相邻边
   * @private
   */
  _detectAdjacentEdges(hexagon, neighborHex, vertices, neighborVertices, hexCenter, neighborCenter, hexId, neighborId) {
    // 计算外接圆半径的 0.9 倍
    const searchRadius = this.gridLayer.radius * 0.9;
    console.log(`Detection stage: search radius: ${searchRadius.toFixed(2)} meters`);
    
    // 找出第一个六边形中与这条线最近的边
    let closestEdge1 = -1;
    let minDistance1 = Number.MAX_VALUE;
      
    for (let i = 0; i < vertices.length; i++) {
      const nextIndex = (i + 1) % vertices.length;
      const edgeMidpoint = L.latLng(
        (vertices[i].lat + vertices[nextIndex].lat) / 2,
        (vertices[i].lng + vertices[nextIndex].lng) / 2
      );
      
      // 计算边的中点到圆心的距离
      const distToCenter = edgeMidpoint.distanceTo(hexCenter);
      
      // 计算边的中点到相邻六边形圆心的距离
      const distToNeighborCenter = edgeMidpoint.distanceTo(neighborCenter);
      
      // 如果这条边在两个圆心之间，则它可能是共享边
      if (distToCenter < searchRadius && distToNeighborCenter < searchRadius) {
        // 计算边的中点到两个圆心连线的垂直距离
        const dx = neighborCenter.lng - hexCenter.lng;
        const dy = neighborCenter.lat - hexCenter.lat;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // 计算垂直距离
        const perpDistance = Math.abs((dy * (edgeMidpoint.lng - hexCenter.lng) - dx * (edgeMidpoint.lat - hexCenter.lat)) / length);
        
        if (perpDistance < minDistance1) {
          minDistance1 = perpDistance;
          closestEdge1 = i;
        }
      }
    }
    
    // 找出第二个六边形中与这条线最近的边
    let closestEdge2 = -1;
    let minDistance2 = Number.MAX_VALUE;
    
    for (let j = 0; j < neighborVertices.length; j++) {
      const neighborNextIndex = (j + 1) % neighborVertices.length;
      const neighborEdgeMidpoint = L.latLng(
        (neighborVertices[j].lat + neighborVertices[neighborNextIndex].lat) / 2,
        (neighborVertices[j].lng + neighborVertices[neighborNextIndex].lng) / 2
      );
      
      // 计算边的中点到圆心的距离
      const distToCenter = neighborEdgeMidpoint.distanceTo(neighborCenter);
      
      // 计算边的中点到相邻六边形圆心的距离
      const distToHexCenter = neighborEdgeMidpoint.distanceTo(hexCenter);
      
      // 如果这条边在两个圆心之间，则它可能是共享边
      if (distToCenter < searchRadius && distToHexCenter < searchRadius) {
        // 计算边的中点到两个圆心连线的垂直距离
        const dx = hexCenter.lng - neighborCenter.lng;
        const dy = hexCenter.lat - neighborCenter.lat;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // 计算垂直距离
        const perpDistance = Math.abs((dy * (neighborEdgeMidpoint.lng - neighborCenter.lng) - dx * (neighborEdgeMidpoint.lat - neighborCenter.lat)) / length);
        
        if (perpDistance < minDistance2) {
          minDistance2 = perpDistance;
          closestEdge2 = j;
        }
      }
    }
    
    // 如果找到了两个最近的边，则认为它们是相邻的
    if (closestEdge1 >= 0 && closestEdge2 >= 0) {
      const i = closestEdge1;
      const nextIndex = (i + 1) % vertices.length;
      const j = closestEdge2;
      const neighborNextIndex = (j + 1) % neighborVertices.length;
      
      // 发现相邻边
      
      // 设置找到相邻边的标志
      hexagon.foundNeighbor = true;
      
      // 确保两个六边形都有边信息
      this.gridLayer.renderer.ensureHexagonsHaveEdgeInfo(hexagon, neighborHex);
      
      // 标记这两条边为不可见
      this._markEdgesAsInvisible(hexagon, neighborHex, i, j, hexId, neighborId);
      
      // 重新创建两个六边形，只显示可见的边
      this.gridLayer.renderer.recreateHexagonWithVisibleEdges(hexagon);
      this.gridLayer.renderer.recreateHexagonWithVisibleEdges(neighborHex);
    }
  }

  /**
   * 标记边为不可见
   * @private
   */
  _markEdgesAsInvisible(hexagon, neighborHex, i, j, hexId, neighborId) {
    // 确保边缘信息存在
    if (!hexagon.edgeInfo || !neighborHex.edgeInfo) {
      console.error(`Mark edges as invisible stage: edge info arrays do not exist! Hexagon ${hexId} or ${neighborId}`);
      return;
    }

    // 确保索引有效
    if (i < 0 || i >= hexagon.edgeInfo.length || j < 0 || j >= neighborHex.edgeInfo.length) {
      console.error(`Mark edges as invisible stage: edge index out of range! i=${i}, j=${j}, Hexagon ${hexId} edge count=${hexagon.edgeInfo.length}, Hexagon ${neighborId} edge count=${neighborHex.edgeInfo.length}`);
      return;
    }

    // 处理边的可见性
    
    // 标记这两条边为可见，但记录它们是内部边缘（有相邻六边形）
    // 这样渲染器可以根据是否有相邻来决定边的透明度
    hexagon.edgeInfo[i].visible = true;
    hexagon.edgeInfo[i].neighborId = neighborId;
    neighborHex.edgeInfo[j].visible = true;
    neighborHex.edgeInfo[j].neighborId = hexId;
    

  }
}

export default HexagonMergeManager;
