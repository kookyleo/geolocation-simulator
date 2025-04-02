/**
 * LocationManager 类 - 负责位置的保存、加载、导入导出等功能
 */
class LocationManager {
  constructor() {
    this.savedLocations = [];
    this.currentEditIndex = -1;
    
    // 保存位置相关元素
    this.savedLocationsSelect = document.getElementById('savedLocations');
    
    // 加载已保存的位置
    this.loadSavedLocations();
  }

  /**
   * 加载保存的位置
   */
  loadSavedLocations() {
    try {
      const savedLocations = localStorage.getItem('savedLocations');
      if (savedLocations) {
        this.savedLocations = JSON.parse(savedLocations);
        this.updateSavedLocationsDropdown();
      }
    } catch (error) {
      console.error('加载位置失败:', error);
      this.savedLocations = [];
    }
  }
  
  /**
   * 将位置数据保存到存储中
   * @private
   * @param {string} message - 日志消息
   */
  _saveToStorage(message = '位置已更新') {
    try {
      localStorage.setItem('savedLocations', JSON.stringify(this.savedLocations));
      console.log(message);
      this.updateSavedLocationsDropdown();
    } catch (error) {
      console.error('保存位置失败:', error);
    }
  }

  /**
   * 更新位置下拉列表
   */
  updateSavedLocationsDropdown() {
    // 清空下拉列表，保留默认选项和当前物理位置选项
    const defaultOption = '<option value="">选择保存的位置</option>';
    const physicalLocationOption = '<option value="current-physical-location" class="physical-location-option">当前物理位置</option>';
    const separator = '<option disabled="disabled">.................</option>';

    // 设置基本选项
    this.savedLocationsSelect.innerHTML = defaultOption + separator;
    // 添加保存的位置
    this.savedLocations.forEach((location, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = location.name;
      this.savedLocationsSelect.appendChild(option);
    });

    // 追加当前物理位置选项
    this.savedLocationsSelect.insertAdjacentHTML('beforeend', separator);
    this.savedLocationsSelect.insertAdjacentHTML('beforeend', physicalLocationOption);
  }

  /**
   * 保存当前位置
   * @param {string} name - 位置名称
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   * @returns {boolean} - 是否保存成功
   */
  saveCurrentLocation(name, lat, lng) {
    if (!name || name.trim() === '') {
      alert('请输入位置名称');
      return false;
    }
    
    const newLocation = {
      name: name.trim(),
      latitude: lat,
      longitude: lng,
      enabled: true,
      timestamp: new Date().toISOString()
    };
    
    // 将新位置添加到数组开头
    this.savedLocations.unshift(newLocation);
    
    // 保存到本地存储
    this._saveToStorage('位置已保存');
    
    return true;
  }

  /**
   * 获取所有保存的位置
   * @returns {Array} - 保存的位置数组
   */
  getSavedLocations() {
    return this.savedLocations;
  }
  
  /**
   * 获取单个位置的详细信息
   * @param {number} index - 位置索引
   * @returns {Object|null} - 位置对象，如果无效则返回null
   */
  getLocationForEdit(index) {
    if (index >= 0 && index < this.savedLocations.length) {
      return this.savedLocations[index];
    }
    return null;
  }

  /**
   * 使用选中的位置
   * @param {number} index - 位置索引
   * @returns {Object|null} - 选中的位置对象，如果无效则返回null
   */
  useLocation(index) {
    if (index >= 0 && index < this.savedLocations.length) {
      const location = this.savedLocations[index];
      return {
        latitude: location.latitude,
        longitude: location.longitude
      };
    }
    return null;
  }
  
