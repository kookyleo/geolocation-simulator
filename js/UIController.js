/**
 * UIController 类 - 负责UI交互和事件处理
 */
class UIController {
  constructor(mapController, locationManager) {
    this.mapController = mapController;
    this.locationManager = locationManager;

    // 保存位置相关元素
    this.saveLocationBtn = document.getElementById('saveLocation');
    this.savedLocationsSelect = document.getElementById('savedLocations');
    this.saveLocationModal = document.getElementById('saveLocationModal');
    this.locationNameInput = document.getElementById('locationName');
    this.confirmSaveBtn = document.getElementById('confirmSave');
    this.cancelSaveBtn = document.getElementById('cancelSave');

    // 信息面板相关元素
    this.infoPanel = document.querySelector('.info-panel');
    this.infoToggle = document.querySelector('.info-toggle');

    // 管理位置相关元素
    this.manageLocationsBtn = document.getElementById('manageLocations');
    this.manageLocationsModal = document.getElementById('manageLocationsModal');
    this.locationsContainer = document.getElementById('locationsContainer');
    this.closeManageModalBtn = document.getElementById('closeManageModal');
    this.addNewLocationBtn = document.getElementById('addNewLocation');
    this.importButton = document.getElementById('importButton');
    this.exportButton = document.getElementById('exportButton');
    this.importInput = document.getElementById('importInput');

    // 保存位置弹窗关闭按钮
    this.closeSaveLocationModalBtn = document.getElementById('closeSaveLocationModal');
    
    // 编辑位置已集成到JSON编辑器中，不再需要单独的编辑模态框

    // 当前编辑的位置索引
    this.currentEditIndex = -1;

    // 初始化事件监听器
    this._setupEventListeners();
    
    // 初始化ESC键关闭模态框功能
    this._setupEscKeyListener();
  }

  /**
   * 设置事件监听器
   * @private
   */
  _setupEventListeners() {
    // 初始化信息面板的收起/展开功能
    this._setupInfoPanelToggle();

    // "保存位置"按钮点击事件
    this.saveLocationBtn.addEventListener('click', () => this.openAddLocationModal());

    // 保存位置模态框的确认按钮
    this.confirmSaveBtn.addEventListener('click', () => {
      const name = this.locationNameInput.value;
      const position = this.mapController.marker.getLatLng();

      if (this.locationManager.saveCurrentLocation(name, position.lat, position.lng)) {
        this.saveLocationModal.style.display = 'none';
        this.locationNameInput.value = '';
      }
    });

    // 保存位置模态框的取消按钮
    this.cancelSaveBtn.addEventListener('click', () => {
      this.saveLocationModal.style.display = 'none';
      this.locationNameInput.value = '';
    });

    // 位置下拉列表变更事件
    this.savedLocationsSelect.addEventListener('change', (e) => {
      const value = e.target.value;

      // 处理“当前物理位置”选项
      if (value === 'current-physical-location') {
        this.mapController.getCurrentRealPosition();
        // 重置选择框
        setTimeout(() => {
          this.savedLocationsSelect.value = '';
        }, 100);
        return;
      }

      // 处理已保存的位置
      const index = parseInt(value);
      if (index >= 0) {
        const location = this.locationManager.useLocation(index);
        if (location) {
          this.mapController.setMapLocation(location.latitude, location.longitude);
        }
      }
    });

    // "管理位置"按钮点击事件
    this.manageLocationsBtn.addEventListener('click', () => {
      this.openLocationManager();
    });

    // 关闭管理位置模态框
    this.closeManageModalBtn.addEventListener('click', () => {
      this.manageLocationsModal.style.display = 'none';
    });

    // 编辑位置已集成到JSON编辑器中

    // 关闭保存位置模态框
    this.closeSaveLocationModalBtn.addEventListener('click', () => {
      this.saveLocationModal.style.display = 'none';
      this.locationNameInput.value = '';
    });

    // "添加新位置"按钮点击事件
    this.addNewLocationBtn.addEventListener('click', () => {
      this.createNewLocation();
    });

    // 编辑位置已集成到JSON编辑器中

    // 编辑位置已集成到JSON编辑器中

    // 导出按钮点击事件
    this.exportButton.addEventListener('click', () => this.exportLocations());

    // 导入按钮点击事件
    this.importButton.addEventListener('click', () => {
      this.importInput.click();
    });

    // 导入文件选择事件
    this.importInput.addEventListener('change', (event) => this.importLocations(event));
  }

