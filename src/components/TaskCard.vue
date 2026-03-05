<script setup>
import { computed } from 'vue'
import { Calendar, User, Flag, Edit, Delete, Check, Link, Connection, Clock } from '@element-plus/icons-vue'
import { TaskStatus, TaskPriority, StatusLabels, PriorityLabels } from '@/types/task.js'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: true
  },
  allTasks: {
    type: Array,
    default: () => []
  },
  displayNumber: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['edit', 'delete', 'click', 'statusChange'])

const priorityConfig = computed(() => {
  const configs = {
    [TaskPriority.HIGH]: { label: '高' },
    [TaskPriority.MEDIUM]: { label: '中' },
    [TaskPriority.LOW]: { label: '低' }
  }
  return configs[props.task.priority] || configs[TaskPriority.MEDIUM]
})

const statusConfig = computed(() => {
  const configs = {
    [TaskStatus.TODO]: { label: '待办', color: '#909399' },
    [TaskStatus.IN_PROGRESS]: { label: '进行中', color: '#409EFF' },
    [TaskStatus.DONE]: { label: '已完成', color: '#67C23A' }
  }
  return configs[props.task.status] || configs[TaskStatus.TODO]
})

const progressColor = computed(() => {
  if (props.task.status === TaskStatus.DONE) return '#67C23A'
  if (props.task.status === TaskStatus.IN_PROGRESS) return '#409EFF'
  return '#909399'
})

const isOverdue = computed(() => {
  if (props.task.status === TaskStatus.DONE) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(props.task.endDate)
  return endDate < today
})

const isDelayed = computed(() => {
  if (props.task.status !== TaskStatus.IN_PROGRESS) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(props.task.endDate)
  return endDate < today
})

const daysRemaining = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(props.task.endDate)
  const diffTime = endDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

const parentTask = computed(() => {
  if (!props.task.parentId || !props.allTasks.length) return null
  return props.allTasks.find(t => t.id === props.task.parentId)
})

const dependencyTasks = computed(() => {
  if (!props.task.dependencies?.length || !props.allTasks.length) return []
  return props.allTasks.filter(t => props.task.dependencies.includes(t.id))
})

const dateDisplay = computed(() => {
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }
  const start = formatDate(props.task.startDate)
  const end = formatDate(props.task.endDate)
  if (start && end) return `${start} — ${end}`
  return end || start
})

function handleEdit() {
  emit('edit', props.task)
}

function handleDelete() {
  emit('delete', props.task)
}

function handleClick() {
  emit('click', props.task)
}

function handleStatusChange() {
  const newStatus = props.task.status === TaskStatus.DONE
    ? TaskStatus.TODO
    : TaskStatus.DONE
  emit('statusChange', props.task, newStatus)
}
</script>

<template>
  <div 
    class="task-card"
    :class="{ 'task-card--overdue': isDelayed }"
    @click="handleClick"
  >
    <!-- 顶部状态条 -->
    <div class="task-card__status-bar">
      <!-- 左侧：优先级标签 + 状态文字 -->
      <div class="task-card__left-info">
        <span class="task-card__priority-tag">
          {{ priorityConfig.label }}优先
        </span>
        <span class="task-card__status-divider">·</span>
        <span class="task-card__status" :style="{ color: statusConfig.color }">
          {{ statusConfig.label }}
        </span>
      </div>
      <!-- 右侧：延期/逾期标签 -->
      <div v-if="isDelayed" class="task-card__badge task-card__badge--danger">
        <Clock class="w-3 h-3" />
        <span>延期中</span>
      </div>
      <div v-else-if="isOverdue" class="task-card__badge task-card__badge--warning">
        <Clock class="w-3 h-3" />
        <span>已逾期</span>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="task-card__body">
      <!-- 标题区 -->
      <div class="task-card__header">
        <h3 class="task-card__title">
          <span v-if="displayNumber" class="task-card__number">{{ displayNumber }}.</span>{{ task.title }}
        </h3>
        <div v-if="showActions" class="task-card__actions">
          <button class="task-card__action-btn" @click.stop="handleEdit" title="编辑">
            <Edit class="w-3.5 h-3.5" />
          </button>
          <button class="task-card__action-btn task-card__action-btn--danger" @click.stop="handleDelete" title="删除">
            <Delete class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- 描述 -->
      <p v-if="task.description" class="task-card__desc">
        {{ task.description }}
      </p>

      <!-- 进度区 -->
      <div class="task-card__progress">
        <div class="task-card__progress-bar">
          <div 
            class="task-card__progress-fill" 
            :style="{ width: `${task.progress}%`, backgroundColor: progressColor }"
          />
        </div>
        <span class="task-card__progress-text" :style="{ color: progressColor }">
          {{ task.progress }}%
        </span>
      </div>

      <!-- 关联信息区 - 突出显示 -->
      <div v-if="parentTask || dependencyTasks.length > 0" class="task-card__relations">
        <div v-if="parentTask" class="task-card__relation task-card__relation--parent">
          <div class="task-card__relation-icon">
            <Connection class="w-3 h-3" />
          </div>
          <span class="task-card__relation-label">父任务</span>
          <span class="task-card__relation-value">{{ parentTask.title }}</span>
        </div>
        <div v-if="dependencyTasks.length > 0" class="task-card__relation task-card__relation--dep">
          <div class="task-card__relation-icon">
            <Link class="w-3 h-3" />
          </div>
          <span class="task-card__relation-label">前置</span>
          <div class="task-card__relation-tags">
            <span v-for="dep in dependencyTasks" :key="dep.id" class="task-card__relation-tag">
              {{ dep.title }}
            </span>
          </div>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="task-card__footer">
        <div class="task-card__meta">
          <div v-if="task.leader" class="task-card__meta-item">
            <User class="w-3 h-3" />
            <span>{{ task.leader }}</span>
          </div>
          <div v-if="task.department" class="task-card__meta-item">
            <Flag class="w-3 h-3" />
            <span>{{ task.department }}</span>
          </div>
          <div class="task-card__meta-item" :class="{ 
            'task-card__meta-item--danger': isDelayed,
            'task-card__meta-item--warning': isOverdue && !isDelayed,
            'task-card__meta-item--urgent': daysRemaining <= 3 && daysRemaining > 0 && !isOverdue
          }">
            <Calendar class="w-3 h-3" />
            <span>{{ dateDisplay }}</span>
          </div>
        </div>
        <!-- 完成按钮 - 简洁的勾号 -->
        <button 
          v-if="task.status !== TaskStatus.DONE" 
          class="task-card__complete-btn"
          @click.stop="handleStatusChange"
          title="标记完成"
        >
          <Check class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  background: #ffffff;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px -5px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.task-card--overdue:hover {
  border-color: #d1d5db;
}