  /**
   * 创建新的位置
   * @param {Object} mapController - 地图控制器对象
   * @returns {number} - 新创建位置的索引
   */
  createNewLocation(mapController) {
    // 获取当前地图中心作为默认值
    let position = { lat: 39.9042, lng: 116.4074 };
    
    if (mapController && mapController.marker) {
      position = mapController.marker.getLatLng();
    }
    
    const newLocation = {
      name: `位置 ${this.savedLocations.length + 1}`,
      latitude: position.lat,
      longitude: position.lng,
      enabled: true,
      timestamp: new Date().toISOString()
    };
    
    // 将新位置添加到数组开头
    this.savedLocations.unshift(newLocation);
    this._saveToStorage('新位置已创建');
    
    return 0; // 返回新位置的索引（始终是0，因为添加到了数组开头）
  }

  /**
   * 编辑位置
   * @param {number} index - 位置索引
   * @param {Object} updatedLocation - 更新后的位置对象
   * @returns {boolean} - 是否编辑成功
   */
  editLocation(index, updatedLocation) {
    if (index < 0 || index >= this.savedLocations.length) {
      return false;
    }
    
    try {
      // 保留原始时间戳，如果没有则创建新的
      const originalTimestamp = this.savedLocations[index].timestamp || new Date().toISOString();
      
      // 确保更新后的位置对象有必要的字段
      if (!updatedLocation.name || typeof updatedLocation.latitude !== 'number' || typeof updatedLocation.longitude !== 'number') {
        console.error('位置数据格式无效');
        return false;
      }
      
      // 更新位置，保留时间戳
      this.savedLocations[index] = {
        ...updatedLocation,
        timestamp: originalTimestamp
      };
      
      // 保存到本地存储
      this._saveToStorage('位置已更新');
      
      return true;
    } catch (error) {
      console.error('编辑位置失败:', error);
      return false;
    }
  }

  /**
   * 删除位置
   * @param {number} index - 位置索引
   * @returns {boolean} - 是否删除成功
   */
  deleteLocation(index) {
    if (index < 0 || index >= this.savedLocations.length) {
      return false;
    }
    
    this.savedLocations.splice(index, 1);
    
    // 保存到本地存储
    this._saveToStorage('位置已删除');
    
    return true;
  }

  /**
   * 导出位置
   * @returns {string} - 导出的JSON字符串
   */
  exportLocations() {
    return JSON.stringify(this.savedLocations, null, 2);
  }

  /**
   * 导入位置
   * @param {string} jsonData - 导入的JSON字符串
   * @returns {boolean} - 是否导入成功
   */
  importLocations(jsonData) {
    try {
      const importedData = JSON.parse(jsonData);
      
      if (!Array.isArray(importedData)) {
        alert('导入的数据格式无效');
        return false;
      }
      
      // 验证每个位置对象的格式
      const validLocations = importedData.filter(location => {
        return location && 
               typeof location.name === 'string' && 
               typeof location.latitude === 'number' && 
               typeof location.longitude === 'number';
      });
      
      if (validLocations.length === 0) {
        alert('导入的数据中没有有效的位置');
        return false;
      }
      
      // 确认是合并还是替换
      const shouldMerge = confirm(`成功解析 ${validLocations.length} 个位置。\n是否合并到现有位置？\n点击"确定"合并，点击"取消"替换现有位置。`);
      
      if (shouldMerge) {
        // 合并位置
        this.savedLocations = [...this.savedLocations, ...validLocations];
      } else {
        // 替换位置
        this.savedLocations = validLocations;
      }
      
      // 保存到本地存储
      this._saveToStorage('位置已导入');
      
      return true;
    } catch (error) {
      console.error('导入位置时出错:', error);
      alert('导入位置时出错: ' + error.message);
      return false;
    }
  }

  /**
   * 获取位置数据用于编辑
   * @param {number} index - 位置索引
   * @returns {Object|null} - 位置数据，如果无效则返回null
   */
  getLocationForEdit(index) {
    if (index >= 0 && index < this.savedLocations.length) {
      return this.savedLocations[index];
    }
    return null;
  }
}

// 导出类
export default LocationManager;
