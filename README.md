# TaskGantt - 任务甘特图管理系统

一个基于 Vue 3 的任务管理应用，支持甘特图和看板两种视图，用于可视化管理和追踪任务进度。

## 项目特性

- **甘特图视图**：可视化展示任务时间线、依赖关系、进度状态
- **看板视图**：按状态分类展示任务，支持拖拽切换状态
- **任务层级**：支持父子任务关系，自动计算父任务进度
- **状态联动**：父任务状态与子任务状态自动联动
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
│       └── useTaskTree.js     # 任务树选择
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
  dependencies: string[],  // 依赖任务ID列表
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
