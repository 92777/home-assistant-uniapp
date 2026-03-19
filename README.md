# home-assistant-uniapp

一个面向手机端和 Pad 端的 Home Assistant 客户端项目。

这个项目的目标，不是简单把 HA Web 页面包一层，而是把 Home Assistant 里的房间、设备、实体、场景执行、状态变更和室内环境信息，整理成更适合移动端日常使用的一套交互界面。

当前界面风格基于 `reference.html` 继续演进，整体使用统一的天气动态背景、毛玻璃卡片、移动端优先布局，并兼顾 Pad 横向空间。

## 项目定位

- 面向 Home Assistant 的跨端客户端，当前重点是 `H5` 和 `UniApp` 移动端体验。
- 强调“房间 -> 设备 -> 实体类型 -> 实体”的可理解结构，而不是直接暴露一整页实体列表。
- 优先展示对人有意义的设备、运行状态、室内环境、通知和健康信息。
- 支持本地开发时通过 Vite 代理接入远端 Home Assistant，避免浏览器跨域问题。

## 当前功能

### 1. 首页

- 展示天气、动态天气背景和城市信息
- 展示室内环境实时数据与 24 小时变化切换
- 展示正在运行的真实设备
- 展示常用设备卡片
- 展示 WebSocket 推送的设备通知和高优先级提醒

### 2. 设备页

- 按房间展示设备
- 每台设备支持弹出详情面板
- 详情面板按实体类型分组，例如灯光、开关、风机、温控、传感器、状态
- 设备控制带防抖和 loading，优先等待 WS 状态确认

### 3. 场景页

- 作为执行中心使用
- 可承载场景、脚本和常用服务动作
- 支持展示最近执行结果

### 4. 搜索页

- 搜索房间、设备和实体
- 可从搜索结果跳转并定位到目标设备

### 5. 我的页

- 展示连接状态
- 展示设备健康概览
- 作为个人信息、入口和偏好聚合页

### 6. 实时能力

- 通过 Home Assistant WebSocket 订阅 `state_changed`
- 接收设备状态变化通知
- 显示轻量连接状态点，区分 `实时`、`重连`、`连接`、`REST`

## 技术栈

- `Vue 3`
- `Pinia`
- `UniApp`
- `Vite`
- `Home Assistant REST API`
- `Home Assistant WebSocket API`

## 目录结构

```text
src/
├── api/
│   └── ha-api.js              # Home Assistant API、WS、登录和天气请求封装
├── components/
│   ├── ConnectionStatusDot.vue
│   ├── CustomTabbar.vue
│   └── WeatherBackdrop.vue
├── pages/
│   ├── login/
│   ├── search/
│   ├── home/
│   ├── devices/
│   ├── scenes/
│   └── profile/
├── store/
│   └── ha-store.js            # 全局状态、实体缓存、通知、趋势、控制状态
├── styles/
│   ├── common.css
│   └── iconfont.css
├── utils/
│   ├── device-catalog.js      # 房间/设备/实体展示模型
│   ├── insights.js            # 趋势、健康、通知、执行中心
│   └── weather.js             # 天气解析与场景映射
├── App.vue
├── main.js
└── pages.json
```

## 页面结构

- `pages/login/login`
  负责用户名密码登录、MFA 验证
- `pages/home/home`
  负责首页概览、通知中心、室内环境和常用设备
- `pages/devices/devices`
  负责房间与设备目录、设备详情和实体控制
- `pages/scenes/scenes`
  负责执行中心
- `pages/search/search`
  负责搜索与定位
- `pages/profile/profile`
  负责连接状态、设备健康和个人入口

## 数据模型说明

这个项目内部不是直接拿 HA 原始实体列表平铺展示，而是做了一层整理：

1. 从 HA 拉取 `states`
2. 通过注册表拉取 `area / device / entity registry`
3. 组合成“房间 -> 设备 -> 实体”
4. 再按实体类型分组，形成适合界面展示的结构

这层转换主要集中在：

- `src/utils/device-catalog.js`
- `src/store/ha-store.js`

## 本地开发

### 环境要求

- `Node.js >= 16`
- `npm >= 8`

### 安装依赖

```bash
npm install
```

### 启动 H5 开发

```bash
npm run dev:h5
```

默认启动地址：

```text
http://localhost:8080/
```

### 构建 H5

```bash
npm run build:h5
```

### 启动 App 构建

```bash
npm run dev:app
```

## H5 本地代理

为了避免浏览器直接请求远端 Home Assistant 时出现跨域问题，H5 开发模式建议通过本地代理访问。

项目已提供示例文件：

```text
.env.example
```

本地开发时，在项目根目录新建 `.env.local`：

```bash
cp .env.example .env.local
```

然后把里面的地址改成你自己的 Home Assistant 地址：

```env
VITE_HA_PROXY_TARGET=https://your-home-assistant.example.com
```

修改后重新启动 `npm run dev:h5` 即可。

说明：

- `.env.local` 已在 `.gitignore` 中忽略
- 不要把真实服务器地址、Token、账号密码提交到仓库

## 登录方式

当前登录流程以 Home Assistant 官方登录流为主：

- 用户名 + 密码
- 支持 MFA
- 登录成功后会缓存 `ha_url` 和 `ha_token`
- 应用重启后会优先尝试自动连接

## 天气与背景

- 天气数据当前接入中国天气网相关接口
- 首页和其他页面共用统一的天气背景组件
- 会根据天气场景切换为晴、多云、雨、雪、沙尘、雷暴等背景表现

## 当前重点能力

- 设备控制的 WS 确认与防抖
- 设备健康过滤误报
- 室内环境 24h 变化
- 通知中心
- 连接状态感知
- 手机端和 Pad 端兼容布局

## 注意事项

- Home Assistant 的真实可用设备、实体、服务，以当前接入实例为准
- 某些页面能力依赖 WS 和注册表，如果代理未配置好，H5 下可能退化到 REST 模式
- 本项目当前更适合作为移动端家庭控制面板，不是完整替代 HA Web 的管理后台

## 许可证

MIT