/* 顶部状态条 */
.task-card__status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  background: #ffffff;
  border-bottom: 1px solid #f3f4f6;
}

.task-card__left-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-card__priority-tag {
  font-size: 10px;
  font-weight: 500;
  color: #909399;
  background: #f4f4f5;
  padding: 1px 6px;
  border-radius: 3px;
}

.task-card__status-divider {
  color: #d1d5db;
  font-size: 12px;
}

.task-card__status {
  font-size: 12px;
  font-weight: 500;
}

.task-card__badge {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
}

.task-card__badge--danger {
  color: #F56C6C;
  background: rgba(245, 108, 108, 0.1);
}

.task-card__badge--warning {
  color: #E6A23C;
  background: rgba(230, 162, 60, 0.1);
}

/* 主体 */
.task-card__body {
  padding: 10px 12px 12px;
}

/* 标题 */
.task-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.task-card__title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.task-card__number {
  color: #6b7280;
  font-weight: 500;
  margin-right: 2px;
}

.task-card__actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.task-card:hover .task-card__actions {
  opacity: 1;
}

.task-card__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: #f3f4f6;
  border-radius: 5px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s ease;
}

.task-card__action-btn:hover {
  background: #e5e7eb;
  color: #409EFF;
}

.task-card__action-btn--danger:hover {
  color: #F56C6C;
}

/* 描述 */
.task-card__desc {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 进度 */
.task-card__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.task-card__progress-bar {
  flex: 1;
  height: 5px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}

.task-card__progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.task-card__progress-text {
  font-size: 11px;
  font-weight: 600;
  min-width: 32px;
  text-align: right;
}

/* 关联信息 - 突出显示 */
.task-card__relations {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 10px;
  border-left: 3px solid #E6A23C;
}

.task-card__relation {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-card__relation-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  color: #ffffff;
  flex-shrink: 0;
}

.task-card__relation--parent .task-card__relation-icon {
  background: #E6A23C;
}

.task-card__relation--dep .task-card__relation-icon {
  background: #409EFF;
}

.task-card__relation-label {
  font-size: 10px;
  color: #6b7280;
  font-weight: 600;
  min-width: 32px;
  flex-shrink: 0;
}

.task-card__relation-value {
  font-size: 11px;
  color: #374151;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.task-card__relation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}

.task-card__relation-tag {
  font-size: 10px;
  color: #374151;
  background: #ffffff;
  padding: 2px 8px;
  border-radius: 3px;
  border: 1px solid #E6A23C;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 底部 */
.task-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}

.task-card__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.task-card__meta-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #9ca3af;
}

.task-card__meta-item--danger {
  color: #F56C6C;
  font-weight: 600;
}

.task-card__meta-item--warning {
  color: #E6A23C;
  font-weight: 500;
}

.task-card__meta-item--urgent {
  color: #E6A23C;
}

/* 完成按钮 - 简洁的勾号 */
.task-card__complete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #67C23A;
  cursor: pointer;
  transition: all 0.15s ease;
  opacity: 0.6;
}

.task-card__complete-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}
</style>
