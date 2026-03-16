<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  ZoomIn,
  ZoomOut,
  FullScreen,
  Close,
  Plus,
  Download,
  InfoFilled,
  Monitor,
  Edit,
  Setting,
  Hide,
  View,
  Delete,
} from '@element-plus/icons-vue'
import { ZOOM_CONFIG } from '@/config/ganttConfig.js'
import {
  useTimeScale,
  useTaskOrganization,
  useTimeCalculation,
  useTimeRange,
  useDependencyLines,
  useExport,
  useFitToScreen,
} from '@/composables/gantt/index.js'

const props = defineProps({
  tasks: {
    type: Array,
    required: true,
  },
  searchQuery: {
    type: String,
    default: '',
  },
  isTaskMatched: {
    type: Function,
    default: () => false,
  },
})

const emit = defineEmits(['delete', 'taskClick', 'add-sub-task', 'edit'])

// DOM 引用
const timelineRef = ref(null)
const timelineHeaderRef = ref(null)
const taskListRef = ref(null)
const ganttContainerRef = ref(null)
const ganttBodyRef = ref(null)

// 显示控制
const showTodayLine = ref(true)
const showDependencyArrows = ref(true)
const showExternalLabels = ref(true)
const isFullscreen = ref(false)
const scrollLeft = ref(0)

// 使用 composables
const tasksRef = computed(() => props.tasks)

const {
  timeScales,
  currentScale,
  cellWidth,
  baseCellWidth,
  zoomSliderValue,
  saveDisplaySettingsToStorage,
  handleScaleChange,
  handleZoomSliderChange,
  resetZoom,
  setZoom,
  initScale,
} = useTimeScale()

// 加载保存的滚动位置
const savedDisplaySettings = JSON.parse(localStorage.getItem('gantt-display-settings') || '{}')
const savedScrollLeft = savedDisplaySettings.scrollLeft || 0
const savedScrollTop = savedDisplaySettings.scrollTop || 0

const {
  collapsedIds,
  hiddenIds,
  hiddenTaskTitles,
  organizedTasks,
  toggleCollapse,
  toggleHidden,
  showAllHidden,
  toggleHiddenByTitle,
  isTaskOrAncestorHidden,
} = useTaskOrganization(tasksRef)

const {
  timeRangeStartPadding,
  timeRangeEndPadding,
  fitStartPadding,
  fitEndPadding,
  timeRange,
  generateTimeColumns,
  updatePadding,
} = useTimeRange(props, currentScale, isTaskOrAncestorHidden)

const timeColumns = computed(() => generateTimeColumns(timeScales, cellWidth.value))
const timelineWidth = computed(() => timeColumns.value.length * cellWidth.value)

const {
  COLORS,
  todayLineLeft,
  getTaskBarStyle,
  isTaskOverdue,
  getStatusColor,
  getStatusColorLight,
  getStatusLabel,
  getProgressColor,
  getTaskBarBackgroundColor,
  getTotalDays,
  getWorkDays,
} = useTimeCalculation(props, timeRange, cellWidth, currentScale, timeScales)

const {
  getDependencyLine,
  getDependencyTitle,
  isDependencyStarted,
} = useDependencyLines(organizedTasks, getTaskBarStyle, COLORS)

const {
  isExporting,
  showExportConfirmDialog,
  showProgressDialog,
  exportProgress,
  exportProgressText,
  exportToPDF,
  doExport,
} = useExport()

const {
  showFitPaddingDialog,
  tempFitStartPadding,
  tempFitEndPadding,
  fitToScreen,
  openFitPaddingDialog,
} = useFitToScreen()

// 计算属性
const isTodayVisible = computed(() => {
  if (!timelineRef.value) return false
  const containerWidth = timelineRef.value.clientWidth
  const leftEdge = scrollLeft.value
  const rightEdge = scrollLeft.value + containerWidth
  return todayLineLeft.value >= leftEdge && todayLineLeft.value <= rightEdge
})

// 防抖保存滚动位置
let scrollSaveTimer = null
function debouncedSaveScrollPosition() {
  if (scrollSaveTimer) clearTimeout(scrollSaveTimer)
  scrollSaveTimer = setTimeout(() => {
    saveDisplaySettingsToStorage(
      timelineRef.value?.scrollLeft || 0,
      timelineRef.value?.scrollTop || 0
    )
  }, 300)
}

