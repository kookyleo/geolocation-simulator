/**
 * GridManager 类 - 负责管理六边形网格配置
 */
class GridManager {
  constructor(hexagonGridLayer) {
    this.hexagonGridLayer = hexagonGridLayer;
    this.grids = [];
    this.loadGridsFromLocalStorage();
    
    // 初始化UI元素
    this.manageGridsBtn = document.getElementById('manageGrids');
    
    // 绑定事件处理器
    this._setupEventListeners();
  }
  
  /**
   * 设置事件监听器
   * @private
   */
  _setupEventListeners() {
    // 管理网格按钮
    this.manageGridsBtn.addEventListener('click', () => this.openGridManager());
    
    // 关闭网格管理器
    const closeBtn = document.getElementById('closeGridsManageModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeGridManager());
    }
    
    // 添加新网格
    const addBtn = document.getElementById('addNewGrid');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.createNewGrid());
    }
    
    // 导入网格按钮
    const importBtn = document.getElementById('importGridsButton');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importGrids());
    }
    
    // 导出网格按钮
    const exportBtn = document.getElementById('exportGridsButton');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportGrids());
    }
  }
  
  /**
   * 从localStorage加载网格配置
   */
  loadGridsFromLocalStorage() {
    try {
      const savedGrids = localStorage.getItem('hexagonGrids');
      if (savedGrids) {
        this.grids = JSON.parse(savedGrids);
      }
    } catch (error) {
      console.error('加载网格配置失败:', error);
      this.grids = [];
    }
  }
  
  /**
   * 保存网格配置到localStorage
   */
  saveGridsToLocalStorage() {
    try {
      localStorage.setItem('hexagonGrids', JSON.stringify(this.grids));
    } catch (error) {
      console.error('保存网格配置失败:', error);
    }
  }
  
  /**
   * 创建新的网格配置
   */
  createNewGrid() {
    // 如果有地图和六边形网格图层，使用当前地图中心作为默认值
    let centerLat = 39.9042;
    let centerLng = 116.4074;
    
    if (this.hexagonGridLayer && this.hexagonGridLayer.map) {
      const mapCenter = this.hexagonGridLayer.map.getCenter();
      centerLat = mapCenter.lat;
      centerLng = mapCenter.lng;
    }
    
    const newGrid = {
      name: `网格 ${this.grids.length + 1}`,
      latitude: centerLat,
      longitude: centerLng,
      areaRadius: 5000,
      gridRadius: 500,
      mergeAreas: [],
      enabled: true
    };
    
    // 将新网格添加到数组开头
    this.grids.unshift(newGrid);
    this.saveGridsToLocalStorage();
    
    // 重新渲染网格列表，并标记新网格的索引
    this.renderGrids(0);
    
    // 应用新创建的网格
    this.applyGrid(0);
  }
  
  /**
   * 删除网格配置
   * @param {number} index - 网格索引
   */
  deleteGrid(index) {
    if (index >= 0 && index < this.grids.length) {
      if (confirm('确定要删除这个网格配置吗？')) {
        // 如果当前正在显示该网格，先隐藏它
        if (this.hexagonGridLayer && this.hexagonGridLayer.visible) {
          this.hexagonGridLayer.hideGrid();
        }
        
        this.grids.splice(index, 1);
        this.saveGridsToLocalStorage();
        
        // 重新渲染网格列表
        this.renderGrids();
        
        console.log(`已删除网格配置，当前剩余 ${this.grids.length} 个网格`);
      }
    }
  }
  

  
  /**
   * 应用网格配置到地图
   * @param {number} index - 网格索引
   */
  applyGrid(index) {
    if (index >= 0 && index < this.grids.length) {
      const grid = this.grids[index];
      
      // 应用网格配置到地图
      if (this.hexagonGridLayer) {
        // 隐藏当前网格（如果有）
        if (this.hexagonGridLayer.visible) {
          this.hexagonGridLayer.hideGrid();
        }
        
        // 设置新的网格参数
        this.hexagonGridLayer.setGridOptions({
          center: [grid.latitude, grid.longitude],
          radius: grid.gridRadius,
          areaRadius: grid.areaRadius
        });
        
        // 如果有合并区域配置，设置合并配置
        if (grid.mergeAreas && grid.mergeAreas.length > 0) {
          this.hexagonGridLayer.mergeConfig = grid.mergeAreas;
        } else {
          this.hexagonGridLayer.mergeConfig = [];
        }
        
        // 显示网格
        this.hexagonGridLayer.showGrid();
        
        console.log(`已应用网格配置: ${grid.name}`);
      }
    }
  }
  

  
  /**
   * 渲染单个网格卡片
   * @param {Object} grid - 网格配置对象
   * @param {number} index - 网格索引
   */
  renderGridCard(grid, index) {
    // 检查是否已存在卡片，如果存在则更新内容
    let card = document.querySelector(`.grid-card[data-index="${index}"]`);
    
    if (!card) {
      // 创建新卡片
      card = document.createElement('div');
      card.className = 'grid-card';
      card.dataset.index = index;
      this.gridsContainer.appendChild(card);
    }
    
    // 判断是否处于编辑模式
    const isEditMode = card.classList.contains('edit-mode');
    
    if (isEditMode) {
      // 编辑模式 - 显示JSON编辑器
      card.innerHTML = `
        <div class="grid-card-header">
          <h3>${grid.name}</h3>
          <button class="grid-card-delete" title="删除网格"><i class="fas fa-trash"></i></button>
        </div>
        <div class="grid-card-content">
          <textarea class="grid-json-editor">${JSON.stringify(grid, null, 2)}</textarea>
          <div class="grid-card-actions">
            <button class="grid-btn grid-card-edit" title="完成编辑"><i class="fas fa-check"></i> 完成</button>
            <button class="grid-btn grid-card-apply" title="应用到地图"><i class="fas fa-map-marker-alt"></i> 应用</button>
          </div>
        </div>
      `;
    } else {
      // 展示模式 - 显示格式化的字段
      const mergeAreasDisplay = grid.mergeAreas && grid.mergeAreas.length > 0 
        ? `<div class="grid-field"><span>连续区域:</span> ${grid.mergeAreas.length}个区域</div>`
        : `<div class="grid-field"><span>连续区域:</span> 无</div>`;
        
      card.innerHTML = `
        <div class="grid-card-header">
          <h3>${grid.name}</h3>
          <button class="grid-card-delete" title="删除网格"><i class="fas fa-trash"></i></button>
        </div>
        <div class="grid-card-content">
          <div class="grid-field"><span>纬度:</span> ${grid.latitude}</div>
          <div class="grid-field"><span>经度:</span> ${grid.longitude}</div>
          <div class="grid-field"><span>区域半径:</span> ${grid.areaRadius}米</div>
          <div class="grid-field"><span>网格半径:</span> ${grid.gridRadius}米</div>
          ${mergeAreasDisplay}
          <div class="grid-card-actions">
            <button class="grid-btn grid-card-edit" title="编辑网格"><i class="fas fa-edit"></i> 编辑</button>
            <button class="grid-btn grid-card-apply" title="应用到地图"><i class="fas fa-map-marker-alt"></i> 应用</button>
          </div>
        </div>
      `;
    }
  }
  
  /**
   * 打开网格管理器
   */
  openGridManager() {
    const modal = document.getElementById('manageGridsModal');
    if (modal) {
      modal.style.display = 'block';
      this.renderGrids();
    }
  }
  
  /**
   * 关闭网格管理器
   */
  closeGridManager() {
    const modal = document.getElementById('manageGridsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  /**
   * 渲染网格列表
   */
  renderGrids(newGridIndex = -1) {
    const container = document.getElementById('gridsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 导入JSON5支持模块
    import('../js/json5-support.js').then(({ createJSON5Editor }) => {
      this.grids.forEach((grid, index) => {
        // 创建简化的卡片结构
        const card = document.createElement('div');
        card.className = 'grid-card' + (index === newGridIndex ? ' new' : '');
        card.dataset.index = index;
        
        // 创建按钮区域
        const buttons = document.createElement('div');
        buttons.className = 'grid-card-buttons';
        buttons.innerHTML = `
          <div class="switch-group">
            <span class="label-text">display</span>
            <input type="checkbox" class="grid-switch" id="grid-switch-${index}" ${grid.enabled ? 'checked' : ''}>
          </div>
          <div class="action-group">
            <button class="edit-btn" title="编辑网格"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" title="删除网格"><i class="fas fa-trash-alt"></i></button>
          </div>
        `;
        
        // 绑定事件
        const gridSwitch = buttons.querySelector('.grid-switch');
        const labelText = buttons.querySelector('.label-text');

        // 为label文本添加点击事件，模拟label功能
        labelText.addEventListener('click', () => {
          gridSwitch.click();
        });

        gridSwitch.addEventListener('change', () => {
          const isEnabled = gridSwitch.checked;
          this.grids[index].enabled = isEnabled;
          this.saveGridsToLocalStorage();

          if (isEnabled) {
            this.applyGrid(index);
          } else if (this.hexagonGridLayer) {
            this.hexagonGridLayer.hideGrid();
          }
        });
        
        // 创建编辑器容器
        const editorContainer = document.createElement('div');
        editorContainer.className = 'json-editor-container grid-card-content';
        // editorContainer.style.width = '100%';
        editorContainer.style.minHeight = '150px';
        editorContainer.style.overflow = 'visible';
        editorContainer.style.position = 'relative';
        editorContainer.style.flex = '1';
        
        // 添加到卡片
        card.appendChild(buttons); // 按钮现在是绝对定位的，会浮动在右上角
        card.appendChild(editorContainer);
        container.appendChild(card);
        
        // 绑定按钮事件
        const editBtn = buttons.querySelector('.edit-btn');
        const deleteBtn = buttons.querySelector('.delete-btn');
        
        gridSwitch.addEventListener('change', () => {
          const isEnabled = gridSwitch.checked;
          this.grids[index].enabled = isEnabled;
          this.saveGridsToLocalStorage();
          
          if (isEnabled) {
            this.applyGrid(index);
          } else if (this.hexagonGridLayer && this.hexagonGridLayer.visible) {
            this.hexagonGridLayer.hideGrid();
          }
        });
        
        // 初始化编辑器
        window.monacoHelpers.waitForMonaco().then(() => {
          // 创建 JSON5 编辑器
          const json5Editor = createJSON5Editor(editorContainer, {
            value: JSON.stringify(grid, null, 2),
            readOnly: true,
            fontSize: 12,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false
          });
          
          // 绑定编辑按钮事件
          editBtn.addEventListener('click', () => {
            // 切换编辑状态
            const isEditing = editBtn.classList.contains('editing');
            const cardContent = editorContainer.closest('.grid-card-content');
            if (isEditing) {
              // 保存编辑
              try {
                const updatedGrid = JSON.parse(json5Editor.getValue());
                this.grids[index] = updatedGrid;
                this.saveGridsToLocalStorage();
                editBtn.classList.remove('editing');
                cardContent?.classList.remove('editing');
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.title = '编辑网格';
                json5Editor.editor?.updateOptions?.({ readOnly: true });
              } catch (error) {
                console.error('解析JSON失败:', error);
              }
            } else {
              // 进入编辑模式
              editBtn.classList.add('editing');
              cardContent?.classList.add('editing');
              editBtn.innerHTML = '<i class="fas fa-save"></i>';
              editBtn.title = '保存网格';
              json5Editor.editor?.updateOptions?.({ readOnly: false });
            }
          });
        }).catch(error => {
          console.error('Monaco 编辑器加载失败:', error);
          
          // 如果 Monaco 加载失败，使用普通文本区域作为后备
          const textarea = document.createElement('textarea');
          textarea.className = 'json-editor';
          textarea.value = JSON.stringify(grid, null, 2);
          // textarea.style.width = '100%';
          textarea.style.minHeight = '150px';
          textarea.style.fontFamily = 'monospace';
          textarea.style.padding = '8px';
          textarea.style.boxSizing = 'border-box';
          textarea.readOnly = true;
          
          editorContainer.appendChild(textarea);
          
          // 绑定编辑按钮事件
          editBtn.addEventListener('click', () => {
            // 切换编辑状态
            const isEditing = editBtn.classList.contains('editing');
            const cardContent = editorContainer.closest('.grid-card-content');
            if (isEditing) {
              // 保存编辑
              try {
                const updatedGrid = JSON.parse(textarea.value);
                this.grids[index] = updatedGrid;
                this.saveGridsToLocalStorage();
                editBtn.classList.remove('editing');
                cardContent?.classList.remove('editing');
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.title = '编辑网格';
                textarea.readOnly = true;
              } catch (error) {
                console.error('解析JSON失败:', error);
              }
            } else {
              // 进入编辑模式
              editBtn.classList.add('editing');
              cardContent?.classList.add('editing');
              editBtn.innerHTML = '<i class="fas fa-save"></i>';
              editBtn.title = '保存网格';
              textarea.readOnly = false;
            }
          });
        });
        
        deleteBtn.addEventListener('click', () => this.deleteGrid(index));
      });
    }).catch(error => {
      console.error('JSON5 支持模块加载失败:', error);
      // 如果加载失败，使用原始的渲染方式
      this._renderGridsWithFallback(container);
    });
  }
  
  /**
   * 备用的网格渲染方法（当JSON5支持模块加载失败时使用）
   * @private
   */
  _renderGridsWithFallback(container) {
    this.grids.forEach((grid, index) => {
      // 创建简化的卡片结构
      const card = document.createElement('div');
      card.className = 'grid-card';
      card.dataset.index = index;
      
      // 创建按钮区域
      const buttons = document.createElement('div');
      buttons.className = 'grid-card-buttons';
      buttons.innerHTML = `
        <div class="switch-container">
          <label class="switch">
            <input type="checkbox" class="grid-switch" ${grid.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <span class="switch-label">${grid.enabled ? '启用' : '禁用'}</span>
        </div>
        <button class="edit-btn">edit</button>
        <button class="delete-btn">delete</button>
      `;
      
      // 创建编辑器容器
      const editorContainer = document.createElement('div');
      editorContainer.className = 'json-editor-container';
      // editorContainer.style.width = '100%';
      editorContainer.style.minHeight = '150px';
      editorContainer.style.overflow = 'visible';
      editorContainer.style.position = 'relative';
      editorContainer.style.flex = '1';
      
      // 创建文本区域
      const textarea = document.createElement('textarea');
      textarea.className = 'json-editor';
      textarea.value = JSON.stringify(grid, null, 2);
      // textarea.style.width = '100%';
      textarea.style.minHeight = '150px';
      textarea.style.fontFamily = 'monospace';
      textarea.style.padding = '8px';
      textarea.style.boxSizing = 'border-box';
      
      editorContainer.appendChild(textarea);
      
      // 添加到卡片
      card.appendChild(buttons); // 按钮现在是绝对定位的，会浮动在右上角
      card.appendChild(editorContainer);
      container.appendChild(card);
      
      // 绑定按钮事件
      const gridSwitch = buttons.querySelector('.grid-switch');
      const switchLabel = buttons.querySelector('.switch-label');
      const editBtn = buttons.querySelector('.edit-btn');
      const deleteBtn = buttons.querySelector('.delete-btn');
      
      gridSwitch.addEventListener('change', () => {
        const isEnabled = gridSwitch.checked;
        this.grids[index].enabled = isEnabled;
        switchLabel.textContent = isEnabled ? '启用' : '禁用';
        this.saveGridsToLocalStorage();
        
        if (isEnabled) {
          this.applyGrid(index);
        } else if (this.hexagonGridLayer && this.hexagonGridLayer.visible) {
          this.hexagonGridLayer.hideGrid();
        }
      });
      
      editBtn.addEventListener('click', () => {
        // 切换编辑状态
        const isEditing = editBtn.classList.contains('editing');
        if (isEditing) {
          // 保存编辑
          try {
            const updatedGrid = JSON.parse(textarea.value);
            this.grids[index] = updatedGrid;
            this.saveGridsToLocalStorage();
            editBtn.classList.remove('editing');
            editBtn.textContent = 'edit';
            textarea.readOnly = true;
          } catch (error) {
            console.error('解析JSON失败:', error);
          }
        } else {
          // 进入编辑模式
          editBtn.classList.add('editing');
          editBtn.textContent = 'save';
          textarea.readOnly = false;
        }
      });
      
      deleteBtn.addEventListener('click', () => this.deleteGrid(index));
      
      // 默认设置为只读
      textarea.readOnly = true;
    });
  }
  /**
   * 导出网格配置
   */
  exportGrids() {
    if (this.grids.length === 0) {
      alert('没有可导出的网格配置');
      return;
    }
    
    const jsonData = JSON.stringify(this.grids, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hexagon_grids.json';
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  /**
   * 导入网格配置
   */
  importGrids() {
    // 创建一个临时的文件输入元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      // 检查文件类型
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('请选择JSON文件');
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          if (!Array.isArray(importedData)) {
            alert('导入的数据格式无效');
            return;
          }
          
          // 验证每个网格对象的格式
          const validGrids = importedData.filter(grid => {
            return grid && 
                   typeof grid.name === 'string' && 
                   typeof grid.latitude === 'number' && 
                   typeof grid.longitude === 'number' &&
                   typeof grid.areaRadius === 'number' &&
                   typeof grid.gridRadius === 'number';
          });
          
          if (validGrids.length === 0) {
            alert('导入的数据中没有有效的网格配置');
            return;
          }
          
          // 确认导入
          if (confirm(`将导入 ${validGrids.length} 个网格配置，是否继续？`)) {
            // 合并网格配置
            this.grids = [...validGrids, ...this.grids];
            this.saveGridsToLocalStorage();
            this.renderGrids();
            alert('网格配置导入成功');
          }
        } catch (error) {
          console.error('解析JSON失败:', error);
          alert('文件解析失败，请确保是有效的JSON文件');
        }
      };
      
      reader.onerror = () => {
        alert('读取文件失败');
      };
      
      reader.readAsText(file);
    });
    
    // 触发文件选择对话框
    input.click();
  }
}

export default GridManager;
