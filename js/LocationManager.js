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
    chrome.storage.local.get(['savedLocations'], (result) => {
      if (result.savedLocations) {
        this.savedLocations = result.savedLocations;
        this.updateSavedLocationsDropdown();
      }
    });
  }
  
  /**
   * 将位置数据保存到存储中
   * @private
   * @param {string} message - 日志消息
   */
  _saveToStorage(message = '位置已更新') {
    chrome.storage.local.set({
      savedLocations: this.savedLocations
    }, () => {
      console.log(message);
      this.updateSavedLocationsDropdown();
    });
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
      timestamp: new Date().toISOString()
    };
    
    this.savedLocations.push(newLocation);
    
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
   * 编辑位置
   * @param {number} index - 位置索引
   * @param {string} name - 新名称
   * @param {number} lat - 新纬度
   * @param {number} lng - 新经度
   * @returns {boolean} - 是否编辑成功
   */
  editLocation(index, name, lat, lng) {
    if (index < 0 || index >= this.savedLocations.length) {
      return false;
    }
    
    if (!name || name.trim() === '') {
      alert('请输入位置名称');
      return false;
    }
    
    this.savedLocations[index] = {
      name: name.trim(),
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toISOString()
    };
    
    // 保存到本地存储
    this._saveToStorage('位置已更新');
    
    return true;
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
