/**
 * LocationUIController 类 - 负责位置管理相关的UI功能
 */
class LocationUIController {
  /**
   * 构造函数
   * @param {Object} mapController - 地图控制器
   * @param {Object} locationManager - 位置管理器
   * @param {Object} modalController - 模态框控制器
   * @param {Object} editorController - 编辑器控制器
   */
  constructor(mapController, locationManager, modalController, editorController) {
    this.mapController = mapController;
    this.locationManager = locationManager;
    this.modalController = modalController;
    this.editorController = editorController;

    // 保存位置相关元素
    this.saveLocationBtn = document.getElementById('saveLocation');
    this.savedLocationsSelect = document.getElementById('savedLocations');
    this.saveLocationModal = document.getElementById('saveLocationModal');
    this.locationNameInput = document.getElementById('locationName');
    this.confirmSaveBtn = document.getElementById('confirmSave');
    this.cancelSaveBtn = document.getElementById('cancelSave');
    this.closeSaveLocationModalBtn = document.getElementById('closeSaveLocationModal');

    // 管理位置相关元素
    this.manageLocationsBtn = document.getElementById('manageLocations');
    this.manageLocationsModal = document.getElementById('manageLocationsModal');
    this.locationsContainer = document.getElementById('locationsContainer');
    this.closeManageModalBtn = document.getElementById('closeManageModal');
    this.addNewLocationBtn = document.getElementById('addNewLocation');
    this.importButton = document.getElementById('importButton');
    this.exportButton = document.getElementById('exportButton');
    this.importInput = document.getElementById('importInput');

    // 当前编辑的位置索引
    this.currentEditIndex = -1;

    // 初始化事件监听器
    this._setupEventListeners();
    
    // 注册模态框
    this._registerModals();
  }

  /**
   * 注册模态框
   * @private
   */
  _registerModals() {
    // 注册保存位置模态框
    this.modalController.registerModal('saveLocationModal', this.saveLocationModal, () => {
      this.saveLocationModal.style.display = 'none';
      this.locationNameInput.value = '';
    });

    // 注册管理位置模态框
    this.modalController.registerModal('manageLocationsModal', this.manageLocationsModal, () => {
      this.closeLocationManager();
    });
  }

  /**
   * 设置事件监听器
   * @private
   */
  _setupEventListeners() {
    // "保存位置"按钮点击事件
    this.saveLocationBtn.addEventListener('click', () => this.openAddLocationModal());

    // 保存位置模态框的确认按钮
    this.confirmSaveBtn.addEventListener('click', () => {
      const name = this.locationNameInput.value;
      const position = this.mapController.marker.getLatLng();

      if (this.locationManager.saveCurrentLocation(name, position.lat, position.lng)) {
        this.modalController.closeModal('saveLocationModal');
      }
    });

    // 保存位置模态框的取消按钮
    this.cancelSaveBtn.addEventListener('click', () => {
      this.modalController.closeModal('saveLocationModal');
    });

    // 位置下拉列表变更事件
    this.savedLocationsSelect.addEventListener('change', (e) => {
      const value = e.target.value;

      // 处理"当前物理位置"选项
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
      this.modalController.closeModal('manageLocationsModal');
    });

    // 关闭保存位置模态框
    this.closeSaveLocationModalBtn.addEventListener('click', () => {
      this.modalController.closeModal('saveLocationModal');
    });

    // "添加新位置"按钮点击事件
    this.addNewLocationBtn.addEventListener('click', () => {
      this.createNewLocation();
    });

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
    this.modalController.openModal('saveLocationModal');

    // 聚焦输入框并选中文本
    this.locationNameInput.focus();
    this.locationNameInput.select();
  }

