<script setup>
import { computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import TaskCard from './TaskCard.vue'
import { TaskStatus, StatusLabels } from '@/types/task.js'
import { useStatusChange, useTaskNumbering } from '@/composables/kanban/index.js'

const props = defineProps({
  tasks: {
    type: Array,
    required: true
  }
})

const emit = defineEmits([
  'edit',
  'delete',
  'taskClick',
  'addTask',
  'moveTask',
  'updateTaskDates'
])

// 使用 composables
const { getTaskNumber } = useTaskNumbering(props)
const { handleStatusChange } = useStatusChange()

// 获取今天的日期字符串
const getTodayString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 按状态分组任务
const todoList = computed(() => props.tasks.filter(t => t && t.status === TaskStatus.TODO))
const inProgressList = computed(() => props.tasks.filter(t => t && t.status === TaskStatus.IN_PROGRESS))
const doneList = computed(() => props.tasks.filter(t => t && t.status === TaskStatus.DONE))

// 超期未完成任务
const overdueList = computed(() => {
  const today = new Date(getTodayString())
  return props.tasks.filter(t => {
    if (!t || t.status === TaskStatus.DONE) return false
    const endDate = new Date(t.endDate)
    return endDate < today && t.progress < 100
  })
})

// 处理任务操作
function handleEdit(task) {
  emit('edit', task)
}

function handleDelete(task) {
  emit('delete', task)
}

function handleTaskClick(task) {
  emit('taskClick', task)
}

// 处理状态变更
async function onStatusChange(task, newStatus) {
  await handleStatusChange(task, newStatus, emit)
}

function handleAddTask(status) {
  emit('addTask', status)
}
</script>

<template>
  <div class="kanban-view h-full overflow-x-auto overflow-y-hidden">
    <div class="flex h-full gap-4 p-4 justify-center">
      <!-- 待办列 -->
      <div class="kanban-column flex flex-col w-80 flex-shrink-0 rounded-lg border" style="background-color: rgba(144, 147, 153, 0.08); border-color: rgba(144, 147, 153, 0.2);">
        <div class="flex items-center justify-between px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold" style="color: #909399;">{{ StatusLabels[TaskStatus.TODO] }}</span>
            <span class="px-2 py-0.5 text-xs font-medium bg-white rounded-full" style="color: #909399;">
              {{ todoList.length }}
            </span>
          </div>
          <el-button type="primary" link size="small" @click="handleAddTask(TaskStatus.TODO)">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>

        <div class="flex-1 overflow-y-auto px-3 pt-1 pb-3 space-y-3 min-h-[100px]">
          <TaskCard
            v-for="task in todoList"
            :key="task.id"
            :task="task"
            :all-tasks="props.tasks"
            :display-number="getTaskNumber(task)"
            @edit="handleEdit"
            @delete="handleDelete"
            @click="handleTaskClick"
            @status-change="(t) => onStatusChange(t, TaskStatus.IN_PROGRESS)"
          />
          <div v-if="todoList.length === 0" class="flex flex-col items-center justify-center py-8" style="color: #C0C4CC;">
            <el-icon :size="32" class="mb-2"><Plus /></el-icon>
            <span class="text-sm">暂无任务</span>
          </div>
        </div>
      </div>

      <!-- 进行中列 -->
      <div class="kanban-column flex flex-col w-80 flex-shrink-0 rounded-lg border" style="background-color: rgba(64, 158, 255, 0.06); border-color: rgba(64, 158, 255, 0.2);">
        <div class="flex items-center justify-between px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold" style="color: #409EFF;">{{ StatusLabels[TaskStatus.IN_PROGRESS] }}</span>
            <span class="px-2 py-0.5 text-xs font-medium bg-white rounded-full" style="color: #409EFF;">
              {{ inProgressList.length }}
            </span>
          </div>
          <el-button type="primary" link size="small" @click="handleAddTask(TaskStatus.IN_PROGRESS)">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>

        <div class="flex-1 overflow-y-auto px-3 pt-1 pb-3 space-y-3 min-h-[100px]">
          <TaskCard
            v-for="task in inProgressList"
            :key="task.id"
            :task="task"
            :all-tasks="props.tasks"
            :display-number="getTaskNumber(task)"
            @edit="handleEdit"
            @delete="handleDelete"
            @click="handleTaskClick"
            @status-change="(t) => onStatusChange(t, TaskStatus.DONE)"
          />
          <div v-if="inProgressList.length === 0" class="flex flex-col items-center justify-center py-8" style="color: #C0C4CC;">
            <el-icon :size="32" class="mb-2"><Plus /></el-icon>
            <span class="text-sm">暂无任务</span>
          </div>
        </div>
      </div>

      <!-- 已完成列 -->
      <div class="kanban-column flex flex-col w-80 flex-shrink-0 rounded-lg border" style="background-color: rgba(103, 194, 58, 0.08); border-color: rgba(103, 194, 58, 0.2);">
        <div class="flex items-center justify-between px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold" style="color: #67C23A;">{{ StatusLabels[TaskStatus.DONE] }}</span>
            <span class="px-2 py-0.5 text-xs font-medium bg-white rounded-full" style="color: #67C23A;">
              {{ doneList.length }}
            </span>
          </div>
          <el-button type="primary" link size="small" @click="handleAddTask(TaskStatus.DONE)">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>

        <div class="flex-1 overflow-y-auto px-3 pt-1 pb-3 space-y-3 min-h-[100px]">
          <TaskCard
            v-for="task in doneList"
            :key="task.id"
            :task="task"
            :all-tasks="props.tasks"
            :display-number="getTaskNumber(task)"
            @edit="handleEdit"
            @delete="handleDelete"
            @click="handleTaskClick"
            @status-change="(t) => onStatusChange(t, TaskStatus.IN_PROGRESS)"
          />
          <div v-if="doneList.length === 0" class="flex flex-col items-center justify-center py-8" style="color: #C0C4CC;">
            <el-icon :size="32" class="mb-2"><Plus /></el-icon>
            <span class="text-sm">暂无任务</span>
          </div>
        </div>
      </div>

      <!-- 超期未完成列 -->
      <div class="kanban-column flex flex-col w-80 flex-shrink-0 rounded-lg border" style="background-color: rgba(245, 108, 108, 0.08); border-color: rgba(245, 108, 108, 0.2);">
        <div class="flex items-center justify-between px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold" style="color: #F56C6C;">超期未完成</span>
            <span class="px-2 py-0.5 text-xs font-medium bg-white rounded-full" style="color: #F56C6C;">
              {{ overdueList.length }}
            </span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-3 pt-1 pb-3 space-y-3 min-h-[100px]">
          <TaskCard
            v-for="task in overdueList"
            :key="task.id"
            :task="task"
            :all-tasks="props.tasks"
            :display-number="getTaskNumber(task)"
            @edit="handleEdit"
            @delete="handleDelete"
            @click="handleTaskClick"
            @status-change="(t) => onStatusChange(t, TaskStatus.DONE)"
          />
          <div v-if="overdueList.length === 0" class="flex flex-col items-center justify-center py-8" style="color: #C0C4CC;">
            <span class="text-sm">暂无超期任务</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-view {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.kanban-view::-webkit-scrollbar {
  height: 8px;
}

.kanban-view::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.kanban-view::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.kanban-view::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.kanban-column {
  max-height: 100%;
}

/* 列内滚动条 */
.kanban-column > div {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.kanban-column > div::-webkit-scrollbar {
  width: 4px;
}

.kanban-column > div::-webkit-scrollbar-track {
  background: transparent;
}

.kanban-column > div::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.kanban-column > div::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
