<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { TaskStatus, TaskPriority } from '@/types/task.js'
import {
  useFormValidation,
  useDateLogic,
  useStatusLinkage,
  useTaskTree,
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

    // 再次验证逻辑关系
    const startDate = formData.value.startDate
    const endDate = formData.value.endDate
    const status = formData.value.status

    // 无开始日期的任务只能设置为待办
    if (!startDate && status !== TaskStatus.TODO) {
      ElMessage.error('未设置开始日期的任务只能设置为"待办"')
      return
    }

    // 开始日期在今天之后的任务只能设置为待办
    if (isDateAfterToday(startDate) && status !== TaskStatus.TODO) {
      ElMessage.error('开始日期在今天之后的任务只能设置为"待办"')
      return
    }

    // 结束日期在今天之后的任务不能设置为已完成
    if (status === TaskStatus.DONE && isDateAfterToday(endDate)) {
      ElMessage.error('结束日期在今天之后的任务不能设置为"已完成"')
      return
    }

    // 如果状态改为已完成，自动设置进度为100%
    const data = { ...formData.value }
    if (data.status === TaskStatus.DONE && data.progress < 100) {
      data.progress = 100
    }

    // 检查时间边界变化的影响（仅对没有子任务的任务检查）
    if (!hasChildren.value) {
      const timeChangeMessages = []

      // 检查是否会影响父任务时间
      if (data.parentId) {
        const parentTask = props.allTasks.find(t => t.id === data.parentId)
        if (parentTask) {
          const siblings = props.allTasks.filter(t => t.parentId === data.parentId && t.id !== props.task?.id)
          const allStartDates = siblings.map(s => new Date(s.startDate).getTime())
          const allEndDates = siblings.map(s => new Date(s.endDate).getTime())

          if (startDate) allStartDates.push(new Date(startDate).getTime())
          if (endDate) allEndDates.push(new Date(endDate).getTime())

          if (allStartDates.length > 0 && allEndDates.length > 0) {
            const newMinStart = new Date(Math.min(...allStartDates))
            const newMaxEnd = new Date(Math.max(...allEndDates))

            if (newMinStart < new Date(parentTask.startDate) || newMaxEnd > new Date(parentTask.endDate)) {
              timeChangeMessages.push(`父任务"${parentTask.title}"的时间范围将自动调整为覆盖所有子任务`)
            }
          }
        }
      }

      // 检查子任务时间是否超出父任务
      if (props.task?.parentId) {
        const parentTask = props.allTasks.find(t => t.id === props.task.parentId)
        if (parentTask) {
          if (startDate && new Date(startDate) < new Date(parentTask.startDate)) {
            timeChangeMessages.push(`开始时间早于父任务"${parentTask.title}"的开始时间，父任务时间将自动调整`)
          }
          if (endDate && new Date(endDate) > new Date(parentTask.endDate)) {
            timeChangeMessages.push(`结束时间晚于父任务"${parentTask.title}"的结束时间，父任务时间将自动调整`)
          }
        }
      }

      // 如果有时间边界变化，显示确认弹窗
      if (timeChangeMessages.length > 0) {
        try {
          await ElMessageBox.confirm(
            `检测到以下时间边界变化：\n${timeChangeMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\n是否继续保存？`,
            '时间边界变化提示',
            {
              confirmButtonText: '确认保存',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
        } catch {
          return
        }
      }
    }

    emit('save', data)
    emit('update:visible', false)
    ElMessage.success(props.task ? '任务更新成功' : '任务创建成功')
  } catch (error) {
    console.error('Form validation failed:', error)
  }
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
        <div class="text-xs mt-1" style="color: #E6A23C;">前置任务完成后，此任务才能开始</div>
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
