<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Grid, Calendar, Search, Filter, FolderOpened, Download, Upload, Close } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTaskStore } from '@/stores/task.js'
import { TaskStatus, TaskPriority } from '@/types/task.js'
import TaskForm from '@/components/TaskForm.vue'
import GanttView from '@/components/GanttView.vue'
import KanbanView from '@/components/KanbanView.vue'

const router = useRouter()
const taskStore = useTaskStore()

// 视图模式
const viewMode = ref('gantt') // 'gantt' | 'kanban'

// 搜索和筛选
const searchQuery = ref('')
const filterStatus = ref('')
const filterPriority = ref('')

// 表单控制
const formVisible = ref(false)
const editingTask = ref(null)
const ganttViewRef = ref(null)

// 计算筛选后的任务
const filteredTasks = computed(() => {
  let tasks = taskStore.allTasks

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    
    // 找出所有匹配的任务ID
    const matchedIds = new Set()
    tasks.forEach(task => {
      if (
        task.title.toLowerCase().includes(query) ||
        (task.description || '').toLowerCase().includes(query) ||
        (task.leader || '').toLowerCase().includes(query) ||
        (task.department || '').toLowerCase().includes(query)
      ) {
        matchedIds.add(task.id)
      }
    })

    // 构建需要显示的任务ID集合
    const visibleIds = new Set()
    
    tasks.forEach(task => {
      if (matchedIds.has(task.id)) {
        // 任务本身匹配，添加该任务
        visibleIds.add(task.id)
        
        // 添加所有子孙任务
        const addDescendants = (parentId) => {
          tasks.forEach(t => {
            if (t.parentId === parentId) {
              visibleIds.add(t.id)
              addDescendants(t.id)
            }
          })
        }
        addDescendants(task.id)
        
        // 添加所有祖先任务（作为上下文）
        const addAncestors = (taskId) => {
          const t = tasks.find(x => x.id === taskId)
          if (t && t.parentId) {
            visibleIds.add(t.parentId)
            addAncestors(t.parentId)
          }
        }
        addAncestors(task.id)
      }
    })

    tasks = tasks.filter(task => visibleIds.has(task.id))
  }

  // 状态筛选
  if (filterStatus.value) {
    tasks = tasks.filter(task => task.status === filterStatus.value)
  }

  // 优先级筛选
  if (filterPriority.value) {
    tasks = tasks.filter(task => task.priority === filterPriority.value)
  }

  return tasks
})

// 判断任务是否匹配搜索条件（用于高亮）
function isTaskMatched(task) {
  if (!searchQuery.value) return false
  const query = searchQuery.value.toLowerCase()
  return (
    task.title.toLowerCase().includes(query) ||
    (task.description || '').toLowerCase().includes(query) ||
    (task.leader || '').toLowerCase().includes(query) ||
    (task.department || '').toLowerCase().includes(query)
  )
}

// 统计信息
const stats = computed(() => {
  const tasks = taskStore.allTasks
  
  // 任务 = 最外层父任务数量（根节点）
  const parentTasks = tasks.filter(t => !t.parentId)
  const parentTotal = parentTasks.length
  
  // 子任务 = 叶子节点数量（没有子节点的任务）
  const leafTasks = tasks.filter(t => !tasks.some(child => child.parentId === t.id))
  const childTotal = leafTasks.length
  
  // 按状态统计叶子节点（可执行的任务）
  const todo = leafTasks.filter(t => t.status === TaskStatus.TODO).length
  const inProgress = leafTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length
  const done = leafTasks.filter(t => t.status === TaskStatus.DONE).length

  return { parentTotal, childTotal, todo, inProgress, done }
})

// 初始化
onMounted(() => {
  taskStore.initTasks()
})

// 处理添加任务
function handleAddTask(initialStatus = TaskStatus.TODO) {
  editingTask.value = null
  formVisible.value = true
}

// 处理添加子任务 - 预填充父任务信息
function handleAddSubTask(parentInfo) {
  editingTask.value = {
    parentId: parentInfo.parentId,
    parentTitle: parentInfo.parentTitle,
    startDate: parentInfo.startDate,
    endDate: parentInfo.endDate,
    department: parentInfo.department,
    leader: parentInfo.leader,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    progress: 0
  }
  formVisible.value = true
}

// 处理编辑任务
function handleEditTask(task) {
  editingTask.value = task
  formVisible.value = true
}

