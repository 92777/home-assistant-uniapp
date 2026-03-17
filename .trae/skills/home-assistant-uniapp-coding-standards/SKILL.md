---
name: "home-assistant-uniapp-coding-standards"
description: "Coding standards for Home Assistant UniApp project. Invoke when writing or modifying code in this project to ensure consistency with established patterns."
---

# Home Assistant UniApp 项目开发规范

## 📋 目录

1. [数据缓存规范](#数据缓存规范)
2. [数据绑定规范](#数据绑定规范)
3. [状态更新规范](#状态更新规范)
4. [代码组织规范](#代码组织规范)

---

## 数据缓存规范

### 核心原则

**单一数据源**：所有设备、实体、区域数据统一存储在一个结构化的缓存对象中

### 缓存数据结构

```javascript
// 全局缓存对象（唯一数据源）
window.deviceCache = {
  // 按区域分组的设备数据
  areas: [
    {
      areaId: 'xing_long_bin_he_yuan_chu_fang',
      areaName: '兴隆滨河苑 厨房',
      order: 1,  // HA 接口返回的顺序
      devices: [
        {
          deviceId: '3060724563bc343c9f6140b8b0c5dd39',
          deviceName: '十字四门冰箱',
          manufacturer: 'Midea',
          model: 'BCD-449WSPZM(E)',
          entityCount: 65,
          isOnline: true,
          entitiesByType: {
            climate: [
              {
                entityId: 'climate.xxxx',
                name: '变温区',
                state: 'cool',
                attributes: {...},
                isOperation: true
              }
            ],
            sensor: [...]
          }
        }
      ]
    }
  ],
  
  // 快速查找索引
  index: {
    byDeviceId: Map<deviceId, {areaIndex, deviceIndex}>,
    byEntityId: Map<entityId, {areaIndex, deviceIndex, entityType, entityIndex}>
  },
  
  // 元数据
  meta: {
    lastUpdated: timestamp,
    version: '1.0',
    totalAreas: 5,
    totalDevices: 33,
    totalEntities: 407
  }
}
```

### 缓存操作函数

必须实现以下核心函数：

1. **`buildDeviceCache()`** - 从原始数据构建缓存
   - 输入：`allDevices`, `allDeviceRegistry`, `allEntityRegistry`, `allAreas`
   - 输出：`window.deviceCache`
   - 只调用一次，在数据加载完成后

2. **`saveCache()`** - 保存到 localStorage
   - 序列化 `window.deviceCache`
   - 添加时间戳和版本号

3. **`loadCache()`** - 从 localStorage 加载
   - 验证缓存有效性（5 分钟过期）
   - 直接返回 `window.deviceCache`

4. **`updateEntityState(entityId, newState)`** - 更新单个实体状态
   - 通过索引快速定位
   - 只更新状态字段
   - 触发视图更新

### 禁止行为

❌ 不要在多个数组中分散存储设备数据
❌ 不要在每次渲染时重新分组
❌ 不要直接操作 `allDevices`、`allDeviceRegistry` 等原始数组
❌ 不要在缓存中使用嵌套查找（如 `find`、`filter`）

---

## 数据绑定规范

### 核心原则

**声明式绑定**：页面元素直接绑定到 `window.deviceCache` 的数据

### 渲染函数要求

1. **只读访问**：渲染函数只能读取缓存，不能修改
2. **直接绑定**：从缓存直接获取数据，不做转换
3. **响应式更新**：状态变化时重新渲染受影响的元素

### 示例

```javascript
// ✅ 正确：直接绑定缓存数据
function renderAllDevices() {
  const areas = window.deviceCache.areas
  
  areas.forEach(area => {
    // 直接使用缓存中的分组数据
    renderAreaSection(area)
  })
}

// ❌ 错误：重新计算分组
function renderAllDevices() {
  const grouped = groupDevicesByAreaAndDevice(...)  // 禁止！
}
```

---

## 状态更新规范

### 核心原则

**单向数据流**：状态更新 → 缓存变更 → 视图刷新

### 更新流程

```javascript
async function toggleDevice(entityId) {
  // 1. 更新缓存中的状态
  updateEntityState(entityId, newState)
  
  // 2. 调用 HA API
  await callServiceViaWebSocket(...)
  
  // 3. 等待 WebSocket 推送状态变化
  // （不需要手动刷新视图，由 subscribeToStateChanges 处理）
}

// WebSocket 状态更新监听
function subscribeToStateChanges() {
  wsConnection.addEventListener('message', (event) => {
    if (event.type === 'state_changed') {
      // 1. 更新缓存
      updateEntityState(entityId, event.data.state)
      
      // 2. 自动触发视图更新（通过响应式系统）
      notifyViewUpdate()
    }
  })
}
```

### 禁止行为

❌ 不要在操作后立即重新渲染整个页面
❌ 不要直接操作 DOM 更新状态
❌ 不要在多个地方重复更新同一个状态

---

## 代码组织规范

### 文件结构

```
/Users/lasting/mine/project/home-assistant-uniapp/
├── index.html              # 主文件（所有逻辑）
├── skills/                 # 项目规范技能
│   └── home-assistant-uniapp-coding-standards/
│       └── SKILL.md
└── ...其他文件
```

### 代码分区

在 `index.html` 中按功能分区：

```javascript
// ========== 数据层 ==========
// 缓存数据结构
// 缓存操作函数（buildCache, saveCache, loadCache, updateState）

// ========== 业务逻辑层 ==========
// WebSocket 连接
// API 调用函数
// 状态订阅和处理

// ========== 视图层 ==========
// 渲染函数（只读访问缓存）
// 事件处理函数
// UI 交互逻辑
```

### 命名规范

- **缓存相关**：`deviceCache`, `buildDeviceCache`, `updateEntityState`
- **渲染相关**：`renderAllDevices`, `renderDeviceCard`, `renderEntityItem`
- **操作相关**：`toggleDevice`, `activateScene`, `openModal`
- **工具函数**：`formatEntityId`, `getDeviceIcon`, `getStateText`

---

## 版本历史

- **v1.0** (2026-03-13): 初始版本，定义数据缓存和绑定规范