// 处理滚动
function handleScroll(e) {
  scrollLeft.value = e.target.scrollLeft
  if (timelineHeaderRef.value) {
    timelineHeaderRef.value.style.transform = `translateX(-${e.target.scrollLeft}px)`
  }
  if (taskListRef.value) {
    taskListRef.value.scrollTop = e.target.scrollTop
  }
  debouncedSaveScrollPosition()
}

// 处理任务列表滚动
function handleTaskListScroll(e) {
  if (timelineRef.value) {
    timelineRef.value.scrollTop = e.target.scrollTop
  }
}

// 处理任务行点击
function handleTaskRowClick(task) {
  if (task.children && task.children.length > 0) {
    toggleCollapse(task.id)
  }
}

// 处理任务点击
function handleTaskClick(task) {
  emit('taskClick', task)
}

function handleDelete(task) {
  emit('delete', task)
}

function handleEdit(task) {
  emit('edit', task)
}

function handleAddSubTask(parentTask) {
  emit('add-sub-task', {
    parentId: parentTask.id,
    parentTitle: parentTask.title,
    startDate: parentTask.startDate,
    endDate: parentTask.endDate,
    department: parentTask.department,
    leader: parentTask.leader,
  })
}

// 滚动到今天
function scrollToToday() {
  if (timelineRef.value) {
    const containerWidth = timelineRef.value.clientWidth
    const left = todayLineLeft.value - containerWidth / 2
    timelineRef.value.scrollLeft = Math.max(0, left)
  }
}

// 全屏切换
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

// 处理导出确认
async function handleConfirmExport() {
  showExportConfirmDialog.value = false
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 100))
  await doExport(ganttBodyRef)
}

// 执行自适应
async function handleFitToScreen() {
  await fitToScreen(
    timelineRef,
    props.tasks,
    isTaskOrAncestorHidden,
    timeRange,
    currentScale,
    timeScales,
    fitStartPadding,
    fitEndPadding,
    timeRangeStartPadding,
    timeRangeEndPadding,
    baseCellWidth,
    setZoom
  )
}

// 打开自适应参数设置对话框
function handleOpenFitPaddingDialog() {
  tempFitStartPadding.value = fitStartPadding.value
  tempFitEndPadding.value = fitEndPadding.value
  showFitPaddingDialog.value = true
}

// 应用自适应参数设置
function applyFitPaddingSettings() {
  updatePadding(tempFitStartPadding.value, tempFitEndPadding.value)
  showFitPaddingDialog.value = false
  nextTick(() => {
    handleFitToScreen()
  })
}

// 重置自适应参数为默认值
function resetFitPaddingToDefault() {
  tempFitStartPadding.value = 1
  tempFitEndPadding.value = 15
}

// 检查是否是页面刷新
function isPageRefresh() {
  const fromViewSwitch = sessionStorage.getItem('gantt-from-view-switch')
  if (fromViewSwitch) {
    sessionStorage.removeItem('gantt-from-view-switch')
    return false
  }
  return true
}

// 标记即将切换视图
function markViewSwitch() {
  sessionStorage.setItem('gantt-from-view-switch', 'true')
}

// 生命周期钩子
onMounted(() => {
  if (isPageRefresh()) {
    nextTick(() => {
      handleFitToScreen()
    })
  } else {
    initScale()
    nextTick(() => {
      // 恢复保存的滚动位置
      if (timelineRef.value) {
        timelineRef.value.scrollLeft = savedScrollLeft
        timelineRef.value.scrollTop = savedScrollTop
      }
      if (taskListRef.value) {
        taskListRef.value.scrollTop = savedScrollTop
      }
    })
  }
})

onUnmounted(() => {
  markViewSwitch()
})

// 监听显示设置变化
watch(
  [currentScale, zoomSliderValue, showTodayLine, showDependencyArrows, showExternalLabels],
  () => {
    saveDisplaySettingsToStorage(
      timelineRef.value?.scrollLeft || 0,
      timelineRef.value?.scrollTop || 0
    )
  },
  { deep: true }
)

// 监听任务变化
watch(
  () => props.tasks,
  () => {
    requestAnimationFrame(() => {
      scrollToToday()
    })
  },
  { deep: true }
)