  /**
   * 打开位置管理器
   */
  openLocationManager() {
    this.modalController.openModal('manageLocationsModal');
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
  async renderLocations(newLocationIndex = -1) {
    const container = this.locationsContainer;
    if (!container) return;
    
    container.innerHTML = '';
    const locations = this.locationManager.getSavedLocations();
    
    if (locations.length === 0) {
      // 显示空状态
      container.innerHTML = `
        <div class="empty-state">
          <p>您还没有保存任何位置</p>
          <button id="addFirstLocation" class="save">添加第一个位置</button>
        </div>
      `;

      // 添加第一个位置按钮点击事件
      document.getElementById('addFirstLocation').addEventListener('click', () => {
        this.createNewLocation();
      });

      return;
    }
    
    // 为每个位置创建卡片
    for (let index = 0; index < locations.length; index++) {
      const location = locations[index];
      
      // 创建卡片结构
      const card = document.createElement('div');
      card.className = 'grid-card' + (index === newLocationIndex ? ' new' : '');
      card.dataset.index = index;
      
      // 创建按钮区域
      const buttons = document.createElement('div');
      buttons.className = 'grid-card-buttons';
      buttons.innerHTML = `
        <div class="action-group">
          <button class="use-btn" title="使用位置"><i class="fas fa-map-marker-alt"></i></button>
          <button class="edit-btn" title="编辑位置"><i class="fas fa-edit"></i></button>
          <button class="delete-btn" title="删除位置"><i class="fas fa-trash-alt"></i></button>
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
        const editBtn = buttons.querySelector('.edit-btn');
        if (editBtn) {
          editBtn.click();
        }
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
        if (confirm('确定要删除这个位置吗？')) {
          if (this.locationManager.deleteLocation(index)) {
            this.renderLocations();
          }
        }
      });
      
      try {
        // 创建编辑器
        const jsonEditor = await this.editorController.createJSONEditor(
          editorContainer, 
          location, 
          true, // 初始为只读
          (updatedLocation) => {
            // 保存编辑的回调
            return this.locationManager.editLocation(index, updatedLocation);
          }
        );
        
        // 绑定编辑按钮事件
        editBtn.addEventListener('click', () => {
          // 切换编辑状态
          const isEditing = editBtn.classList.contains('editing');
          const cardContent = editorContainer.closest('.grid-card-content');
          
          if (isEditing) {
            // 保存编辑
            try {
              const updatedLocation = JSON.parse(jsonEditor.getValue());
              if (this.locationManager.editLocation(index, updatedLocation)) {
                editBtn.classList.remove('editing');
                cardContent?.classList.remove('editing');
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.title = '编辑位置';
                jsonEditor.setEditMode(false);
              }
            } catch (error) {
              console.error('位置数据格式无效，请检查后重试');
              alert('位置数据格式无效，请检查后重试');
            }
          } else {
            // 进入编辑模式
            editBtn.classList.add('editing');
            cardContent?.classList.add('editing');
            editBtn.innerHTML = '<i class="fas fa-save"></i>';
            editBtn.title = '保存位置';
            jsonEditor.setEditMode(true);
          }
        });
      } catch (error) {
        console.error('编辑器加载失败:', error);
        this.renderFallbackLocation(card, location, index);
      }
    }
  }
  
  /**
   * 为单个位置渲染后备显示方式
   * @param {HTMLElement} card - 卡片元素
   * @param {Object} location - 位置数据
   * @param {number} index - 位置索引
   * @private
   */
  renderFallbackLocation(card, location, index) {
    const date = new Date(location.timestamp);
    const formattedDate = date.toLocaleString();
    
    const content = document.createElement('div');
    content.className = 'grid-card-content';
    content.innerHTML = `
      <div class="grid-field"><span>名称:</span> ${location.name}</div>
      <div class="grid-field"><span>纬度:</span> ${location.latitude}</div>
      <div class="grid-field"><span>经度:</span> ${location.longitude}</div>
      <div class="grid-field"><span>时间戳:</span> ${formattedDate}</div>
    `;
    
    // 替换卡片内容
    const oldContent = card.querySelector('.grid-card-content');
    if (oldContent) {
      card.replaceChild(content, oldContent);
    } else {
      card.appendChild(content);
    }
    
    // 更新编辑按钮事件
    const editBtn = card.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        alert('请刷新页面并使用新的JSON编辑器进行编辑');
      });
    }
  }

  /**
   * 导出位置
   */
  exportLocations() {
    const locations = this.locationManager.getSavedLocations();

    if (locations.length === 0) {
      alert('没有可导出的位置');
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
      alert('请选择JSON文件');
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
      alert('读取文件失败');
      event.target.value = '';
    };

    reader.readAsText(file);
  }
}

// 导出类
export default LocationUIController;
