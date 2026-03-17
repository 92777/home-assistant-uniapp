---
name: "home-assistant-api"
description: "Home Assistant REST and WebSocket API integration guide. Invoke when working with Home Assistant API endpoints, authentication, entity states, services, or real-time event subscriptions."
---

# Home Assistant API 集成指南

本文档提供 Home Assistant REST API 和 WebSocket API 的完整集成指南,用于在 UniApp 项目中与 Home Assistant 实例进行交互。

## 基础配置

### API 端点
- **Web 界面**: `http://IP_ADDRESS:8123/`
- **REST API**: `http://IP_ADDRESS:8123/api/`
- **WebSocket API**: `ws://IP_ADDRESS:8123/api/websocket`

### 认证方式
所有 API 调用需要携带 Long-Lived Access Token:
- **获取方式**: 登录 Home Assistant Web 界面 → 个人资料页面 (`http://IP_ADDRESS:8123/profile`)
- **请求头格式**: `Authorization: Bearer TOKEN`
- **Content-Type**: `application/json`

### HTTP 状态码
- `200` / `201`: 成功
- `400`: 请求错误
- `401`: 未授权
- `404`: 未找到
- `405`: 方法不允许

---

## REST API 端点

### 1. API 状态检查

#### 检查 API 是否运行
```http
GET /api/
```

**响应示例**:
```json
{
  "message": "API running."
}
```

**请求示例**:
```javascript
// UniApp 示例
uni.request({
  url: 'http://IP_ADDRESS:8123/api/',
  method: 'GET',
  header: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  success: (res) => {
    console.log(res.data)
  }
})
```

---

### 2. 配置信息

#### 获取当前配置
```http
GET /api/config
```

**响应示例**:
```json
{
  "components": ["sensor.cpuspeed", "frontend", "http"],
  "config_dir": "/home/ha/.homeassistant",
  "elevation": 510,
  "latitude": 45.8781529,
  "location_name": "Home",
  "longitude": 8.458853651,
  "time_zone": "Europe/Zurich",
  "unit_system": {
    "length": "km",
    "mass": "g",
    "temperature": "°C",
    "volume": "L"
  },
  "version": "2024.1.0",
  "whitelist_external_dirs": ["/home/ha/.homeassistant/www"]
}
```

#### 获取已加载组件列表
```http
GET /api/components
```

**响应示例**:
```json
[
  "currentcost.sensor",
  "tapo.switch",
  "tuya_ble.sensor",
  "backup",
  "http"
]
```

---

### 3. 实体状态管理

#### 获取所有实体状态
```http
GET /api/states
```

**响应示例**:
```json
[
  {
    "entity_id": "light.bed_light",
    "last_changed": "2016-11-26T01:37:24.265390+00:00",
    "last_updated": "2016-11-26T01:37:24.265390+00:00",
    "state": "on",
    "attributes": {
      "rgb_color": [254, 208, 0],
      "color_temp": 380,
      "brightness": 180,
      "friendly_name": "Bed Light"
    }
  }
]
```

#### 获取特定实体状态
```http
GET /api/states/<entity_id>
```

**参数**:
- `entity_id`: 实体 ID (如 `light.bed_light`)

**响应示例**:
```json
{
  "entity_id": "light.bed_light",
  "last_changed": "2016-11-26T01:37:24.265390+00:00",
  "last_updated": "2016-11-26T01:37:24.265390+00:00",
  "state": "on",
  "attributes": {
    "rgb_color": [254, 208, 0],
    "brightness": 180,
    "friendly_name": "Bed Light"
  }
}
```

#### 更新实体状态
```http
POST /api/states/<entity_id>
```

**请求体**:
```json
{
  "state": "on",
  "attributes": {
    "custom_attribute": "value"
  }
}
```

**响应示例**:
```json
{
  "entity_id": "sensor.test_sensor",
  "last_changed": "2016-11-26T01:37:24.265390+00:00",
  "last_updated": "2016-11-26T01:37:24.265390+00:00",
  "state": "on",
  "attributes": {
    "custom_attribute": "value"
  }
}
```

---

### 4. 事件管理

#### 获取事件列表
```http
GET /api/events
```

**响应示例**:
```json
[
  {
    "event": "state_changed",
    "listener_count": 5
  },
  {
    "event": "time_changed",
    "listener_count": 2
  }
]
```

#### 触发事件
```http
POST /api/events/<event_type>
```

**参数**:
- `event_type`: 事件类型 (如 `my_custom_event`)

**请求体**:
```json
{
  "custom_data": "value",
  "another_field": 123
}
```

**响应示例**:
```json
{
  "message": "Event my_custom_event fired."
}
```

---

### 5. 服务调用

#### 获取所有服务列表
```http
GET /api/services
```

