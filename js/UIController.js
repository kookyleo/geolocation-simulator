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
    this.locationsTableContainer = document.getElementById('locationsTableContainer');
    this.closeManageModalBtn = document.getElementById('closeManageModal');
    this.addNewLocationBtn = document.getElementById('addNewLocation');
    this.importButton = document.getElementById('importButton');
    this.exportButton = document.getElementById('exportButton');
    this.importInput = document.getElementById('importInput');

    // 编辑位置相关元素
    this.editLocationModal = document.getElementById('editLocationModal');
    this.editModalTitle = document.getElementById('editModalTitle');
    this.editNameInput = document.getElementById('editName');
    this.editLatitudeInput = document.getElementById('editLatitude');
    this.editLongitudeInput = document.getElementById('editLongitude');
    this.confirmEditBtn = document.getElementById('confirmEdit');
    this.cancelEditBtn = document.getElementById('cancelEdit');
    this.closeEditLocationModalBtn = document.getElementById('closeEditLocationModal');
    this.closeSaveLocationModalBtn = document.getElementById('closeSaveLocationModal');

    // 当前编辑的位置索引
    this.currentEditIndex = -1;

    // 初始化事件监听器
    this._setupEventListeners();
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
      this.renderLocationsTable();
      this.manageLocationsModal.style.display = 'flex';
    });

    // 关闭管理位置模态框
    this.closeManageModalBtn.addEventListener('click', () => {
      this.manageLocationsModal.style.display = 'none';
    });

    // 关闭编辑位置模态框
    this.closeEditLocationModalBtn.addEventListener('click', () => {
      this.editLocationModal.style.display = 'none';
    });

    // 关闭保存位置模态框
    this.closeSaveLocationModalBtn.addEventListener('click', () => {
      this.saveLocationModal.style.display = 'none';
      this.locationNameInput.value = '';
    });

    // "添加新位置"按钮点击事件
    this.addNewLocationBtn.addEventListener('click', () => {
      this.manageLocationsModal.style.display = 'none';
      this.openAddLocationModal();
    });

    // 编辑位置模态框的确认按钮
    this.confirmEditBtn.addEventListener('click', () => this.saveEditedLocation());

    // 编辑位置模态框的取消按钮
    this.cancelEditBtn.addEventListener('click', () => {
      this.editLocationModal.style.display = 'none';
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
    const defaultName = `位置 (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`;

    // 设置默认名称
    this.locationNameInput.value = defaultName;

    // 显示模态框
    this.saveLocationModal.style.display = 'flex';

    // 聚焦输入框并选中文本
    this.locationNameInput.focus();
    this.locationNameInput.select();
  }

  /**
   * 打开编辑位置模态框
   * @param {number} index - 位置索引
   */
  openEditLocationModal(index) {
    const location = this.locationManager.getLocationForEdit(index);
    if (!location) return;

    this.currentEditIndex = index;
    this.editModalTitle.textContent = '编辑位置';
    this.editNameInput.value = location.name;
    this.editLatitudeInput.value = location.latitude;
    this.editLongitudeInput.value = location.longitude;

    this.editLocationModal.style.display = 'flex';
    this.editNameInput.focus();
    this.editNameInput.select();
  }

  /**
   * 保存编辑的位置
   */
  saveEditedLocation() {
    const name = this.editNameInput.value;
    const lat = parseFloat(this.editLatitudeInput.value);
    const lng = parseFloat(this.editLongitudeInput.value);

    // 验证输入
    if (!name || name.trim() === '') {
      alert('请输入位置名称');
      return;
    }

    if (isNaN(lat) || isNaN(lng)) {
      alert('请输入有效的经纬度');
      return;
    }

    // 验证经纬度范围
    if (lat < -90 || lat > 90) {
      alert('纬度必须在 -90 到 90 之间');
      return;
    }

    if (lng < -180 || lng > 180) {
      alert('经度必须在 -180 到 180 之间');
      return;
    }

    // 保存位置
    if (this.currentEditIndex >= 0) {
      // 编辑现有位置
      if (this.locationManager.editLocation(this.currentEditIndex, name, lat, lng)) {
        this.editLocationModal.style.display = 'none';
        this.renderLocationsTable();
      }
    } else {
      // 添加新位置
      if (this.locationManager.saveCurrentLocation(name, lat, lng)) {
        this.editLocationModal.style.display = 'none';
        this.renderLocationsTable();
      }
    }
  }

  /**
   * 渲染位置表格
   */
  renderLocationsTable() {
    const locations = this.locationManager.getSavedLocations();

    if (locations.length === 0) {
      // 显示空状态
      this.locationsTableContainer.innerHTML = `
        <div class="empty-state">
          <p>您还没有保存任何位置</p>
          <button id="addFirstLocation" class="save">添加第一个位置</button>
        </div>
      `;

      // 添加第一个位置按钮点击事件
      document.getElementById('addFirstLocation').addEventListener('click', () => {
        this.manageLocationsModal.style.display = 'none';
        this.openAddLocationModal();
      });

      return;
    }

    // 创建表格
    let tableHTML = `
      <table>
        <thead>
          <tr>
            <th>名称</th>
            <th>纬度</th>
            <th>经度</th>
            <th>保存时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
    `;

    // 添加位置行
    locations.forEach((location, index) => {
      const date = new Date(location.timestamp);
      const formattedDate = date.toLocaleString();

      tableHTML += `
        <tr>
          <td>${location.name}</td>
          <td>${location.latitude.toFixed(6)}</td>
          <td>${location.longitude.toFixed(6)}</td>
          <td>${formattedDate}</td>
          <td class="actions">
            <button class="use-location" data-index="${index}">使用</button>
            <button class="edit-location" data-index="${index}">编辑</button>
            <button class="delete-location btn-delete" data-index="${index}">删除</button>
          </td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    // 更新表格容器
    this.locationsTableContainer.innerHTML = tableHTML;

    // 添加按钮事件监听器
    this._setupTableButtonListeners();
  }

  /**
   * 设置表格按钮事件监听器
   * @private
   */
  _setupTableButtonListeners() {
    // 使用位置按钮
    const useButtons = document.querySelectorAll('.use-location');
    useButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        const location = this.locationManager.useLocation(index);
        if (location) {
          this.mapController.setMapLocation(location.latitude, location.longitude);
          this.manageLocationsModal.style.display = 'none';
        }
      });
    });

    // 编辑位置按钮
    const editButtons = document.querySelectorAll('.edit-location');
    editButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.openEditLocationModal(index);
      });
    });

    // 删除位置按钮
    const deleteButtons = document.querySelectorAll('.delete-location');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (confirm('确定要删除这个位置吗？')) {
          if (this.locationManager.deleteLocation(index)) {
            this.renderLocationsTable();
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
        this.renderLocationsTable();
      }

      // 重置文件输入，以便可以再次选择同一文件
      event.target.value = '';
    };

    reader.onerror = () => {
      alert('读取文件时出错');
      event.target.value = '';
    };

    reader.readAsText(file);
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
