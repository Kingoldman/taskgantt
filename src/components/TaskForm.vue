<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { TaskStatus, TaskPriority } from '@/types/task.js'
import {
  useFormValidation,
  useDateLogic,
  useStatusLinkage,
  useTaskTree,
  useTimeBoundaryCheck,
} from '@/composables/task-form/index.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  task: {
    type: Object,
    default: null
  },
  allTasks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'save', 'cancel'])

const formRef = ref(null)
const formData = ref({
  title: '',
  description: '',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  startDate: '',
  endDate: '',
  progress: 0,
  parentId: null,
  dependencies: [],
  leader: '',
  department: ''
})

// 使用 composables
const {
  isDateAfterToday,
  startDateShortcuts,
  endDateShortcuts,
  handleStartDateChange,
  handleEndDateChange
} = useDateLogic(formData, ElMessage)

const { rules } = useFormValidation(formData, isDateAfterToday)

const {
  TaskStatus: TS,
  statusOptions,
  priorityOptions,
  availableStatusOptions,
  handleProgressChange,
  handleStatusChange
} = useStatusLinkage(formData, isDateAfterToday, ElMessage)

const {
  availableParentTasks,
  availableDependencyTasks,
  hasChildren
} = useTaskTree(props)

const {
  collectTimeChanges,
  generateConfirmContent
} = useTimeBoundaryCheck(computed(() => props.allTasks))

// 对话框标题
const dialogTitle = computed(() => {
  if (props.task?.id) {
    return '编辑任务'
  }
  if (props.task?.parentId) {
    return `新建子任务 - ${props.task.parentTitle || '父任务'}`
  }
  return '新建任务'
})