**响应示例**:
```json
[
  {
    "domain": "light",
    "services": ["turn_on", "turn_off", "toggle"]
  },
  {
    "domain": "switch",
    "services": ["turn_on", "turn_off", "toggle"]
  }
]
```

#### 调用服务
```http
POST /api/services/<domain>/<service>
```

**参数**:
- `domain`: 服务域 (如 `light`, `switch`, `homeassistant`)
- `service`: 服务名称 (如 `turn_on`, `turn_off`)

**请求体示例 - 打开灯光**:
```json
{
  "entity_id": "light.bed_light",
  "brightness": 200,
  "rgb_color": [255, 0, 0]
}
```

**请求体示例 - 关闭灯光**:
```json
{
  "entity_id": "light.bed_light"
}
```

**响应示例**:
```json
[
  {
    "entity_id": "light.bed_light",
    "state": "on",
    "attributes": {
      "brightness": 200,
      "rgb_color": [255, 0, 0]
    }
  }
]
```

**UniApp 调用示例**:
```javascript
// 打开灯光
uni.request({
  url: 'http://IP_ADDRESS:8123/api/services/light/turn_on',
  method: 'POST',
  header: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  data: {
    entity_id: 'light.bed_light',
    brightness: 200
  },
  success: (res) => {
    console.log('灯光已打开:', res.data)
  }
})
```

---

### 6. 历史数据查询

#### 获取历史状态变化
```http
GET /api/history/period[/<timestamp>]
```

**查询参数**:
- `filter_entity_id`: 过滤实体 ID (必需,多个用逗号分隔)
- `end_time`: 结束时间 (可选,默认为当前时间)
- `minimal_response`: 仅返回 last_changed 和 state (可选,更快)
- `no_attributes`: 跳过属性返回 (可选,更快)
- `significant_changes_only`: 仅返回显著变化 (可选)

**请求示例**:
```http
GET /api/history/period/2024-01-01T00:00:00Z?filter_entity_id=sensor.temperature,sensor.humidity&end_time=2024-01-02T00:00:00Z
```

**响应示例**:
```json
[
  [
    {
      "attributes": {
        "friendly_name": "Temperature",
        "unit_of_measurement": "°C"
      },
      "entity_id": "sensor.temperature",
      "last_changed": "2024-01-01T00:00:00+00:00",
      "last_updated": "2024-01-01T00:00:00+00:00",
      "state": "22.5"
    }
  ]
]
```

---

### 7. 日志记录

#### 获取错误日志
```http
GET /api/error_log
```

**响应**: 纯文本格式的错误日志

#### 获取所有日志
```http
GET /api/error_log/all
```

**响应**: 纯文本格式的所有日志

---

### 8. 相机图像

#### 获取相机快照
```http
GET /api/camera_proxy/<camera_entity_id>
```

**参数**:
- `camera_entity_id`: 相机实体 ID

**响应**: 图像二进制数据

---

### 9. 实体搜索

#### 搜索实体
```http
POST /api/search
```

**请求体**:
```json
{
  "q": "search_term"
}
```

**响应示例**:
```json
[
  {
    "entity_id": "light.bed_light",
    "name": "Bed Light",
    "domain": "light"
  }
]
```

---

## WebSocket API

### 连接流程

#### 1. 建立连接
```javascript
const ws = new WebSocket('ws://IP_ADDRESS:8123/api/websocket')
```

#### 2. 认证阶段

**服务器发送认证要求**:
```json
{
  "type": "auth_required",
  "ha_version": "2024.1.0"
}
```

**客户端发送认证令牌**:
```json
{
  "type": "auth",
  "access_token": "YOUR_LONG_LIVED_ACCESS_TOKEN"
}
```

**认证成功响应**:
```json
{
  "type": "auth_ok",
  "ha_version": "2024.1.0"
}
```

**认证失败响应**:
```json
{
  "type": "auth_invalid",
  "message": "Invalid access token"
}
```

#### 3. 功能启用阶段 (可选)

**客户端发送支持的功能**:
```json
{
  "id": 1,
  "type": "supported_features",
  "features": {
    "coalesce_messages": 1
  }
}
```

#### 4. 命令阶段

所有命令消息必须包含唯一 `id` (整数),用于关联请求和响应。

---

### WebSocket 命令

#### 1. 订阅事件

**订阅所有事件**:
```json
{
  "id": 18,
  "type": "subscribe_events"
}
```

**订阅特定事件类型**:
```json
{
  "id": 18,
  "type": "subscribe_events",
  "event_type": "state_changed"
}
```

**订阅成功响应**:
```json
{
  "id": 18,
  "type": "result",
  "success": true,
  "result": null
}
```