defineExpose({
  isFullscreen,
})
</script>

<template>
  <div
    ref="ganttContainerRef"
    class="gantt-view flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden"
    :class="{ 'gantt-fullscreen': isFullscreen }"
  >
    <!-- 工具栏 -->
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50"
      style="min-width: 900px"
    >
      <el-button-group class="flex-shrink-0">
        <el-button
          v-for="scale in timeScales"
          :key="scale.value"
          :type="currentScale === scale.value ? 'primary' : 'default'"
          size="small"
          class="whitespace-nowrap"
          @click="handleScaleChange(scale.value)"
        >
          {{ scale.label }}
        </el-button>
      </el-button-group>

      <div class="flex items-center gap-2">
        <el-checkbox v-model="showTodayLine" size="small">今日线</el-checkbox>
        <el-checkbox v-model="showDependencyArrows" size="small"
          >依赖箭头</el-checkbox
        >
        <el-checkbox v-model="showExternalLabels" size="small"
          >条外标签</el-checkbox
        >
        <el-divider direction="vertical" />
        <el-button
          :type="isTodayVisible ? 'default' : 'primary'"
          link
          size="small"
          @click="scrollToToday"
        >
          回到今天
        </el-button>
        <el-divider direction="vertical" />
        <el-slider
          v-model="zoomSliderValue"
          :min="ZOOM_CONFIG.min"
          :max="ZOOM_CONFIG.max"
          :show-tooltip="false"
          size="small"
          style="width: 100px"
          @input="handleZoomSliderChange"
        />
        <span
          class="text-xs ml-1 min-w-[36px] cursor-pointer select-none"
          :class="
            zoomSliderValue !== 100
              ? 'text-blue-500 hover:text-blue-600'
              : 'text-gray-500'
          "
          :title="zoomSliderValue !== 100 ? '点击重置为100%' : ''"
          @click="zoomSliderValue !== 100 && resetZoom()"
        >
          {{ zoomSliderValue }}%
        </span>
        <el-divider direction="vertical" />
        <el-button
          type="default"
          link
          size="small"
          @click="handleFitToScreen"
          title="自适应屏幕"
        >
          <el-icon><Monitor /></el-icon>
          <span class="ml-1">自适应</span>
        </el-button>
        <el-button
          type="default"
          link
          size="small"
          @click="handleOpenFitPaddingDialog"
          title="自适应参数设置"
        >
          <el-icon><Setting /></el-icon>
        </el-button>
        <el-divider direction="vertical" />
        <el-button
          v-if="!isFullscreen"
          type="default"
          link
          size="small"
          @click="toggleFullscreen"
          title="全屏"
        >
          <el-icon><FullScreen /></el-icon>
          <span class="ml-1">全屏</span>
        </el-button>
        <el-button
          v-else
          type="primary"
          link
          size="small"
          @click="toggleFullscreen"
          title="退出全屏"
        >
          <el-icon><Close /></el-icon>
          <span class="ml-1">退出全屏</span>
        </el-button>
        <el-divider direction="vertical" />
        <el-button
          type="primary"
          link
          size="small"
          :loading="isExporting"
          @click="exportToPDF"
          title="导出图片"
        >
          <el-icon v-if="!isExporting"><Download /></el-icon>
          {{ isExporting ? '导出中...' : '导出图片' }}
        </el-button>
      </div>
    </div>

    <!-- 甘特图内容区域 -->
    <div
      ref="ganttBodyRef"
      class="flex-1 relative flex flex-col"
      style="min-height: 0"
    >
      <!-- 甘特图主体 -->
      <div class="flex-1 relative" style="min-height: 0">
        <div class="gantt-grid h-full">
          <!-- 左侧任务列表 -->
          <div class="gantt-task-list border-r border-gray-200 bg-white">
            <!-- 表头 -->
            <div
              class="gantt-header h-10 flex items-center justify-center px-3 border-b border-gray-200 bg-gray-50 font-medium text-sm text-gray-700 relative"
            >
              <span class="absolute left-1/2 -translate-x-1/2">任务名称</span>
              <el-dropdown
                v-if="hiddenIds.size > 0"
                trigger="click"
                placement="bottom-end"
                class="ml-auto"
              >
                <el-button
                  type="warning"
                  link
                  size="small"
                  title="已隐藏的任务"
                >
                  <el-icon><Hide /></el-icon>
                  <span class="ml-1">{{ hiddenIds.size }}</span>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <div class="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                      点击任务可取消隐藏
                    </div>
                    <el-dropdown-item
                      v-for="title in hiddenTaskTitles"
                      :key="title"
                      @click="toggleHiddenByTitle(title)"
                    >
                      <div class="flex items-center gap-2 max-w-[200px]">
                        <el-icon class="text-warning"><Hide /></el-icon>
                        <span class="truncate">{{ title }}</span>
                      </div>
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="showAllHidden">
                      <div class="flex items-center gap-2 text-primary">
                        <el-icon><View /></el-icon>
                        <span>显示全部</span>
                      </div>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <!-- 任务列表 - 可滚动 -->
            <div
              ref="taskListRef"
              class="gantt-body"
              @scroll="handleTaskListScroll"
            >
              <div
                v-for="task in organizedTasks"
                :key="task.id"
                class="h-12 flex items-center border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer group relative"
                :class="{ 'bg-yellow-50': searchQuery && isTaskMatched(task) }"
                :style="{ paddingLeft: `${16 + task.level * 20}px` }"
                @click="handleTaskRowClick(task)"
              >
                <div class="flex-1 min-w-0 flex items-center gap-1 pr-2">
                  <span
                    v-if="task.children && task.children.length > 0"
                    class="text-gray-400 text-xs cursor-pointer hover:text-gray-600 select-none w-4"
                    @click.stop="toggleCollapse(task.id)"
                  >
                    {{ collapsedIds.has(task.id) ? '▶' : '▼' }}
                  </span>
                  <span
                    v-else-if="task.level > 0"
                    class="text-gray-300 text-xs w-4"
                    >└</span
                  >
                  <span v-else class="w-4"></span>
                  <div class="flex-1 min-w-0">
                    <el-tooltip
                      placement="top"
                      :show-after="500"
                      effect="dark"
                    >
                      <template #content>
                        <div class="max-w-[300px]">
                          <div class="font-medium">{{ task.title }}</div>
                          <div class="text-xs text-gray-300 mt-1">
                            {{ task.leader || '未分配' }} · {{ task.department || '未指定' }}
                          </div>
                          <div class="text-xs text-gray-400 mt-1">
                            {{ task.startDate }} ~ {{ task.endDate }}
                          </div>
                        </div>
                      </template>
                      <div
                        class="text-sm text-gray-900 truncate hover:text-blue-600 cursor-default"
                        :class="{
                          'text-yellow-700': searchQuery && isTaskMatched(task),
                        }"
                      >
                        <span
                          v-if="task.displayNumber"
                          class="text-gray-500 mr-0.5"
                          >{{ task.displayNumber }}</span
                        >{{ task.title }}
                      </div>
                    </el-tooltip>
                    <div class="text-xs text-gray-500 truncate">
                      {{ task.leader || '未分配' }} ·
                      {{ task.department || '未指定' }}
                    </div>
                  </div>
                </div>
                <!-- 操作按钮 -->
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center bg-white/95 shadow-sm rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <el-button
                    type="primary"
                    link
                    size="small"
                    @click.stop="handleEdit(task)"
                    title="编辑任务"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button
                    type="primary"
                    link
                    size="small"
                    @click.stop="handleAddSubTask(task)"
                    title="添加子任务"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-button>
                  <el-button
                    type="warning"
                    link
                    size="small"
                    @click.stop="toggleHidden(task.id)"
                    title="隐藏任务"
                  >
                    <el-icon><Hide /></el-icon>
                  </el-button>
                  <el-button
                    type="danger"
                    link
                    size="small"
                    @click.stop="handleDelete(task)"
                    title="删除任务"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <!-- 右侧时间轴 -->
          <div class="gantt-timeline relative">
            <!-- 时间刻度表头 -->
            <div
              class="gantt-header-fixed border-b border-gray-200 bg-gray-50 relative"
              style="height: 40px"
            >
              <div
                ref="timelineHeaderRef"
                class="gantt-header-inner"
                :style="{ width: `${timelineWidth}px` }"
              >
                <div
                  v-for="col in timeColumns"
                  :key="col.key"
                  class="flex-shrink-0 flex items-center justify-center border-r border-gray-200 text-xs text-gray-600 relative"
                  :style="{ width: `${cellWidth}px` }"
                >
                  {{ col.label }}
                </div>
              </div>
            </div>
            <!-- 任务条区域 -->
            <div
              ref="timelineRef"
              class="gantt-timeline-scroll"
              @scroll="handleScroll"
            >
              <div
                :style="{ width: `${timelineWidth}px`, position: 'relative' }"
              >
                <!-- 今日线 -->
                <div
                  v-if="showTodayLine"
                  class="absolute top-0 bottom-0 pointer-events-none"
                  :style="{
                    left: `${todayLineLeft}px`,
                    width: '1px',
                    backgroundColor: COLORS.danger,
                    zIndex: 20,
                  }"
                />
                <!-- 任务条区域 -->
                <div class="relative">
                  <!-- 网格线 -->
                  <div class="absolute inset-0 flex pointer-events-none z-0">
                    <div
                      v-for="(col, index) in timeColumns"
                      :key="`grid-${col.key}`"
                      class="flex-shrink-0 border-r"
                      :style="{
                        width: `${cellWidth}px`,
                        borderColor: COLORS.border,
                        backgroundColor:
                          index % 2 === 0
                            ? 'rgba(200, 210, 230, 0.06)'
                            : 'transparent',
                      }"
                    />
                  </div>

                  <!-- 任务条 -->
                  <div
                    v-for="task in organizedTasks"
                    :key="task.id"
                    class="h-12 flex items-center px-2 relative border-b border-gray-100"
                  >
                    <!-- 任务条容器 -->
                    <div
                      class="gantt-bar-container absolute flex items-center"
                      :style="getTaskBarStyle(task)"
                    >
                      <!-- 任务条 -->
                      <el-tooltip
                        placement="top"
                        :show-after="300"
                        effect="dark"
                      >
                        <template #content>
                          <div class="task-tooltip-content">
                            <div class="font-medium text-white mb-1">{{ task.title }}</div>
                            <div v-if="isTaskOverdue(task) && task.progress < 100" class="mb-2 p-1 bg-red-500/30 rounded text-xs text-red-200 font-medium">
                              ⚠️ 该任务已超期！截止日期：{{ task.endDate }}
                            </div>
                            <div class="text-xs text-gray-200 space-y-1">
                              <div class="flex items-center gap-2">
                                <span class="text-gray-400">时间：</span>
                                <span>{{ task.startDate }} ~ {{ task.endDate }}</span>
                              </div>
                              <div class="flex items-center gap-2">
                                <span class="text-gray-400">负责人：</span>
                                <span>{{ task.leader || task.assignee || '未分配' }}</span>
                              </div>
                              <div class="flex items-center gap-2">
                                <span class="text-gray-400">部门：</span>
                                <span>{{ task.department || '未指定' }}</span>
                              </div>
                              <div class="flex items-center gap-2">
                                <span class="text-gray-400">进度：</span>
                                <span>{{ task.progress }}%</span>
                              </div>
                              <div class="flex items-center gap-2">
                                <span class="text-gray-400">状态：</span>
                                <span :style="{ color: getStatusColorLight(task) }">{{ getStatusLabel(task) }}</span>
                              </div>
                              <div v-if="task.dependencies && task.dependencies.length > 0" class="flex items-start gap-2 mt-1 pt-1 border-t border-gray-500">
                                <span class="text-gray-400">前置任务：</span>
                                <div class="flex flex-col">
                                  <span v-for="depId in task.dependencies" :key="depId" class="text-xs">
                                    {{ getDependencyTitle(depId, props.tasks) }}
                                    <span v-if="!isDependencyStarted(depId, props.tasks)" class="text-orange-400">(未开始)</span>
                                    <span v-else class="text-green-400">(已开始)</span>
                                  </span>
                                </div>
                              </div>
                              <div v-if="task.description" class="flex items-start gap-2 mt-1 pt-1 border-t border-gray-500">
                                <span class="text-gray-400">备注：</span>
                                <span class="max-w-[200px]">{{ task.description }}</span>
                              </div>
                            </div>
                          </div>
                        </template>
                        <div
                          class="gantt-bar rounded-md cursor-pointer overflow-hidden transition-all duration-200 flex-shrink-0"
                          :class="{
                            'ring-2 ring-yellow-400 ring-offset-1':
                              searchQuery && isTaskMatched(task),
                          }"
                          :style="{
                            width: '100%',
                            height: '30px',
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            zIndex: 1,
                          }"
                          @click="handleTaskClick(task)"
                        >
                          <!-- 任务条背景色层 -->
                          <div
                            class="absolute inset-0"
                            :style="{
                              backgroundColor: getTaskBarBackgroundColor(task),
                            }"
                          />
                          <!-- 进度条 -->
                          <div
                            v-if="task.status !== 'todo'"
                            class="absolute left-0 top-0 bottom-0 transition-all duration-300"
                            :style="{
                              width: `${task.progress}%`,
                              backgroundColor: getProgressColor(task),
                              borderTopLeftRadius: '6px',
                              borderBottomLeftRadius: '6px',
                            }"
                          />

                          <!-- 百分比数字 - 仅当任务条足够宽时显示在条内 -->
                          <div
                            v-if="task.status !== 'todo' && parseFloat(getTaskBarStyle(task).width) >= 32"
                            class="absolute inset-0 flex items-center justify-center px-1 z-10"
                          >
                            <span
                              class="text-sm truncate"
                              :style="{
                                color:
                                  isTaskOverdue(task) && task.progress < 100
                                    ? '#303133'
                                    : '#ffffff',
                                textShadow:
                                  '0 1px 3px rgba(0,0,0,0.4), 0 0 8px rgba(0,0,0,0.2)',
                              }"
                            >
                              {{ task.progress }}%
                            </span>
                          </div>

                          <!-- 待办任务显示 - 仅当任务条足够宽时显示 -->
                          <div
                            v-if="task.status === 'todo' && parseFloat(getTaskBarStyle(task).width) >= 32"
                            class="absolute inset-0 flex items-center justify-center px-1 z-10"
                          >
                            <span
                              class="text-xs truncate"
                              :style="{ color: COLORS.textRegular }"
                            >
                              待开始
                            </span>
                          </div>
                        </div>
                      </el-tooltip>

                      <!-- 任务信息（条外显示） -->
                      <div
                        v-if="showExternalLabels"
                        class="ml-2 text-xs text-gray-600 whitespace-nowrap flex items-center"
                      >
                        <!-- 窄任务条的百分比/状态显示（放在最前面） -->
                        <template v-if="parseFloat(getTaskBarStyle(task).width) < 32">
                          <span v-if="task.status !== 'todo'" class="tabular-nums font-medium">{{ task.progress }}%</span>
                          <span v-else>待开始</span>
                          <span class="mx-1.5 text-gray-300">|</span>
                        </template>
                        <span class="tabular-nums text-gray-600">{{ getTotalDays(task.startDate, task.endDate) }}</span>
                        <span class="text-gray-400">/</span>
                        <span class="tabular-nums text-gray-600">{{ getWorkDays(task.startDate, task.endDate) }}</span>
                        <span class="mx-1.5 text-gray-300">|</span>
                        <span class="text-gray-800 truncate max-w-[100px]" :title="task.title">{{ task.title }}</span>
                        <span class="mx-1.5 text-gray-300">|</span>
                        <span class="text-gray-600 truncate max-w-[50px]">{{ task.leader || '未分配' }}</span>
                        <span class="mx-1.5 text-gray-300">|</span>
                        <span class="text-gray-600 truncate max-w-[70px]">{{ task.department || '未指定' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 依赖关系连接线 -->
                  <svg
                    v-if="showDependencyArrows"
                    class="absolute inset-0 pointer-events-none"
                    :style="{
                      width: `${timelineWidth}px`,
                      height: `${organizedTasks.length * 48}px`,
                      zIndex: 15,
                    }"
                  >
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 6 3, 0 6"
                          :fill="COLORS.warning"
                        />
                      </marker>
                    </defs>
                    <g
                      v-for="(task, taskIndex) in organizedTasks"
                      :key="`dep-${task.id}`"
                    >
                      <template
                        v-for="depId in task.dependencies"
                        :key="`${task.id}-${depId}`"
                      >
                        <line
                          v-if="getDependencyLine(task, depId, taskIndex)"
                          :x1="getDependencyLine(task, depId, taskIndex).x1"
                          :y1="getDependencyLine(task, depId, taskIndex).y1"
                          :x2="getDependencyLine(task, depId, taskIndex).x2"
                          :y2="getDependencyLine(task, depId, taskIndex).y2"
                          :stroke="COLORS.warning"
                          stroke-width="1.5"
                          stroke-dasharray="4,2"
                          marker-end="url(#arrowhead)"
                        />
                      </template>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 导出确认对话框 -->
        <el-dialog
          v-model="showExportConfirmDialog"
          title="导出图片"
          width="380px"
          :close-on-click-modal="true"
          :close-on-press-escape="true"
          :modal="true"
          :append-to-body="true"
          :teleported="true"
          :destroy-on-close="true"
          class="export-dialog"
        >
          <div class="space-y-4">
            <div class="text-gray-700">
              <p>将导出<strong>当前屏幕显示</strong>的甘特图内容。</p>
            </div>
            <div class="bg-amber-50 p-3 rounded text-sm text-amber-700">
              <div class="font-medium mb-1">💡 提示</div>
              <div>建议先使用工具栏的"自适应"功能，可让所有任务条完整显示在屏幕宽度内，导出效果更佳。</div>
            </div>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <el-button @click="showExportConfirmDialog = false">取消</el-button>
              <el-button type="primary" @click="handleConfirmExport">
                确认导出
              </el-button>
            </div>
          </template>
        </el-dialog>

        <!-- 导出进度对话框 -->
        <el-dialog
          v-model="showProgressDialog"
          title="正在导出图片"
          width="400px"
          :close-on-click-modal="false"
          :close-on-press-escape="false"
          :show-close="false"
          :modal="true"
          :append-to-body="true"
          :teleported="true"
          :destroy-on-close="true"
          class="export-dialog"
        >
          <div class="text-center py-4">
            <el-progress
              :percentage="exportProgress"
              :status="exportProgress >= 100 ? 'success' : ''"
              :stroke-width="12"
              class="mb-4"
            />
            <div class="text-gray-600">{{ exportProgressText }}</div>
            <div class="text-xs text-gray-400 mt-2">请勿关闭或刷新页面</div>
          </div>
        </el-dialog>

        <!-- 自适应参数设置对话框 -->
        <el-dialog
          v-model="showFitPaddingDialog"
          title="自适应参数设置"
          width="420px"
          :close-on-click-modal="true"
          :modal="true"
          :append-to-body="true"
          :teleported="true"
          :destroy-on-close="true"
          class="padding-dialog"
        >
          <div class="padding-settings space-y-5">
            <div class="bg-blue-50 p-3 rounded text-xs text-blue-600 mb-4">
              <el-icon class="mr-1"><InfoFilled /></el-icon>
              设置"自适应"功能执行时的时间边距参数，影响任务条在屏幕中的显示范围
            </div>

            <div class="space-y-4">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-700">左侧边距（开始前）</span>
                  <span class="text-sm text-gray-500">{{ tempFitStartPadding }} 天</span>
                </div>
                <el-slider
                  v-model="tempFitStartPadding"
                  :min="0"
                  :max="60"
                  :step="1"
                  show-input
                  :show-input-controls="false"
                  input-size="small"
                />
                <div class="text-xs text-gray-400 mt-1">自适应后，任务最早开始日期之前预留的天数</div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-700">右侧边距（结束后）</span>
                  <span class="text-sm text-gray-500">{{ tempFitEndPadding }} 天</span>
                </div>
                <el-slider
                  v-model="tempFitEndPadding"
                  :min="0"
                  :max="60"
                  :step="1"
                  show-input
                  :show-input-controls="false"
                  input-size="small"
                />
                <div class="text-xs text-gray-400 mt-1">自适应后，任务最晚结束日期之后预留的天数</div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-gray-200">
              <div class="text-xs text-gray-500">
                默认值：左侧 1 天，右侧 15 天
              </div>
              <el-button size="small" @click="resetFitPaddingToDefault">
                恢复默认
              </el-button>
            </div>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <el-button @click="showFitPaddingDialog = false">取消</el-button>
              <el-button type="primary" @click="applyFitPaddingSettings">
                应用并自适应
              </el-button>
            </div>
          </template>
        </el-dialog>

        <!-- 全屏时的弹窗容器 -->
        <div v-if="isFullscreen" class="gantt-dialog-container">
          <slot name="dialog" />
        </div>
        <slot name="dialog" v-if="!isFullscreen" />
      </div>

      <!-- 图例 -->
      <div
        class="flex items-center gap-4 px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs flex-shrink-0"
      >
        <span class="text-gray-500 font-medium">状态：</span>
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <span
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: COLORS.info }"
            ></span>
            <span class="text-gray-600">待办</span>
          </span>
          <span class="flex items-center gap-1">
            <span
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: COLORS.primary }"
            ></span>
            <span class="text-gray-600">进行中</span>
          </span>
          <span class="flex items-center gap-1">
            <span
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: COLORS.success }"
            ></span>
            <span class="text-gray-600">已完成</span>
          </span>
          <span class="flex items-center gap-1">
            <span
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: COLORS.primary }"
            ></span>
            <span :style="{ color: '#303133', fontWeight: 'bold' }">50%</span>
            <span class="text-gray-600">超期</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-grid {
  display: flex;
  height: 100%;
}

