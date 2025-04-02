// 存储当前的模拟位置
let mockGeolocation = {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 10,
  timestamp: Date.now()
};

// 跟踪连接到哪些标签页的调试器
const attachedTabs = new Map();

// 初始化时，从存储中获取位置
chrome.storage.local.get(['mockGeolocation'], function(result) {
  if (result.mockGeolocation) {
    mockGeolocation = result.mockGeolocation;
    console.log('从存储中加载了模拟位置:', mockGeolocation);
  } else {
    // 如果没有存储的位置，初始化存储
    chrome.storage.local.set({ mockGeolocation }, function() {
      console.log('已初始化存储中的模拟位置');
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Geolocation Simulator 已安装");
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 打开侧边栏
    await chrome.sidePanel.open({ tabId: tab.id });
    
    // 设置侧边栏为当前扩展的面板
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'panel.html',
      enabled: true
    });
    
    console.log("已打开地理位置模拟器侧边栏");
    
    // 为当前标签页附加调试器
    attachDebugger(tab.id);
  } catch (err) {
    console.error('打开侧边栏失败:', err);
  }
});

// 接收来自 MapController 和其他组件的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('后台收到消息:', message);
  
  if (message.action === 'updateGeolocation') {
    // 来自 MapController 的位置更新请求
    mockGeolocation = {
      ...message.position,
      timestamp: Date.now()
    };
    
    // 同时更新存储
    chrome.storage.local.set({ mockGeolocation }, function() {
      console.log('已更新存储中的模拟位置');
    });
    
    console.log('模拟位置已更新:', mockGeolocation);
    
    // 更新所有已连接标签页的模拟位置
    updateAllTabsGeolocation();
    
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === 'connectToTab') {
    // 连接到特定标签页的调试器
    const tabId = message.tabId || sender.tab?.id;
    if (tabId) {
      attachDebugger(tabId)
        .then(result => {
          console.log(`成功连接到标签页 ${tabId} 的调试器`);
          sendResponse({ success: true, result });
        })
        .catch(error => {
          console.error(`连接到标签页 ${tabId} 的调试器失败:`, error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    sendResponse({ success: false, error: 'No tab ID provided' });
    return true;
  }
  // 移除了未使用的 detachDebugger 消息处理代码
});

// 监听标签页关闭，断开相应的调试器连接
chrome.tabs.onRemoved.addListener((tabId) => {
  if (attachedTabs.has(tabId)) {
    detachDebugger(tabId)
      .catch(error => console.error(`断开标签 ${tabId} 的调试器连接时出错:`, error));
  }
});

/**
 * 连接到标签页的调试器
 */
async function attachDebugger(tabId) {
  try {
    // 检查标签页URL
    const tab = await chrome.tabs.get(tabId);
    if (tab.url.startsWith('chrome://')) {
      console.log(`不支持在 chrome:// URL 页面上附加调试器: ${tab.url}`);
      return { error: 'Cannot attach debugger to chrome:// URLs' };
    }

    if (attachedTabs.has(tabId)) {
      console.log(`调试器已连接到标签 ${tabId}`);
      return { alreadyAttached: true };
    }
    
    // 连接到调试器
    await chrome.debugger.attach({ tabId }, '1.3');
    console.log(`调试器已连接到标签 ${tabId}`);
    
    // 记录已连接的标签页
    attachedTabs.set(tabId, true);
    
    // 启用模拟
    await enableGeolocitionMock(tabId);
    
    // 设置初始位置
    await setGeoLocationMock(tabId, mockGeolocation.latitude, mockGeolocation.longitude);
    
    return { attached: true };
  } catch (error) {
    console.error(`连接到标签 ${tabId} 的调试器时出错:`, error);
    throw error;
  }
}

/**
 * 断开与标签页调试器的连接
 */
async function detachDebugger(tabId) {
  try {
    if (!attachedTabs.has(tabId)) return;
    
    // 禁用模拟
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearGeolocationOverride');
    } catch (e) {
      console.warn(`清除标签 ${tabId} 的地理位置覆盖时出错:`, e);
    }
    
    // 断开连接
    await chrome.debugger.detach({ tabId });
    console.log(`已断开标签 ${tabId} 的调试器连接`);
    
    // 移除记录
    attachedTabs.delete(tabId);
  } catch (error) {
    console.error(`断开标签 ${tabId} 的调试器连接时出错:`, error);
    throw error;
  }
}

/**
 * 启用地理位置模拟
 * 使用当前的mockGeolocation设置模拟位置
 */
async function enableGeolocitionMock(tabId) {
  // 检查mockGeolocation是否定义
  if (!mockGeolocation) {
    console.warn(`模拟位置对象未定义，使用默认值`);
    mockGeolocation = {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      timestamp: Date.now()
    };
  }
  
  // 使用setGeoLocationMock函数设置位置
  return await setGeoLocationMock(tabId, mockGeolocation.latitude, mockGeolocation.longitude);
}

/**
 * 设置模拟位置
 */
async function setGeoLocationMock(tabId, latitude, longitude) {
  try {
    // 验证参数
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      console.error(`设置模拟位置参数无效: 纬度 ${latitude}, 经度 ${longitude}`);
      return false;
    }
    
    // 检查标签页是否存在
    if (!attachedTabs.has(tabId)) {
      console.warn(`标签 ${tabId} 没有连接调试器，尝试重新连接`);
      await attachDebugger(tabId);
    }
    
    // 设置模拟位置
    await chrome.debugger.sendCommand({ tabId }, 'Emulation.setGeolocationOverride', {
      latitude: latitude,
      longitude: longitude,
      accuracy: 10
    });
    
    console.log(`已更新标签 ${tabId} 的模拟位置: 纬度 ${latitude}, 经度 ${longitude}`);
    return true;
  } catch (error) {
    console.error(`更新标签 ${tabId} 的模拟位置时出错:`, error);
    
    // 如果是调试器连接问题，尝试重新连接
    if (error.message && (error.message.includes('Debugger is not attached') || 
                          error.message.includes('Cannot access') || 
                          error.message.includes('not found'))) {
      try {
        console.log(`尝试重新连接标签 ${tabId} 的调试器`);
        await detachDebugger(tabId).catch(() => {});
        await attachDebugger(tabId);
        return true;
      } catch (e) {
        console.error(`重新连接标签 ${tabId} 的调试器失败:`, e);
      }
    }
    
    return false;
  }
}

/**
 * 更新所有已连接标签页的模拟位置
 */
async function updateAllTabsGeolocation() {
  // 检查当前是否有模拟位置
  if (!mockGeolocation) {
    console.warn('没有模拟位置数据，无法更新标签页');
    return;
  }
  
  // 遍历所有已连接的标签页
  for (const tabId of attachedTabs.keys()) {
    // 直接使用setGeoLocationMock函数，它已包含错误处理和重连逻辑
    await setGeoLocationMock(tabId, mockGeolocation.latitude, mockGeolocation.longitude)
      .then(success => {
        if (success) {
          console.log(`已更新标签 ${tabId} 的模拟位置`);
        }
      })
      .catch(error => {
        console.error(`更新标签 ${tabId} 的模拟位置时出错:`, error);
      });
  }
}

console.log('后台脚本已加载');