**事件消息示例**:
```json
{
  "id": 18,
  "type": "event",
  "event": {
    "data": {
      "entity_id": "light.bed_light",
      "new_state": {
        "entity_id": "light.bed_light",
        "state": "on",
        "attributes": {
          "brightness": 180,
          "friendly_name": "Bed Light"
        },
        "last_changed": "2016-11-26T01:37:24.265390+00:00"
      },
      "old_state": {
        "entity_id": "light.bed_light",
        "state": "off",
        "attributes": {
          "friendly_name": "Bed Light"
        }
      }
    },
    "event_type": "state_changed",
    "time_fired": "2016-11-26T01:37:24.265429+00:00",
    "origin": "LOCAL"
  }
}
```

---

#### 2. 取消订阅事件

```json
{
  "id": 19,
  "type": "unsubscribe_events",
  "subscription": 18
}
```

**参数**:
- `subscription`: 之前订阅命令的 id

---

#### 3. 调用服务

```json
{
  "id": 20,
  "type": "call_service",
  "domain": "light",
  "service": "turn_on",
  "service_data": {
    "entity_id": "light.bed_light",
    "brightness": 200
  }
}
```

**响应示例**:
```json
{
  "id": 20,
  "type": "result",
  "success": true,
  "result": {
    "context": {
      "id": "326ef27d19415c60c492fe330945f954",
      "parent_id": null,
      "user_id": "31ddb597e03147118cf8d2f8fbea5553"
    }
  }
}
```

---

#### 4. 获取状态

**获取所有实体状态**:
```json
{
  "id": 21,
  "type": "get_states"
}
```

**响应示例**:
```json
{
  "id": 21,
  "type": "result",
  "success": true,
  "result": [
    {
      "entity_id": "light.bed_light",
      "state": "on",
      "attributes": {
        "brightness": 180,
        "friendly_name": "Bed Light"
      },
      "last_changed": "2016-11-26T01:37:24.265390+00:00"
    }
  ]
}
```

---

#### 5. 获取配置

```json
{
  "id": 22,
  "type": "get_config"
}
```

**响应示例**:
```json
{
  "id": 22,
  "type": "result",
  "success": true,
  "result": {
    "components": ["light", "sensor"],
    "version": "2024.1.0",
    "location_name": "Home"
  }
}
```

---

#### 6. 获取服务列表

```json
{
  "id": 23,
  "type": "get_services"
}
```

**响应示例**:
```json
{
  "id": 23,
  "type": "result",
  "success": true,
  "result": [
    {
      "domain": "light",
      "services": {
        "turn_on": {
          "description": "Turn a light on",
          "fields": {
            "entity_id": {
              "description": "Name(s) of entities to turn on"
            },
            "brightness": {
              "description": "Number between 0-255"
            }
          }
        }
      }
    }
  ]
}
```

---

#### 7. 获取面板列表

```json
{
  "id": 24,
  "type": "get_panels"
}
```

---

#### 8. 触发事件

```json
{
  "id": 25,
  "type": "fire_event",
  "event_type": "my_custom_event",
  "event_data": {
    "custom_field": "value"
  }
}
```

---

#### 9. 检查配置

```json
{
  "id": 26,
  "type": "check_config"
}
```

**响应示例**:
```json
{
  "id": 26,
  "type": "result",
  "success": true,
  "result": {
    "errors": {},
    "warnings": {}
  }
}
```

---

### WebSocket 完整示例 (UniApp)

```javascript
export default {
  data() {
    return {
      ws: null,
      messageId: 1,
      isAuthenticated: false
    }
  },
  
  methods: {
    // 连接 WebSocket
    connectWebSocket() {
      this.ws = uni.connectSocket({
        url: 'ws://IP_ADDRESS:8123/api/websocket',
        success: () => {
          console.log('WebSocket 连接成功')
        }
      })
      
      // 监听消息
      uni.onSocketMessage((res) => {
        const message = JSON.parse(res.data)
        this.handleMessage(message)
      })
      
      // 监听连接打开
      uni.onSocketOpen(() => {
        console.log('WebSocket 已打开')
      })
    },
    
    // 处理消息
    handleMessage(message) {
      switch (message.type) {
        case 'auth_required':
          this.authenticate()
          break
        case 'auth_ok':
          this.isAuthenticated = true
          console.log('认证成功')
          this.subscribeToEvents()
          break
        case 'auth_invalid':
          console.error('认证失败:', message.message)
          break
        case 'event':
          this.handleEvent(message.event)
          break
        case 'result':
          console.log('命令结果:', message)
          break
      }
    },
    
    // 认证
    authenticate() {
      const authMessage = {
        type: 'auth',
        access_token: 'YOUR_LONG_LIVED_ACCESS_TOKEN'
      }
      uni.sendSocketMessage({
        data: JSON.stringify(authMessage)
      })
    },
    
    // 订阅状态变化事件
    subscribeToEvents() {
      const subscribeMessage = {
        id: this.messageId++,
        type: 'subscribe_events',
        event_type: 'state_changed'
      }
      uni.sendSocketMessage({
        data: JSON.stringify(subscribeMessage)
      })
    },
    
    // 处理事件
    handleEvent(event) {
      if (event.event_type === 'state_changed') {
        const { entity_id, new_state, old_state } = event.data
        console.log(`实体 ${entity_id} 状态从 ${old_state.state} 变为 ${new_state.state}`)
      }
    },
    
    // 调用服务
    callService(domain, service, data) {
      const message = {
        id: this.messageId++,
        type: 'call_service',
        domain: domain,
        service: service,
        service_data: data
      }
      uni.sendSocketMessage({
        data: JSON.stringify(message)
      })
    },
    
    // 示例:打开灯光
    turnOnLight(entityId) {
      this.callService('light', 'turn_on', {
        entity_id: entityId,
        brightness: 200
      })
    }
  },
  
  mounted() {
    this.connectWebSocket()
  },
  
  beforeDestroy() {
    if (this.ws) {
      uni.closeSocket()
    }
  }
}
```

