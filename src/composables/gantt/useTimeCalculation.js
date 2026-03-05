import { computed } from 'vue'

// 通用颜色常量
export const COLORS = {
  danger: '#F56C6C',
  warning: '#E6A23C',
  border: '#EBEEF5',
  textRegular: '#606266',
  info: '#909399',
  primary: '#409EFF',
  success: '#67C23A',
}

// 状态配置映射表
export const STATUS_CONFIG = {
  done: {
    color: '#67C23A',
    colorLight: '#85D462',
    bgColor: '#C2E7B0',
    textColor: '#1D7E0D',
    label: '已完成',
  },
  inprogress: {
    color: '#409EFF',
    colorLight: '#66B1FF',
    bgColor: '#A8D0F8',
    textColor: '#0D5CAD',
    label: '进行中',
  },
  todo: {
    color: '#909399',
    colorLight: '#B0B3B8',
    bgColor: '#C8C9CC',
    textColor: '#303133',
    label: '待办',
  },
}

// 获取年份的天数
function getDaysInYear(year) {
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365
}

export function useTimeCalculation(props, timeRange, cellWidth, currentScale, timeScales) {
  // 计算今日线位置（显示在今日网格的右侧边缘）
  const todayLineLeft = computed(() => {
    const today = new Date()
    const { start: rangeStart } = timeRange.value
    const scale = timeScales.find((s) => s.value === currentScale.value)
    const daysPerCell = scale?.daysPerCell || 7

    switch (currentScale.value) {
      case 'month':
        return calculateTodayMonthPosition(today, rangeStart)
      case 'quarter':
        return calculateTodayQuarterPosition(today, rangeStart)
      case 'year':
        return calculateTodayYearPosition(today, rangeStart)
      default:
        return calculateTodayDefaultPosition(today, rangeStart, daysPerCell)
    }
  })

  // 计算月刻度下的位置
  function calculateMonthPosition(date, rangeStart) {
    const monthIndex =
      (date.getFullYear() - rangeStart.getFullYear()) * 12 +
      (date.getMonth() - rangeStart.getMonth())
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    // 日期在月份中的偏移（1号偏移为0）
    const dayOffset = (date.getDate() - 1) / daysInMonth
    return (monthIndex + dayOffset) * cellWidth.value
  }

  // 计算季度刻度下的位置
  function calculateQuarterPosition(date, rangeStart) {
    const quarter = Math.floor(date.getMonth() / 3)
    const rangeStartQuarter = Math.floor(rangeStart.getMonth() / 3)
    const quarterIndex =
      (date.getFullYear() - rangeStart.getFullYear()) * 4 +
      (quarter - rangeStartQuarter)
    const quarterStartMonth = quarter * 3
    const quarterStartDate = new Date(date.getFullYear(), quarterStartMonth, 1)
    const daysInQuarter =
      Math.floor(
        (new Date(date.getFullYear(), quarterStartMonth + 3, 0) - quarterStartDate) / (1000 * 60 * 60 * 24)
      ) + 1
    const daysFromQuarterStart = Math.floor(
      (date - quarterStartDate) / (1000 * 60 * 60 * 24)
    ) + 1
    const dayOffset = daysFromQuarterStart / daysInQuarter
    return (quarterIndex + dayOffset) * cellWidth.value
  }

  // 计算年刻度下的位置
  function calculateYearPosition(date, rangeStart) {
    const yearIndex = date.getFullYear() - rangeStart.getFullYear()
    const yearStartDate = new Date(date.getFullYear(), 0, 1)
    const daysInYear = getDaysInYear(date.getFullYear())
    const daysFromYearStart = Math.floor(
      (date - yearStartDate) / (1000 * 60 * 60 * 24)
    ) + 1
    const dayOffset = daysFromYearStart / daysInYear
    return (yearIndex + dayOffset) * cellWidth.value
  }

  // 计算日/周刻度下的位置
  function calculateDefaultPosition(date, rangeStart, daysPerCell) {
    const daysFromStart = Math.floor((date - rangeStart) / (1000 * 60 * 60 * 24))
    return (daysFromStart / daysPerCell) * cellWidth.value
  }

  // 计算今日线在月刻度下的位置（显示在今日网格的右侧边缘）
  function calculateTodayMonthPosition(date, rangeStart) {
    const monthIndex =
      (date.getFullYear() - rangeStart.getFullYear()) * 12 +
      (date.getMonth() - rangeStart.getMonth())
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    // 今日线显示在今日网格的右侧边缘
    const dayOffset = (date.getDate() - 1) / daysInMonth
    return (monthIndex + dayOffset + 1 / daysInMonth) * cellWidth.value
  }

  // 计算今日线在季度刻度下的位置（显示在今日网格的右侧边缘）
  function calculateTodayQuarterPosition(date, rangeStart) {
    const quarter = Math.floor(date.getMonth() / 3)
    const rangeStartQuarter = Math.floor(rangeStart.getMonth() / 3)
    const quarterIndex =
      (date.getFullYear() - rangeStart.getFullYear()) * 4 +
      (quarter - rangeStartQuarter)
    const quarterStartMonth = quarter * 3
    const quarterStartDate = new Date(date.getFullYear(), quarterStartMonth, 1)
    const daysInQuarter =
      Math.floor(
        (new Date(date.getFullYear(), quarterStartMonth + 3, 0) - quarterStartDate) / (1000 * 60 * 60 * 24)
      ) + 1
    const daysFromQuarterStart = Math.floor(
      (date - quarterStartDate) / (1000 * 60 * 60 * 24)
    )
    const dayOffset = (daysFromQuarterStart + 1) / daysInQuarter
    return (quarterIndex + dayOffset) * cellWidth.value
  }

  // 计算今日线在年刻度下的位置（显示在今日网格的右侧边缘）
  function calculateTodayYearPosition(date, rangeStart) {
    const yearIndex = date.getFullYear() - rangeStart.getFullYear()
    const yearStartDate = new Date(date.getFullYear(), 0, 1)
    const daysInYear = getDaysInYear(date.getFullYear())
    const daysFromYearStart = Math.floor(
      (date - yearStartDate) / (1000 * 60 * 60 * 24)
    )
    const dayOffset = (daysFromYearStart + 1) / daysInYear
    return (yearIndex + dayOffset) * cellWidth.value
  }

  // 计算今日线在日/周刻度下的位置（显示在今日网格的右侧边缘）
  function calculateTodayDefaultPosition(date, rangeStart, daysPerCell) {
    const daysFromStart = Math.floor((date - rangeStart) / (1000 * 60 * 60 * 24))
    return ((daysFromStart + 1) / daysPerCell) * cellWidth.value
  }

  // 辅助函数：将日期字符串解析为本地时间（避免时区问题）
  function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // 计算任务条位置和宽度
  function getTaskBarStyle(task) {
    const { start: rangeStart } = timeRange.value
    const taskStart = parseLocalDate(task.startDate)
    const taskEnd = parseLocalDate(task.endDate)
    const scale = timeScales.find((s) => s.value === currentScale.value)
    const daysPerCell = scale?.daysPerCell || 7

    let left, width

    switch (currentScale.value) {
      case 'month':
        left = calculateMonthPosition(taskStart, rangeStart)
        const rightEdgeMonth = calculateMonthPosition(taskEnd, rangeStart)
        width = Math.max(10, rightEdgeMonth - left)
        break
      case 'quarter':
        left = calculateQuarterPosition(taskStart, rangeStart)
        const rightEdgeQuarter = calculateQuarterPosition(taskEnd, rangeStart)
        width = Math.max(10, rightEdgeQuarter - left)
        break
      case 'year':
        left = calculateYearPosition(taskStart, rangeStart)
        const rightEdgeYear = calculateYearPosition(taskEnd, rangeStart)
        width = Math.max(10, rightEdgeYear - left)
        break
      default:
        left = calculateDefaultPosition(taskStart, rangeStart, daysPerCell)
        const duration = Math.max(
          1,
          Math.floor((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1
        )
        width = Math.max(20, (duration / daysPerCell) * cellWidth.value)
    }

    return {
      left: `${Math.max(0, left)}px`,
      width: `${width}px`,
    }
  }

  // 判断任务是否超期
  function isTaskOverdue(task) {
    if (task.status === 'done') return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(task.endDate)
    return endDate < today && task.progress < 100
  }

  // 获取状态配置
  function getStatusConfig(task) {
    return STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
  }

  // 获取状态颜色
  function getStatusColor(task) {
    return getStatusConfig(task).color
  }

  // 获取状态颜色（亮色）
  function getStatusColorLight(task) {
    return getStatusConfig(task).colorLight
  }

  // 获取状态标签
  function getStatusLabel(task) {
    return getStatusConfig(task).label
  }

  // 获取进度条颜色
  function getProgressColor(task) {
    return getStatusConfig(task).color
  }

  // 获取任务条背景色
  function getTaskBarBackgroundColor(task) {
    return getStatusConfig(task).bgColor
  }

  // 获取进度文字颜色
  function getProgressTextColor(task) {
    return getStatusConfig(task).textColor
  }

  // 检查任务或其父任务是否超期
  function isTaskOrParentOverdue(task) {
    if (isTaskOverdue(task)) return true
    if (task.parentId) {
      const parent = props.tasks.find((t) => t.id === task.parentId)
      if (parent) return isTaskOrParentOverdue(parent)
    }
    return false
  }

  // 计算两个日期之间的总天数
  function getTotalDays(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end.getTime() - start.getTime()
    return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1)
  }

  // 计算两个日期之间的工作日天数
  function getWorkDays(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    let workDays = 0
    const current = new Date(start)

    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++
      }
      current.setDate(current.getDate() + 1)
    }

    return Math.max(1, workDays)
  }

  // 获取条外标签样式
  function getExternalLabelStyle(task) {
    const statusConfig = getStatusConfig(task)
    return {
      borderColor: statusConfig.color,
      backgroundColor: `${statusConfig.bgColor}80`,
    }
  }

  return {
    COLORS,
    todayLineLeft,
    calculateMonthPosition,
    calculateQuarterPosition,
    calculateYearPosition,
    calculateDefaultPosition,
    getTaskBarStyle,
    isTaskOverdue,
    getStatusConfig,
    getStatusColor,
    getStatusColorLight,
    getStatusLabel,
    getProgressColor,
    getTaskBarBackgroundColor,
    getProgressTextColor,
    isTaskOrParentOverdue,
    getTotalDays,
    getWorkDays,
    getExternalLabelStyle,
  }
}
