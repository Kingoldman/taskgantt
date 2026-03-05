import { computed } from 'vue'
import { TaskStatus, TaskPriority, StatusLabels, PriorityLabels } from '@/types/task.js'

export function useStatusLinkage(formData, isDateAfterToday, ElMessage) {
  // 状态选项
  const statusOptions = [
    { value: TaskStatus.TODO, label: StatusLabels[TaskStatus.TODO] },
    { value: TaskStatus.IN_PROGRESS, label: StatusLabels[TaskStatus.IN_PROGRESS] },
    { value: TaskStatus.DONE, label: StatusLabels[TaskStatus.DONE] }
  ]

  // 优先级选项
  const priorityOptions = [
    { value: TaskPriority.HIGH, label: PriorityLabels[TaskPriority.HIGH] },
    { value: TaskPriority.MEDIUM, label: PriorityLabels[TaskPriority.MEDIUM] },
    { value: TaskPriority.LOW, label: PriorityLabels[TaskPriority.LOW] }
  ]

  // 根据日期获取可用的状态选项
  const availableStatusOptions = computed(() => {
    const startDate = formData.value.startDate
    const endDate = formData.value.endDate

    // 无开始日期，只能选"待办"
    if (!startDate) {
      return [{ value: TaskStatus.TODO, label: StatusLabels[TaskStatus.TODO] }]
    }

    // 开始日期在今天之后（未来任务），只能选"待办"
    if (isDateAfterToday(startDate)) {
      return [{ value: TaskStatus.TODO, label: StatusLabels[TaskStatus.TODO] }]
    }

    // 结束日期在今天之后，不能选"已完成"
    if (isDateAfterToday(endDate)) {
      return [
        { value: TaskStatus.TODO, label: StatusLabels[TaskStatus.TODO] },
        { value: TaskStatus.IN_PROGRESS, label: StatusLabels[TaskStatus.IN_PROGRESS] }
      ]
    }

    // 所有状态都可用
    return statusOptions
  })

  // 处理进度变化
  function handleProgressChange(val) {
    const endDate = formData.value.endDate

    // 如果进度为100%，自动将状态改为已完成
    if (val === 100 && formData.value.status !== TaskStatus.DONE) {
      // 检查是否可以设置为已完成（结束日期不能在今天之后）
      if (isDateAfterToday(endDate)) {
        ElMessage.warning('结束日期在今天之后，不能设置为已完成，进度已调整')
        formData.value.progress = 95
        return
      }
      formData.value.status = TaskStatus.DONE
    }
    // 如果进度小于100%且状态为已完成，改为进行中
    else if (val < 100 && formData.value.status === TaskStatus.DONE) {
      formData.value.status = TaskStatus.IN_PROGRESS
    }
    // 如果进度大于0且状态为待办，改为进行中
    else if (val > 0 && formData.value.status === TaskStatus.TODO) {
      formData.value.status = TaskStatus.IN_PROGRESS
    }
  }

  // 处理状态变化
  function handleStatusChange(val) {
    const startDate = formData.value.startDate
    const endDate = formData.value.endDate

    // 验证：无开始日期的任务只能设置为待办
    if (!startDate && val !== TaskStatus.TODO) {
      ElMessage.warning('未设置开始日期的任务只能设置为"待办"')
      setTimeout(() => {
        formData.value.status = TaskStatus.TODO
      }, 0)
      return
    }

    // 验证：开始日期在今天之后的任务只能设置为待办
    if (isDateAfterToday(startDate) && val !== TaskStatus.TODO) {
      ElMessage.warning('开始日期在今天之后，只能设置为"待办"')
      setTimeout(() => {
        formData.value.status = TaskStatus.TODO
      }, 0)
      return
    }

    // 验证：结束日期在今天之后的任务不能设置为已完成
    if (val === TaskStatus.DONE && isDateAfterToday(endDate)) {
      ElMessage.warning('结束日期在今天之后，不能设置为"已完成"')
      setTimeout(() => {
        formData.value.status = TaskStatus.IN_PROGRESS
      }, 0)
      return
    }

    // 状态与进度联动
    if (val === TaskStatus.DONE) {
      formData.value.progress = 100
    } else if (val === TaskStatus.TODO) {
      formData.value.progress = 0
    } else if (val === TaskStatus.IN_PROGRESS && formData.value.progress === 100) {
      formData.value.progress = 50
    }
  }

  return {
    TaskStatus,
    TaskPriority,
    statusOptions,
    priorityOptions,
    availableStatusOptions,
    handleProgressChange,
    handleStatusChange
  }
}