.gantt-task-list {
  width: 280px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
}

.gantt-header {
  flex-shrink: 0;
  position: relative;
}

.gantt-header-fixed {
  overflow: hidden;
  flex-shrink: 0;
}

.gantt-header-inner {
  display: flex;
  height: 100%;
  will-change: transform;
}

.gantt-header::-webkit-scrollbar {
  display: none;
}

.gantt-header {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.gantt-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
  overscroll-behavior: contain;
}

.gantt-body::-webkit-scrollbar {
  width: 6px;
}

.gantt-body::-webkit-scrollbar-track {
  background: transparent;
}

.gantt-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.gantt-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.gantt-task-list .gantt-body {
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.gantt-task-list .gantt-body::-webkit-scrollbar {
  display: none;
}

.gantt-timeline {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-x: hidden;
}

.gantt-timeline-scroll {
  flex: 1;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.gantt-timeline-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.gantt-timeline-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.gantt-timeline-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.gantt-timeline-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.gantt-bar-container {
  display: flex;
  align-items: center;
}

.gantt-bar-container:hover {
  transform: translateY(-1px);
}

.gantt-bar-container:hover .gantt-bar {
  box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.08);
}

.gantt-bar {
  position: relative;
  flex-shrink: 0;
}

.gantt-timeline::-webkit-scrollbar {
  height: 6px;
}

.gantt-timeline::-webkit-scrollbar-track {
  background: transparent;
}

.gantt-timeline::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.gantt-timeline::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 层级系统 */
.gantt-bar-container {
  position: absolute;
  z-index: 10;
}

.gantt-bar {
  position: relative;
}

.gantt-view {
  position: relative;
  z-index: 50;
}

.gantt-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 100 !important;
  border-radius: 0 !important;
  border: none !important;
  background: white;
  overflow: visible !important;
}