// 处理保存任务
function handleSaveTask(taskData) {
  const additionalUpdates = taskData._additionalUpdates
  delete taskData._additionalUpdates

  if (editingTask.value && editingTask.value.id) {
    taskStore.updateTask(editingTask.value.id, taskData)
  } else {
    taskStore.addTask(taskData)
  }

  if (taskData.parentId) {
    taskStore.updateParentTaskTime(taskData.parentId)
  }

  if (additionalUpdates && additionalUpdates.length > 0) {
    const processedIds = new Set()
    additionalUpdates.forEach(update => {
      if (!processedIds.has(update.taskId)) {
        taskStore.updateTask(update.taskId, update.updates)
        processedIds.add(update.taskId)
        const task = taskStore.allTasks.find(t => t.id === update.taskId)
        if (task?.parentId) {
          taskStore.updateParentTaskTime(task.parentId)
        }
      }
    })
  }

  editingTask.value = null
}

// 处理删除任务
async function handleDeleteTask(task) {
  // 检查是否有子任务
  const children = taskStore.allTasks.filter(t => t.parentId === task.id)
  const hasChildren = children.length > 0
  
  // 构建确认消息
  let confirmMessage = `确定要删除任务 "${task.title}" 吗？`
  if (hasChildren) {
    confirmMessage = `⚠️ 任务 "${task.title}" 有 ${children.length} 个子任务，删除后将同时删除所有子任务！\n\n子任务列表：\n${children.map(c => `• ${c.title}`).join('\n')}\n\n此操作不可撤销，确定继续吗？`
  }
  
  try {
    await ElMessageBox.confirm(
      confirmMessage,
      hasChildren ? '⚠️ 危险操作：删除父任务' : '确认删除',
      {
        confirmButtonText: hasChildren ? '确认删除全部' : '删除',
        cancelButtonText: '取消',
        type: hasChildren ? 'error' : 'warning',
        dangerouslyUseHTMLString: false
      }
    )
    
    const parentId = task.parentId
    
    // 删除任务（包括子任务）
    taskStore.deleteTask(task.id)
    
    // 删除后更新父任务的时间、状态和进度
    if (parentId) {
      taskStore.updateParentTaskTime(parentId)
      // 更新父任务状态（如果所有子任务都完成，父任务也完成）
      updateParentStatusAfterChildDelete(parentId)
    }
    
    ElMessage.success(hasChildren ? `已删除任务及其 ${children.length} 个子任务` : '任务已删除')
  } catch (error) {
    // 用户取消删除
  }
}

// 删除子任务后更新父任务状态
function updateParentStatusAfterChildDelete(parentId) {
  const parent = taskStore.allTasks.find(t => t.id === parentId)
  if (!parent) return
  
  const siblings = taskStore.allTasks.filter(t => t.parentId === parentId)
  
  if (siblings.length === 0) {
    // 没有子任务了，父任务可以独立设置状态
    return
  }
  
  // 计算所有子任务的平均进度
  const avgProgress = Math.round(siblings.reduce((sum, s) => sum + (s.progress || 0), 0) / siblings.length)
  
  // 检查是否所有子任务都完成
  const allCompleted = siblings.every(s => s.progress >= 100)
  
  // 更新父任务进度
  if (parent.progress !== avgProgress) {
    taskStore.updateTask(parentId, { progress: avgProgress })
  }
  
  // 如果所有子任务都完成，父任务也设为完成
  if (allCompleted && parent.progress < 100) {
    taskStore.updateTask(parentId, { progress: 100, status: TaskStatus.DONE })
  }
}

// 处理任务点击
function handleTaskClick(task) {
  handleEditTask(task)
}

// 处理移动任务
function handleMoveTask(taskId, newStatus) {
  taskStore.moveTask(taskId, newStatus)
}

// 处理重新排序
function handleReorderTasks(status, newOrder) {
  taskStore.reorderTasks(status, newOrder)
}

// 处理更新任务时间和状态
function handleUpdateTaskDates(taskId, updates) {
  taskStore.updateTask(taskId, updates)
}

// 清除筛选
function clearFilters() {
  searchQuery.value = ''
  filterStatus.value = ''
  filterPriority.value = ''
}

