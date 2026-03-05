import { computed } from 'vue'
import { TaskStatus } from '@/types/task.js'

export function useDateLogic(formData, ElMessage) {
  // 获取今天的日期字符串
  const getTodayString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 检查日期是否在今天之后
  const isDateAfterToday = (dateStr) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date(getTodayString())
    return date > today
  }

  // 检查日期是否在今天之前
  const isDateBeforeToday = (dateStr) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date(getTodayString())
    return date < today
  }

  // 检查日期是否是今天
  const isDateToday = (dateStr) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date(getTodayString())
    return date.getTime() === today.getTime()
  }

  // 日期快捷选项
  const startDateShortcuts = [
    { text: '今天', value: new Date() },
    {
      text: '昨天',
      value: () => {
        const date = new Date()
        date.setTime(date.getTime() - 3600 * 1000 * 24)
        return date
      }
    },
    {
      text: '上周',
      value: () => {
        const date = new Date()
        date.setTime(date.getTime() - 3600 * 1000 * 24 * 7)
        return date
      }
    },
    {
      text: '上月',
      value: () => {
        const date = new Date()
        date.setMonth(date.getMonth() - 1)
        return date
      }
    },
    {
      text: '明天',
      value: () => {
        const date = new Date()
        date.setTime(date.getTime() + 3600 * 1000 * 24)
        return date
      }
    },
    {
      text: '一周后',
      value: () => {
        const date = new Date()
        date.setTime(date.getTime() + 3600 * 1000 * 24 * 7)
        return date
      }
    }
  ]

  const endDateShortcuts = [
    { text: '今天', value: new Date() },
    {
      text: '一周后',
      value: () => {
        const date = new Date()
        date.setTime(date.getTime() + 3600 * 1000 * 24 * 7)
        return date
      }
    },
    {
      text: '一个月后',
      value: () => {
        const date = new Date()
        date.setMonth(date.getMonth() + 1)
        return date
      }
    }
  ]

  // 处理开始日期变化
  function handleStartDateChange(val) {
    // 如果清空了开始日期，状态重置为待办
    if (!val && formData.value.status !== TaskStatus.TODO) {
      ElMessage.info('未设置开始日期，状态已重置为"待办"')
      formData.value.status = TaskStatus.TODO
      formData.value.progress = 0
    }

    // 如果开始日期改为今天之后，且当前状态不是待办，则重置为待办
    if (val && isDateAfterToday(val) && formData.value.status !== TaskStatus.TODO) {
      ElMessage.info('开始日期在今天之后，状态已重置为"待办"')
      formData.value.status = TaskStatus.TODO
      formData.value.progress = 0
    }
  }

  // 处理结束日期变化
  function handleEndDateChange(val) {
    // 如果结束日期改为今天之后，且当前状态是已完成，则重置为进行中
    if (val && isDateAfterToday(val) && formData.value.status === TaskStatus.DONE) {
      ElMessage.info('结束日期在今天之后，状态已重置为"进行中"')
      formData.value.status = TaskStatus.IN_PROGRESS
      if (formData.value.progress === 100) {
        formData.value.progress = 50
      }
    }
  }

  return {
    getTodayString,
    isDateAfterToday,
    isDateBeforeToday,
    isDateToday,
    startDateShortcuts,
    endDateShortcuts,
    handleStartDateChange,
    handleEndDateChange
  }
}