.gantt-fullscreen .gantt-grid,
.gantt-fullscreen .gantt-timeline,
.gantt-fullscreen .gantt-task-list {
  overflow: visible !important;
}

.gantt-dialog-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 200;
}

.gantt-dialog-container > * {
  pointer-events: auto;
}

.export-dialog {
  z-index: 300 !important;
}

.export-dialog .el-dialog {
  z-index: 301 !important;
}

.export-dialog .el-overlay {
  z-index: 300 !important;
}

.gantt-fullscreen .export-dialog,
.gantt-fullscreen .export-dialog .el-dialog,
.gantt-fullscreen .el-dialog.export-dialog,
.gantt-fullscreen ~ .el-dialog.export-dialog,
.gantt-fullscreen ~ .el-overlay {
  z-index: 301 !important;
}

.gantt-fullscreen .export-dialog .el-overlay,
.gantt-fullscreen ~ .export-dialog .el-overlay {
  z-index: 300 !important;
}

.el-dialog.export-dialog {
  z-index: 301 !important;
}

.el-overlay {
  z-index: 300 !important;
}

.padding-dialog {
  z-index: 300 !important;
}

.padding-dialog .el-dialog {
  z-index: 301 !important;
}

.padding-settings .el-slider {
  margin-right: 60px;
}

.padding-settings .el-input-number {
  width: 80px;
}
</style>
