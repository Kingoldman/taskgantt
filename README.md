# TaskGantt - 任务甘特图管理系统

一个基于 Vue 3 的任务管理应用，支持甘特图和看板两种视图，用于可视化管理和追踪任务进度。

## 项目特性

- **甘特图视图**：可视化展示任务时间线、依赖关系、进度状态
- **看板视图**：按状态分类展示任务，支持拖拽切换状态
- **任务层级**：支持父子任务关系，自动计算父任务进度
- **任务依赖**：支持设置前置任务依赖关系，自动检查时间约束
- **任务插入**：支持在指定位置插入新任务，灵活调整任务顺序
- **状态联动**：父任务状态与子任务状态自动联动
- **时间边界检查**：智能检测任务时间变化对前置任务和父任务的影响
- **自适应屏幕**：一键自适应屏幕宽度，支持自定义边距
- **导出功能**：支持导出甘特图为 PNG 图片
- **数据持久化**：使用 localStorage 保存任务数据和显示设置

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **Element Plus** - UI 组件库
- **Tailwind CSS** - 原子化 CSS 框架
- **Vite** - 构建工具

## 目录结构

```
src/
├── components/                 # 组件目录
│   ├── GanttView.vue          # 甘特图视图组件
│   ├── KanbanView.vue         # 看板视图组件
│   ├── TaskCard.vue           # 任务卡片组件
│   └── TaskForm.vue           # 任务表单组件
│
├── composables/               # 组合式函数目录
│   ├── gantt/                 # 甘特图相关逻辑
│   │   ├── index.js           # 导出模块
│   │   ├── useTimeScale.js    # 时间刻度管理
│   │   ├── useTimeRange.js    # 时间范围计算
│   │   ├── useTimeCalculation.js # 时间位置计算
│   │   ├── useTaskOrganization.js # 任务组织（折叠/隐藏）
│   │   ├── useDependencyLines.js # 依赖线计算
│   │   ├── useFitToScreen.js  # 自适应屏幕
│   │   └── useExport.js       # 导出功能
│   │
│   ├── kanban/                # 看板相关逻辑
│   │   ├── index.js           # 导出模块
│   │   ├── useStatusChange.js # 状态变更处理
│   │   └── useTaskNumbering.js # 任务编号生成
│   │
│   └── task-form/             # 任务表单相关逻辑
│       ├── index.js           # 导出模块
│       ├── useFormValidation.js # 表单验证
│       ├── useDateLogic.js    # 日期逻辑
│       ├── useStatusLinkage.js # 状态联动
│       ├── useTaskTree.js     # 任务树选择与插入位置
│       └── useTimeBoundaryCheck.js # 时间边界检查
│
├── config/                    # 配置目录
│   └── ganttConfig.js         # 甘特图配置（时间刻度、缩放等）
│
├── data/                      # 数据目录
│   └── sampleTasks.js         # 示例任务数据
│
├── router/                    # 路由目录
│   └── index.js               # 路由配置
│
├── stores/                    # 状态管理目录
│   └── task.js                # 任务状态 Store
│
├── styles/                    # 样式目录
│   └── tailwind.css           # Tailwind CSS 入口
│
├── types/                     # 类型定义目录
│   └── task.js                # 任务类型定义和工具函数
│
├── views/                     # 视图目录
│   └── HomeView.vue           # 主页视图
│
├── App.vue                    # 根组件
└── main.js                    # 应用入口
```

## 核心逻辑说明

### 任务数据结构

```javascript
{
  id: string,              // 任务唯一标识
  title: string,           // 任务标题
  description: string,     // 任务描述
  status: 'todo' | 'inprogress' | 'done', // 任务状态
  priority: 'high' | 'medium' | 'low',    // 优先级
  startDate: string,       // 开始日期 (YYYY-MM-DD)
  endDate: string,         // 结束日期 (YYYY-MM-DD)
  progress: number,        // 进度百分比 (0-100)
  parentId: string | null, // 父任务ID
  dependencies: string[],  // 依赖任务ID列表（前置任务）
  leader: string,          // 牵头领导
  department: string,      // 牵头单位
  createdAt: string,       // 创建时间
  updatedAt: string        // 更新时间
}
```

### 状态联动规则

- 父任务进度 = 所有子任务进度的平均值
- 所有子任务完成 → 父任务自动标记为完成
- 任一子任务进行中 → 父任务自动标记为进行中
- 所有子任务待办 → 父任务保持待办状态

### 任务依赖规则

- 后续任务的开始日期 ≥ 前置任务的开始日期
- 前置任务开始后，后续任务才能开始
- 支持多级依赖链：A → B → C（递归检查）

### 时间边界检查

当修改任务时间时，系统会自动检测并提示影响：

1. **前置任务依赖调整**：如果后续任务开始时间早于前置任务，自动调整前置任务开始时间
2. **父任务时间范围调整**：如果子任务时间超出父任务范围，自动调整父任务时间
3. **递归向上检查**：检查所有祖先任务是否受影响

### 任务插入功能

新建任务时支持选择插入位置：

- **插入到最前面**：新任务成为第一个子任务
- **插入到指定任务之后**：新任务插入到指定位置
- **添加到末尾**：默认行为

### 甘特图时间计算

- **时间范围**：根据可见任务的最早开始日期和最晚结束日期计算
- **边距设置**：支持自定义左右边距（天数），通过 localStorage 持久化
- **位置计算**：任务条位置根据时间刻度（日/周/月/季/年）动态计算
- **今日线**：显示在今日网格的右侧边缘

## 快速开始

### 安装依赖

```sh
npm install
```

### 开发模式

```sh
npm run dev
```

### 生产构建

```sh
npm run build
```

## 功能截图

### 甘特图视图

- 支持日/周/月/季/年五种时间刻度
- 任务条显示进度、状态、优先级
- 依赖箭头线展示任务关系
- 今日线标记当前日期
- 支持折叠/展开层级任务

### 看板视图

- 四列布局：待办、进行中、已完成、超期未完成
- 任务卡片展示关键信息
- 支持状态切换

### 任务表单

- 完整的任务信息编辑
- 树形选择父任务和前置任务
- 插入位置选择
- 时间边界变化智能提示

## 开发说明

### 代码组织原则

- **组件层**：只负责 UI 渲染和用户交互
- **Composable 层**：封装可复用的业务逻辑
- **Store 层**：管理应用状态和数据持久化

### Composable 职责划分

| Composable | 职责 |
|------------|------|
| useTimeBoundaryCheck | 时间边界检查、前置任务链递归检查、确认对话框内容生成 |
| useTaskTree | 任务树数据构建、父任务选择、插入位置选项计算 |
| useFormValidation | 表单验证规则 |
| useDateLogic | 日期处理逻辑 |
| useStatusLinkage | 状态联动逻辑 |