// 导出数据
function handleExport() {
  const data = taskStore.exportTasks()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  a.href = url
  a.download = `taskgantt_backup_${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('数据已导出')
}

// 导入数据
function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const success = taskStore.importTasks(event.target.result)
        if (success) {
          ElMessage.success('数据导入成功')
        } else {
          ElMessage.error('数据格式不正确')
        }
      } catch (error) {
        ElMessage.error('导入失败：' + error.message)
      }
    }
    reader.readAsText(file)
  }
  input.click()
}
</script>

<template>
  <div class="home-view h-full flex flex-col bg-gray-50">
    <!-- 顶部导航栏 -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <!-- 第一行：Logo、统计、新建任务 -->
      <div class="flex items-center justify-between">
        <!-- 左侧：Logo和标题 -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
              <el-icon class="text-gray-600 text-xl"><Calendar /></el-icon>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">WHYGantt</h1>
              <p class="text-xs text-gray-500">任务进度管理</p>
            </div>
          </div>
        </div>

        <!-- 右侧：统计信息和操作按钮 -->
        <div class="flex items-center gap-4">
          <!-- 统计信息 -->
          <div class="flex items-center gap-3 h-8 px-3 border border-gray-200 rounded">
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-gray-400">任务</span>
              <span class="text-base font-bold text-gray-800">{{ stats.parentTotal }}</span>
            </div>
            <el-divider direction="vertical" class="!h-4" />
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-gray-400">子任务</span>
              <span class="text-base font-semibold text-gray-600">{{ stats.childTotal }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-[#909399]"></span>
              <span class="text-xs text-gray-400">{{ stats.todo }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-[#409EFF]"></span>
              <span class="text-xs text-gray-400">{{ stats.inProgress }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-[#67C23A]"></span>
              <span class="text-xs text-gray-400">{{ stats.done }}</span>
            </div>
          </div>

          <!-- 新建任务按钮 -->
          <el-button 
            type="primary" 
            @click="handleAddTask"
          >
            <el-icon class="mr-1"><Plus /></el-icon>
            新建任务
          </el-button>
        </div>
      </div>

      <!-- 第二行：搜索筛选、视图切换、数据备份 -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <!-- 左侧：搜索和筛选 -->
        <div class="flex items-center gap-3">
          <el-input
            v-model="searchQuery"
            placeholder="搜索任务名称/负责人/部门..."
            clearable
            style="width: 260px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filterStatus"
            placeholder="状态"
            clearable
            style="width: 120px"
          >
            <el-option label="待办" value="todo" />
            <el-option label="进行中" value="inprogress" />
            <el-option label="已完成" value="done" />
          </el-select>

          <el-select
            v-model="filterPriority"
            placeholder="优先级"
            clearable
            style="width: 120px"
          >
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>

          <el-button 
            v-if="searchQuery || filterStatus || filterPriority" 
            link 
            type="primary"
            @click="clearFilters"
          >
            <el-icon class="mr-1"><Close /></el-icon>
            清除筛选
          </el-button>
        </div>

        <!-- 右侧：视图切换和数据操作 -->
        <div class="flex items-center gap-3">
          <el-button-group>
            <el-button
              type="warning"
              :plain="viewMode !== 'gantt'"
              @click="viewMode = 'gantt'"
            >
              <el-icon class="mr-1"><Calendar /></el-icon>
              甘特图
            </el-button>
            <el-button
              type="warning"
              :plain="viewMode !== 'kanban'"
              @click="viewMode = 'kanban'"
            >
              <el-icon class="mr-1"><Grid /></el-icon>
              看板
            </el-button>
          </el-button-group>

          <el-divider direction="vertical" />

          <!-- 数据备份 -->
          <el-dropdown>
            <el-button type="default">
              <el-icon class="mr-1"><FolderOpened /></el-icon>
              数据备份
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleExport">
                  <el-icon class="mr-1"><Download /></el-icon>
                  导出备份
                </el-dropdown-item>
                <el-dropdown-item @click="handleImport">
                  <el-icon class="mr-1"><Upload /></el-icon>
                  导入备份
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="flex-1 overflow-hidden">
      <GanttView
        v-if="viewMode === 'gantt'"
        ref="ganttViewRef"
        :tasks="filteredTasks"
        :search-query="searchQuery"
        :is-task-matched="isTaskMatched"
        @edit="handleEditTask"
        @delete="handleDeleteTask"
        @task-click="handleTaskClick"
        @add-sub-task="handleAddSubTask"
      >
        <template #dialog>
          <TaskForm
            v-model:visible="formVisible"
            :task="editingTask"
            :all-tasks="taskStore.allTasks"
            @save="handleSaveTask"
          />
        </template>
      </GanttView>
      <template v-else>
        <KanbanView
          :tasks="filteredTasks"
          @edit="handleEditTask"
          @delete="handleDeleteTask"
          @task-click="handleTaskClick"
          @add-task="handleAddTask"
          @move-task="handleMoveTask"
          @update-task-dates="handleUpdateTaskDates"
        />
        <TaskForm
          v-model:visible="formVisible"
          :task="editingTask"
          :all-tasks="taskStore.allTasks"
          @save="handleSaveTask"
        />
      </template>
    </main>
  </div>
</template>

<style scoped>
.home-view {
  height: 100vh;
}
</style>