  /**
   * 打开添加位置模态框
   */
  openAddLocationModal() {
    // 获取当前位置作为默认名称
    const position = this.mapController.marker.getLatLng();
    const defaultName = `Location (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`;

    // 设置默认名称
    this.locationNameInput.value = defaultName;

    // 显示模态框
    this.saveLocationModal.style.display = 'flex';

    // 聚焦输入框并选中文本
    this.locationNameInput.focus();
    this.locationNameInput.select();
  }

  /**
   * 打开编辑位置
   * @param {number} index - 位置索引
   */
  openEditLocationModal(index) {
    // 编辑功能已集成到JSON编辑器中
    // 这个方法保留仅为了兼容性
    console.log('Please use the edit button in the card to edit');
  }

  /**
   * 保存编辑的位置
   * @deprecated 已集成到JSON编辑器中
   */
  saveEditedLocation() {
    // 编辑功能已集成到JSON编辑器中
    console.log('Please use the edit button in the card to edit');
  }

  /**
   * 打开位置管理器
   */
  openLocationManager() {
    this.manageLocationsModal.style.display = 'flex';
    this.renderLocations();
  }

  /**
   * 关闭位置管理器
   */
  closeLocationManager() {
    this.manageLocationsModal.style.display = 'none';
  }

  /**
   * 创建新位置
   */
  createNewLocation() {
    const newIndex = this.locationManager.createNewLocation(this.mapController);
    this.renderLocations(newIndex);
  }