---

## 常用服务域和服务

### light (灯光)
- `turn_on`: 打开灯光
  - 参数: `entity_id`, `brightness`, `rgb_color`, `color_temp`
- `turn_off`: 关闭灯光
- `toggle`: 切换状态

### switch (开关)
- `turn_on`: 打开开关
- `turn_off`: 关闭开关
- `toggle`: 切换状态

### climate (空调/恒温器)
- `set_temperature`: 设置温度
  - 参数: `entity_id`, `temperature`, `hvac_mode`
- `set_hvac_mode`: 设置模式
  - 参数: `entity_id`, `hvac_mode` (如 `heat`, `cool`, `auto`)

### cover (窗帘/遮盖物)
- `open_cover`: 打开
- `close_cover`: 关闭
- `set_cover_position`: 设置位置
  - 参数: `entity_id`, `position` (0-100)

### media_player (媒体播放器)
- `media_play`: 播放
- `media_pause`: 暂停
- `volume_set`: 设置音量
  - 参数: `entity_id`, `volume_level` (0-1)

### homeassistant (系统服务)
- `turn_on`: 打开实体
- `turn_off`: 关闭实体
- `toggle`: 切换实体状态
- `restart`: 重启 Home Assistant

---

## 最佳实践

### 1. 错误处理
```javascript
uni.request({
  url: 'http://IP_ADDRESS:8123/api/states',
  method: 'GET',
  header: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  success: (res) => {
    if (res.statusCode === 200) {
      console.log('成功:', res.data)
    } else if (res.statusCode === 401) {
      console.error('认证失败,请检查 Token')
    } else {
      console.error('请求失败:', res.statusCode)
    }
  },
  fail: (err) => {
    console.error('网络错误:', err)
  }
})
```

### 2. WebSocket 重连机制
```javascript
let reconnectAttempts = 0
const maxReconnectAttempts = 5

function connectWithReconnect() {
  const ws = new WebSocket('ws://IP_ADDRESS:8123/api/websocket')
  
  ws.onclose = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++
      setTimeout(() => {
        console.log(`尝试重连 (${reconnectAttempts}/${maxReconnectAttempts})`)
        connectWithReconnect()
      }, 3000)
    }
  }
  
  ws.onopen = () => {
    reconnectAttempts = 0
  }
}
```

### 3. Token 安全存储
```javascript
// 存储 Token
uni.setStorageSync('ha_token', 'YOUR_TOKEN')

// 读取 Token
const token = uni.getStorageSync('ha_token')

// 不要在代码中硬编码 Token
```

### 4. 批量操作优化
```javascript
// 使用 WebSocket 批量获取状态,而不是多次 REST 请求
const message = {
  id: 1,
  type: 'get_states'
}
```

---

## 调试技巧

### 1. 使用浏览器开发者工具
- 查看 WebSocket 消息: Network → WS
- 查看 HTTP 请求: Network → XHR/Fetch

### 2. 日志记录
```javascript
// 记录所有 WebSocket 消息
uni.onSocketMessage((res) => {
  console.log('[WS 收到]', JSON.stringify(res.data, null, 2))
})

// 记录所有发送的消息
function sendWSMessage(message) {
  console.log('[WS 发送]', JSON.stringify(message, null, 2))
  uni.sendSocketMessage({
    data: JSON.stringify(message)
  })
}
```

### 3. 使用 curl 测试 REST API
```bash
curl -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:8123/api/states
```

---

## 参考资源

- [REST API 官方文档](https://developers.home-assistant.io/docs/api/rest/)
- [WebSocket API 官方文档](https://developers.home-assistant.io/docs/api/websocket/)
- [Home Assistant 开发者文档](https://developers.home-assistant.io/)
