import { ElMessage, ElMessageBox } from 'element-plus'
import { TaskStatus } from '@/types/task.js'

// 获取今天的日期字符串
function getTodayString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 检查日期是否在今天之后
function isDateAfterToday(dateStr) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date(getTodayString())
  return date > today
}

export function useStatusChange() {
  // 检查任务是否可以移动到目标状态
  function canMoveToStatus(task, newStatus) {
    if (!task) return { canMove: false, reason: '' }

    // 待办 → 进行中
    if (newStatus === TaskStatus.IN_PROGRESS && task.status === TaskStatus.TODO) {
      if (!task.startDate) {
        return {
          canMove: false,
          reason: '未设置开始日期的任务不能开始，请先设置开始日期'
        }
      }
      return { canMove: true, reason: '' }
    }

    // 待办 → 已完成
    if (newStatus === TaskStatus.DONE && task.status === TaskStatus.TODO) {
      return {
        canMove: false,
        reason: '任务必须先开始才能标记为完成'
      }
    }

    // 进行中 → 已完成
    if (newStatus === TaskStatus.DONE && task.status === TaskStatus.IN_PROGRESS) {
      return { canMove: true, reason: '' }
    }

    // 进行中 → 待办
    if (newStatus === TaskStatus.TODO && task.status === TaskStatus.IN_PROGRESS) {
      return { canMove: true, reason: '' }
    }

    // 已完成 → 进行中
    if (newStatus === TaskStatus.IN_PROGRESS && task.status === TaskStatus.DONE) {
      return { canMove: true, reason: '' }
    }

    // 已完成 → 待办
    if (newStatus === TaskStatus.TODO && task.status === TaskStatus.DONE) {
      return {
        canMove: false,
        reason: '已完成的任务不能移回"待办"，请先移回"进行中"'
      }
    }

    return { canMove: true, reason: '' }
  }

  // 检查状态变更是否需要确认和调整
  function checkStatusChange(task, newStatus) {
    const today = getTodayString()

    // 待办 → 进行中
    if (newStatus === TaskStatus.IN_PROGRESS && task.status === TaskStatus.TODO) {
      if (isDateAfterToday(task.startDate)) {
        return {
          needConfirm: true,
          title: '调整开始时间',
          message: `任务"${task.title}"的计划开始时间是 ${task.startDate}（今天之后）。\n\n开始执行任务需要将开始时间调整为今天（${today}）。\n\n是否确认调整？`,
          updates: { status: newStatus, startDate: today }
        }
      }
      return { needConfirm: false, updates: { status: newStatus } }
    }

    // 进行中 → 已完成
    if (newStatus === TaskStatus.DONE && task.status === TaskStatus.IN_PROGRESS) {
      if (isDateAfterToday(task.endDate)) {
        return {
          needConfirm: true,
          title: '提前完成任务',
          message: `任务"${task.title}"的计划结束时间是 ${task.endDate}（今天之后）。\n\n提前完成需要将结束时间调整为今天（${today}），进度设为100%。\n\n是否确认调整？`,
          updates: { status: newStatus, endDate: today, progress: 100 }
        }
      }
      return { needConfirm: false, updates: { status: newStatus, progress: 100 } }
    }

    // 进行中 → 待办
    if (newStatus === TaskStatus.TODO && task.status === TaskStatus.IN_PROGRESS) {
      if (task.progress > 0) {
        return {
          needConfirm: true,
          isWarning: true,
          title: '⚠️ 重置任务',
          message: `任务"${task.title}"当前进度为 ${task.progress}%。\n\n移回"待办"将清空进度并重置状态！\n\n是否确认重置？`,
          updates: { status: newStatus, progress: 0 }
        }
      }
      return { needConfirm: false, updates: { status: newStatus } }
    }

    // 已完成 → 进行中
    if (newStatus === TaskStatus.IN_PROGRESS && task.status === TaskStatus.DONE) {
      const updates = { status: newStatus, endDate: today }
      let message = `任务"${task.title}"当前为"已完成"状态。\n\n重新打开任务将：`

      if (task.progress === 100) {
        updates.progress = 95
        message += '\n• 进度从 100% 调整为 95%'
      }

      message += `\n• 结束时间调整为今天（${today}）`
      message += '\n\n是否确认重新打开？'

      return {
        needConfirm: true,
        isWarning: true,
        title: '⚠️ 重新打开任务',
        message: message,
        updates: updates
      }
    }

    return { needConfirm: false, updates: { status: newStatus } }
  }

  // 处理状态变更
  async function handleStatusChange(task, newStatus, emit) {
    const { canMove, reason } = canMoveToStatus(task, newStatus)
    if (!canMove) {
      ElMessage.warning(reason)
      return
    }

    const checkResult = checkStatusChange(task, newStatus)

    if (checkResult.needConfirm) {
      try {
        await ElMessageBox.confirm(
          checkResult.message,
          checkResult.title,
          {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: checkResult.isWarning ? 'warning' : 'info',
            closeOnClickModal: false
          }
        )

        emit('updateTaskDates', task.id, checkResult.updates)
        ElMessage.success('任务状态已更新')
      } catch (error) {
        // 用户取消
      }
    } else {
      emit('updateTaskDates', task.id, checkResult.updates)
      ElMessage.success('任务状态已更新')
    }
  }

  return {
    canMoveToStatus,
    checkStatusChange,
    handleStatusChange
  }
}