// 监听 task 变化，初始化表单数据
watch(() => props.task, (newTask) => {
  if (newTask) {
    // 如果有 parentId 但没有 id，说明是新建子任务（预填充模式）
    if (newTask.parentId && !newTask.id) {
      formData.value = {
        title: '',
        description: '',
        status: newTask.status || TaskStatus.TODO,
        priority: newTask.priority || TaskPriority.MEDIUM,
        startDate: newTask.startDate || '',
        endDate: newTask.endDate || '',
        progress: newTask.progress ?? 0,
        parentId: newTask.parentId || null,
        dependencies: [],
        leader: newTask.leader || '',
        department: newTask.department || ''
      }
    } else {
      // 编辑现有任务
      formData.value = {
        title: newTask.title || '',
        description: newTask.description || '',
        status: newTask.status || TaskStatus.TODO,
        priority: newTask.priority || TaskPriority.MEDIUM,
        startDate: newTask.startDate || '',
        endDate: newTask.endDate || '',
        progress: newTask.progress ?? 0,
        parentId: newTask.parentId || null,
        dependencies: newTask.dependencies || [],
        leader: newTask.leader || '',
        department: newTask.department || ''
      }
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// 监听 visible 变化
watch(() => props.visible, (visible) => {
  if (visible && !props.task) {
    resetForm()
  }
})

// 重置表单
function resetForm() {
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  formData.value = {
    title: '',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    startDate: formatDate(today),
    endDate: formatDate(nextWeek),
    progress: 0,
    parentId: null,
    dependencies: [],
    leader: '',
    department: ''
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 关闭对话框
function handleClose() {
  emit('update:visible', false)
  emit('cancel')
}

// 保存任务
async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const startDate = formData.value.startDate
    const endDate = formData.value.endDate
    const status = formData.value.status

    if (!startDate && status !== TaskStatus.TODO) {
      ElMessage.error('未设置开始日期的任务只能设置为"待办"')
      return
    }

    if (isDateAfterToday(startDate) && status !== TaskStatus.TODO) {
      ElMessage.error('开始日期在今天之后的任务只能设置为"待办"')
      return
    }

    if (status === TaskStatus.DONE && isDateAfterToday(endDate)) {
      ElMessage.error('结束日期在今天之后的任务不能设置为"已完成"')
      return
    }

    const data = { ...formData.value }
    if (data.status === TaskStatus.DONE && data.progress < 100) {
      data.progress = 100
    }

    const tasksToUpdate = []

    if (!hasChildren.value) {
      const changes = collectTimeChanges(
        startDate,
        endDate,
        props.task?.id,
        data.dependencies
      )

      if (changes.length > 0) {
        const content = generateConfirmContent(changes)

        try {
          await ElMessageBox.confirm(content, '时间边界变化提示', {
            confirmButtonText: '确认保存',
            cancelButtonText: '取消',
            customClass: 'time-change-message-box'
          })

          for (const change of changes) {
            tasksToUpdate.push({
              taskId: change.taskId,
              updates: change.updates
            })
          }
        } catch {
          return
        }
      }
    }

    if (tasksToUpdate.length > 0) {
      data._additionalUpdates = tasksToUpdate
    }

    emit('save', data)
    emit('update:visible', false)
    ElMessage.success(props.task ? '任务更新成功' : '任务创建成功')
  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="dialogTitle"
    width="560px"
    :close-on-click-modal="true"
    @close="handleClose"
    class="task-form-dialog"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="80px"
      label-position="right"
    >
      <el-form-item label="任务标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入任务标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="任务描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入任务描述"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <div class="grid grid-cols-2 gap-4 items-start">
        <div>
          <el-form-item label="状态" prop="status">
            <el-select
              v-model="formData.status"
              class="w-full"
              @change="handleStatusChange"
            >
              <el-option
                v-for="option in availableStatusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <div class="ml-20 -mt-2 mb-2">
            <div v-if="!formData.startDate" class="text-xs" style="color: #E6A23C;">
              未设置开始日期，只能设置为"待办"
            </div>
            <div v-else-if="isDateAfterToday(formData.startDate)" class="text-xs" style="color: #E6A23C;">
              开始日期在今天之后，只能设置为"待办"
            </div>
            <div v-else-if="isDateAfterToday(formData.endDate)" class="text-xs" style="color: #E6A23C;">
              结束日期在今天之后，不能设置为"已完成"
            </div>
          </div>
        </div>

        <el-form-item label="优先级" prop="priority">
          <el-select v-model="formData.priority" class="w-full">
            <el-option
              v-for="option in priorityOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker
            v-model="formData.startDate"
            type="date"
            placeholder="选择开始日期"
            class="w-full"
            value-format="YYYY-MM-DD"
            :shortcuts="startDateShortcuts"
            :disabled="hasChildren"
            @change="handleStartDateChange"
          />
          <div v-if="hasChildren" class="text-xs mt-1" style="color: #E6A23C;">
            📋 有子任务，时间由子任务决定
          </div>
        </el-form-item>

        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker
            v-model="formData.endDate"
            type="date"
            placeholder="选择结束日期"
            class="w-full"
            value-format="YYYY-MM-DD"
            :shortcuts="endDateShortcuts"
            :disabled="hasChildren"
            @change="handleEndDateChange"
          />
          <div v-if="hasChildren" class="text-xs mt-1" style="color: #E6A23C;">
            📋 有子任务，时间由子任务决定
          </div>
        </el-form-item>
      </div>

      <el-form-item label="进度">
        <div class="flex items-center gap-4 w-full">
          <el-slider
            v-model="formData.progress"
            :max="100"
            :step="5"
            class="flex-1"
            @change="handleProgressChange"
          />
          <span class="text-sm text-gray-600 w-12 text-right">{{ formData.progress }}%</span>
        </div>
        <div v-if="isDateAfterToday(formData.endDate)" class="text-xs mt-1" style="color: #E6A23C;">
          结束日期在今天之后，进度不能设置为100%
        </div>
        <div v-else-if="formData.status === TaskStatus.IN_PROGRESS && formData.progress === 0" class="text-xs mt-1 font-medium" style="color: #E6A23C;">
          ⚠️ 状态为"进行中"但进度为0%，建议更新进度或调整状态
        </div>
      </el-form-item>

      <el-form-item label="父任务">
        <el-tree-select
          v-model="formData.parentId"
          :data="availableParentTasks"
          placeholder="选择父任务（可选）"
          clearable
          filterable
          check-strictly
          class="w-full"
          :render-after-expand="false"
        />
        <div class="text-xs mt-1" style="color: #E6A23C;">设置为子任务后，将显示在父任务下方</div>
      </el-form-item>

      <el-form-item label="前置任务">
        <el-tree-select
          v-model="formData.dependencies"
          :data="availableDependencyTasks"
          placeholder="选择前置任务（可多选）"
          multiple
          clearable
          filterable
          check-strictly
          class="w-full"
          :render-after-expand="false"
        />
        <div class="text-xs mt-1" style="color: #E6A23C;">前置任务开始后，此任务才能开始</div>
      </el-form-item>

      <el-form-item label="牵头领导" prop="leader" required>
        <el-input
          v-model="formData.leader"
          placeholder="请输入牵头领导姓名"
          maxlength="50"
        />
      </el-form-item>

      <el-form-item label="牵头单位" prop="department" required>
        <el-input
          v-model="formData.department"
          placeholder="请输入牵头单位（科室）"
          maxlength="50"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave">
          {{ task ? '保存' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.task-form-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-date-editor.el-input) {
  width: 100%;
}
</style>

<style>
.time-change-content {
  padding: 8px 0;
}

.time-change-content .change-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.time-change-content .header-icon {
  width: 24px;
  height: 24px;
  color: #E6A23C;
}

.time-change-content .change-header span {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.time-change-content .change-body {
  max-height: 400px;
  overflow-y: auto;
}

.time-change-content .change-section {
  margin-bottom: 20px;
}

.time-change-content .change-section:last-child {
  margin-bottom: 0;
}

.time-change-content .change-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #409EFF;
  margin-bottom: 12px;
  padding: 6px 12px;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.1) 0%, transparent 100%);
  border-radius: 4px;
}

.time-change-content .change-section-title.parent-title {
  color: #67C23A;
  background: linear-gradient(90deg, rgba(103, 194, 58, 0.1) 0%, transparent 100%);
}

.time-change-content .section-icon {
  width: 16px;
  height: 16px;
}

.time-change-content .change-item {
  background: #fafafa;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}

.time-change-content .change-item:hover {
  background: #f5f7fa;
  border-color: #e4e7ed;
}

.time-change-content .change-item:last-child {
  margin-bottom: 0;
}

.time-change-content .change-task-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
}

.time-change-content .task-icon {
  font-size: 14px;
}

.time-change-content .change-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
  padding-left: 20px;
}

.time-change-content .change-label {
  color: #909399;
  min-width: 60px;
}

.time-change-content .change-old {
  color: #909399;
  text-decoration: line-through;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
}

.time-change-content .change-arrow {
  color: #E6A23C;
  font-weight: bold;
  font-size: 14px;
}

.time-change-content .change-new {
  color: #67C23A;
  font-weight: 600;
  background: rgba(103, 194, 58, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
}
</style>

<style>
.time-change-message-box :deep(.el-message-box__icon) {
  display: none;
}

.time-change-message-box :deep(.el-message-box__message) {
  padding-left: 0;
}
</style>
