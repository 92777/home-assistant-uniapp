# Home Assistant UniApp

基于 UniApp 开发的 Home Assistant 移动端客户端，提供现代化的智能家居控制界面。

## 功能特性

- 🏠 **首页**: 展示天气、室内环境、正在运行的设备和常用设备
- 📱 **设备管理**: 按房间分组展示设备，支持展开查看实体详情
- 🎬 **场景模式**: 一键执行预设场景，快速切换家居模式
- 👤 **个人中心**: 用户信息、设置和连接状态管理

## 技术栈

- **前端框架**: Vue 3 + UniApp
- **状态管理**: Pinia
- **构建工具**: Vite
- **UI 设计**: 毛玻璃风格，参考 reference.html

## 项目结构

```
src/
├── api/              # API 服务
│   └── ha-api.js     # Home Assistant API 封装
├── components/       # 公共组件
│   └── CustomTabbar.uvue
├── pages/            # 页面
│   ├── home/         # 首页
│   ├── devices/      # 设备页
│   ├── scenes/       # 场景页
│   ├── profile/      # 我的页
│   └── login/        # 登录页
├── store/            # 状态管理
│   └── ha-store.js   # Home Assistant 状态管理
├── styles/           # 样式文件
│   ├── common.css    # 通用样式
│   └── iconfont.css  # 图标字体
├── App.uvue          # 应用入口
├── main.js           # 主入口
└── pages.json        # 页面配置
```

## 开发指南

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
# H5 开发
npm run dev:h5

# App 开发
npm run dev:app
```

### 构建生产版本

```bash
# 构建 H5
npm run build:h5

# 构建 App
npm run build:app
```

## 使用说明

### 1. 获取 Home Assistant 访问令牌

1. 登录 Home Assistant Web 界面
2. 进入个人资料页面 (http://IP_ADDRESS:8123/profile)
3. 在"长期访问令牌"部分创建新令牌
4. 复制生成的令牌

### 2. 连接 Home Assistant

1. 启动应用后，会自动跳转到登录页
2. 输入 Home Assistant 服务器地址 (如: http://192.168.1.100:8123)
3. 输入访问令牌
4. 点击"连接"按钮

### 3. 控制设备

- **首页**: 点击常用设备卡片可以快速控制
- **设备页**: 按房间查看所有设备，点击展开查看实体详情
- **场景页**: 点击场景卡片执行预设场景

## 开发规范

详见 `.trae/skills/development-guidelines/SKILL.md`

### 核心原则

1. **数据与样式分离**: 通过 Vue 的数据绑定实现，不要在处理完数据之后再去操作样式
2. **数据缓存**: 尽可能缓存账号、房间、设备、实体、实体状态等信息
3. **代码复用**: 抽取公共组件和工具函数，避免重复代码
4. **API 文档遵循**: 所有开发基于 API 文档，禁止幻想不存在的字段或接口

## API 文档

详见 `.trae/skills/home-assistant-api/SKILL.md`

### REST API

- `GET /api/states`: 获取所有实体状态
- `GET /api/states/<entity_id>`: 获取特定实体状态
- `POST /api/services/<domain>/<service>`: 调用服务

### WebSocket API

- 实时订阅状态变化事件
- 实时接收设备状态更新

## 注意事项

1. **本地调试**: 使用 Vite 服务器进行调试，运行 `npm run dev:h5`
2. **代码修改**: 禁止在未经同意的情况下大面积修改代码
3. **日志管理**: 非必要不要创建过多的日志进行调试
4. **版本管理**: 不要创建过多的易混淆的备份版本

## 许可证

MIT License