  /**
   * 渲染位置卡片列表
   * @param {number} newLocationIndex - 新创建的位置索引，用于高亮显示
   */
  renderLocations(newLocationIndex = -1) {
    const container = this.locationsContainer;
    if (!container) return;
    
    container.innerHTML = '';
    const locations = this.locationManager.getSavedLocations();
    
    if (locations.length === 0) {
      // 显示空状态
      container.innerHTML = `
        <div class="empty-state">
          <p>You haven't saved any locations yet</p>
          <button id="addFirstLocation" class="save">Add First Location</button>
        </div>
      `;

      // 添加第一个位置按钮点击事件
      document.getElementById('addFirstLocation').addEventListener('click', () => {
        this.createNewLocation();
      });

      return;
    }
    
    // 导入JSON5支持模块
    import('../js/json5-support.js').then(({ createJSON5Editor }) => {
      locations.forEach((location, index) => {
        // 创建卡片结构
        const card = document.createElement('div');
        card.className = 'grid-card' + (index === newLocationIndex ? ' new' : '');
        card.dataset.index = index;
        
        // 创建按钮区域
        const buttons = document.createElement('div');
        buttons.className = 'grid-card-buttons';
        buttons.innerHTML = `
          <div class="action-group">
            <button class="use-btn" title="Use Location"><i class="fas fa-map-marker-alt"></i></button>
            <button class="edit-btn" title="Edit Location"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" title="Delete Location"><i class="fas fa-trash-alt"></i></button>
          </div>
        `;
        
        // 创建编辑器容器
        const editorContainer = document.createElement('div');
        editorContainer.className = 'json-editor-container grid-card-content';
        editorContainer.style.minHeight = '150px';
        editorContainer.style.overflow = 'visible';
        editorContainer.style.position = 'relative';
        editorContainer.style.flex = '1';
        
        // 添加到卡片
        card.appendChild(buttons);
        card.appendChild(editorContainer);
        container.appendChild(card);
        
        // 添加双击事件监听器
        card.addEventListener('dblclick', (e) => {
          // 防止事件冒泡到editorContainer
          e.stopPropagation();
          // 触发编辑按钮点击
          editBtn.click();
        });
        
        // 绑定按钮事件
        const useBtn = buttons.querySelector('.use-btn');
        const editBtn = buttons.querySelector('.edit-btn');
        const deleteBtn = buttons.querySelector('.delete-btn');
        
        // 使用位置按钮事件
        useBtn.addEventListener('click', () => {
          const location = this.locationManager.useLocation(index);
          if (location) {
            this.mapController.setMapLocation(location.latitude, location.longitude);
            this.closeLocationManager();
          }
        });
        
        // 删除按钮事件
        deleteBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to delete this location?')) {
            if (this.locationManager.deleteLocation(index)) {
              this.renderLocations();
            }
          }
        });
        
        // 初始化编辑器
        window.monacoHelpers.waitForMonaco().then(() => {
          // 创建 JSON5 编辑器
          const json5Editor = createJSON5Editor(editorContainer, {
            value: JSON.stringify(location, null, 2),
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
                const updatedLocation = JSON.parse(json5Editor.getValue());
                if (this.locationManager.editLocation(index, updatedLocation)) {
                  editBtn.classList.remove('editing');
                  cardContent?.classList.remove('editing');
                  editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                  editBtn.title = 'Edit Location';
                  json5Editor.editor?.updateOptions?.({ readOnly: true });
                }
              } catch (error) {
                console.error('Location data format invalid, please check and try again');
                alert('Location data format invalid, please check and try again');
              }
            } else {
              // 进入编辑模式
              editBtn.classList.add('editing');
              cardContent?.classList.add('editing');
              editBtn.innerHTML = '<i class="fas fa-save"></i>';
              editBtn.title = 'Save Location';
              json5Editor.editor?.updateOptions?.({ readOnly: false });
            }
          });
        }).catch(error => {
          console.error('Monaco Editor load failed:', error);
          
          // 如果 Monaco 加载失败，使用普通文本区域作为后备
          const textarea = document.createElement('textarea');
          textarea.className = 'json-editor';
          textarea.value = JSON.stringify(location, null, 2);
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
                const updatedLocation = JSON.parse(textarea.value);
                if (this.locationManager.editLocation(index, updatedLocation)) {
                  editBtn.classList.remove('editing');
                  cardContent?.classList.remove('editing');
                  editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                  editBtn.title = 'Edit Location';
                  textarea.readOnly = true;
                }
              } catch (error) {
                console.error('Location data format invalid, please check and try again');
                alert('Location data format invalid, please check and try again');
              }
            } else {
              // 进入编辑模式
              editBtn.classList.add('editing');
              cardContent?.classList.add('editing');
              editBtn.innerHTML = '<i class="fas fa-save"></i>';
              editBtn.title = 'Save Location';
              textarea.readOnly = false;
            }
          });
          
          // 使用位置（双击文本区域）
          textarea.addEventListener('dblclick', () => {
            if (textarea.readOnly) {
              const location = this.locationManager.useLocation(index);
              if (location) {
                this.mapController.setMapLocation(location.latitude, location.longitude);
                this.closeLocationManager();
              }
            }
          });
        });
      });
    }).catch(error => {
      console.error('Failed to load JSON5 support module:', error);
      this.renderFallbackLocations();
    });
  }
  
  /**
   * 渲染位置的后备显示方式（当JSON5编辑器加载失败时）
   */
  renderFallbackLocations() {
    const locations = this.locationManager.getSavedLocations();
    let html = '';
    
    locations.forEach((location, index) => {
      const date = new Date(location.timestamp);
      const formattedDate = date.toLocaleString();
      
      html += `
        <div class="grid-card" data-index="${index}">
          <div class="grid-card-header">
            <h3>${location.name}</h3>
            <div class="card-header-actions">
              <button class="grid-btn use-location" data-index="${index}" title="Use Location"><i class="fas fa-map-marker-alt"></i></button>
              <button class="grid-btn edit-location" data-index="${index}" title="Edit Location"><i class="fas fa-edit"></i></button>
              <button class="grid-card-delete" data-index="${index}" title="Delete Location"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div class="grid-card-content">
            <div class="grid-field"><span>Latitude:</span> ${location.latitude}</div>
            <div class="grid-field"><span>Longitude:</span> ${location.longitude}</div>
            <div class="grid-field"><span>Timestamp:</span> ${formattedDate}</div>
          </div>
        </div>
      `;
    });
    
    this.locationsContainer.innerHTML = html;
    this._setupFallbackButtonListeners();
    
    // 添加双击事件监听器
    const cards = document.querySelectorAll('.grid-card');
    cards.forEach(card => {
      card.addEventListener('dblclick', (e) => {
        // 防止事件冒泡
        e.stopPropagation();
        // 防止默认行为
        e.preventDefault();
        
        const index = parseInt(card.dataset.index);
        const editBtn = card.querySelector('.edit-location');
        if (editBtn) {
          editBtn.click();
        }
      });
    });
  }

  /**
   * 设置后备显示方式的按钮事件监听器
   * @private
   */
  _setupFallbackButtonListeners() {
    // 使用位置按钮
    const useButtons = document.querySelectorAll('.use-location');
    useButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        const location = this.locationManager.useLocation(index);
        if (location) {
          this.mapController.setMapLocation(location.latitude, location.longitude);
          this.closeLocationManager();
        }
      });
    });

    // 编辑位置按钮
    const editButtons = document.querySelectorAll('.edit-location');
    editButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        // 显示提示消息，建议用户使用新的JSON编辑器模式
        alert('Please refresh the page and use the new JSON editor to edit');
        // 重新渲染位置列表，使用JSON编辑器模式
        this.renderLocations();
      });
    });

    // 删除位置按钮
    const deleteButtons = document.querySelectorAll('.grid-card-delete');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (confirm('Are you sure you want to delete this location?')) {
          if (this.locationManager.deleteLocation(index)) {
            this.renderLocations();
          }
        }
      });
    });
  }

  /**
   * 导出位置
   */
  exportLocations() {
    const locations = this.locationManager.getSavedLocations();

    if (locations.length === 0) {
      alert('No locations to export');
      return;
    }

    const jsonData = this.locationManager.exportLocations();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geolocation_locations.json';
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * 导入位置
   * @param {Event} event - 文件选择事件
   */
  importLocations(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const jsonData = e.target.result;
      if (this.locationManager.importLocations(jsonData)) {
        this.renderLocations();
      }

      // 重置文件输入，以便可以再次选择同一文件
      event.target.value = '';
    };

    reader.onerror = () => {
      alert('Failed to read file');
      event.target.value = '';
    };

    reader.readAsText(file);
  }

  /**
   * 设置ESC键关闭模态框功能
   * @private
   */
  _setupEscKeyListener() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // 关闭所有模态框
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
          if (modal.style.display === 'flex' || modal.style.display === 'block') {
            // 根据模态框ID执行相应的关闭操作
            if (modal.id === 'manageLocationsModal') {
              this.closeLocationManager();
            } else if (modal.id === 'manageGridsModal') {
              if (typeof this.closeGridManager === 'function') {
                this.closeGridManager();
              } else {
                modal.style.display = 'none';
              }
            } else if (modal.id === 'saveLocationModal') {
              this.saveLocationModal.style.display = 'none';
              this.locationNameInput.value = '';
            } else {
              // 其他模态框的通用处理
              modal.style.display = 'none';
            }
          }
        });
      }
    });
    
    // 添加点击模态框外部关闭功能
    this.saveLocationModal.addEventListener('click', (e) => {
      if (e.target === this.saveLocationModal) {
        this.saveLocationModal.style.display = 'none';
        this.locationNameInput.value = '';
      }
    });
    
    this.manageLocationsModal.addEventListener('click', (e) => {
      if (e.target === this.manageLocationsModal) {
        this.closeLocationManager();
      }
    });
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
export default UIController;
