import { ref, computed } from 'vue'

// 默认边距参数
const DEFAULT_FIT_START_PADDING = 0
const DEFAULT_FIT_END_PADDING = 15

// localStorage 键名
const STORAGE_KEYS = {
  FIT_PADDING: 'gantt-fit-padding',
}

// 从 localStorage 加载自适应参数
function loadFitPaddingFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FIT_PADDING)
    if (saved) {
      const { start, end } = JSON.parse(saved)
      return { start: start ?? DEFAULT_FIT_START_PADDING, end: end ?? DEFAULT_FIT_END_PADDING }
    }
  } catch (e) {
    console.warn('加载自适应参数失败:', e)
  }
  return { start: DEFAULT_FIT_START_PADDING, end: DEFAULT_FIT_END_PADDING }
}

// 保存自适应参数到 localStorage
function saveFitPaddingToStorage(start, end) {
  try {
    localStorage.setItem(STORAGE_KEYS.FIT_PADDING, JSON.stringify({ start, end }))
  } catch (e) {
    console.warn('保存自适应参数失败:', e)
  }
}

export function useTimeRange(props, currentScale, isTaskOrAncestorHidden) {
  // 时间范围边距控制
  const timeRangeStartPadding = ref(7)
  const timeRangeEndPadding = ref(14)

  // 从 localStorage 加载自适应参数
  const savedFitPadding = loadFitPaddingFromStorage()
  const fitStartPadding = ref(savedFitPadding.start)
  const fitEndPadding = ref(savedFitPadding.end)

  // 初始化时间范围边距
  timeRangeStartPadding.value = fitStartPadding.value
  timeRangeEndPadding.value = fitEndPadding.value

  // 计算时间范围
  const timeRange = computed(() => {
    if (props.tasks.length === 0) {
      const today = new Date()
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 3, 0),
      }
    }

    // 过滤掉被隐藏的任务
    const visibleTasks = props.tasks.filter(t => !isTaskOrAncestorHidden(t.id))
    const tasksToUse = visibleTasks.length > 0 ? visibleTasks : props.tasks

    // 辅助函数：将日期字符串解析为本地时间（避免时区问题）
    function parseLocalDate(dateString) {
      const [year, month, day] = dateString.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const dates = tasksToUse.flatMap((t) => [
      parseLocalDate(t.startDate),
      parseLocalDate(t.endDate),
    ])

    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))

    // 应用用户设置的边距
    const paddedMinDate = new Date(minDate)
    paddedMinDate.setDate(paddedMinDate.getDate() - timeRangeStartPadding.value)
    const paddedMaxDate = new Date(maxDate)
    paddedMaxDate.setDate(paddedMaxDate.getDate() + timeRangeEndPadding.value)

    // 直接使用计算后的日期，不做任何周期对齐
    return { start: paddedMinDate, end: paddedMaxDate }
  })

  // 生成时间刻度
  function generateTimeColumns(timeScales, cellWidth) {
    const columns = []
    const { start, end } = timeRange.value
    const scale = timeScales.find((s) => s.value === currentScale.value)
    const daysPerCell = scale?.daysPerCell || 7

    if (currentScale.value === 'month') {
      let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1)
      while (currentMonth <= end) {
        const monthEnd = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0
        )
        columns.push({
          start: new Date(currentMonth),
          end: monthEnd,
          label: `${currentMonth.getFullYear()}年${
            currentMonth.getMonth() + 1
          }月`,
          key: `${currentMonth.getFullYear()}-${String(
            currentMonth.getMonth() + 1
          ).padStart(2, '0')}`,
        })
        currentMonth = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          1
        )
      }
    } else if (currentScale.value === 'quarter') {
      let currentQuarter = Math.floor(start.getMonth() / 3)
      let currentYear = start.getFullYear()
      const endQuarter = Math.floor(end.getMonth() / 3)
      const endYear = end.getFullYear()

      while (
        currentYear < endYear ||
        (currentYear === endYear && currentQuarter <= endQuarter)
      ) {
        const quarterStart = new Date(currentYear, currentQuarter * 3, 1)
        const quarterEnd = new Date(currentYear, (currentQuarter + 1) * 3, 0)
        columns.push({
          start: quarterStart,
          end: quarterEnd,
          label: `${currentYear}年第${currentQuarter + 1}季度`,
          key: `${currentYear}-Q${currentQuarter + 1}`,
        })
        currentQuarter++
        if (currentQuarter > 3) {
          currentQuarter = 0
          currentYear++
        }
      }
    } else if (currentScale.value === 'year') {
      let currentYear = start.getFullYear()
      const endYear = end.getFullYear()

      while (currentYear <= endYear) {
        const yearStart = new Date(currentYear, 0, 1)
        const yearEnd = new Date(currentYear, 11, 31)
        columns.push({
          start: yearStart,
          end: yearEnd,
          label: `${currentYear}年`,
          key: `${currentYear}`,
        })
        currentYear++
      }
    } else {
      let currentTime = start.getTime()
      const endTime = end.getTime()
      const oneDay = 24 * 60 * 60 * 1000

      while (currentTime <= endTime) {
        const cellStart = new Date(currentTime)
        const cellEnd = new Date(currentTime + (daysPerCell - 1) * oneDay)

        let label = ''
        if (currentScale.value === 'day') {
          label = `${cellStart.getMonth() + 1}/${cellStart.getDate()}`
        } else if (currentScale.value === 'week') {
          label = `${cellStart.getMonth() + 1}/${cellStart.getDate()} - ${
            cellEnd.getMonth() + 1
          }/${cellEnd.getDate()}`
        }

        columns.push({
          start: cellStart,
          end: cellEnd,
          label,
          key: cellStart.toISOString().split('T')[0],
        })

        currentTime += daysPerCell * oneDay
      }
    }

    return columns
  }

  // 更新边距设置
  function updatePadding(start, end) {
    fitStartPadding.value = start
    fitEndPadding.value = end
    timeRangeStartPadding.value = start
    timeRangeEndPadding.value = end
    saveFitPaddingToStorage(start, end)
  }

  return {
    timeRangeStartPadding,
    timeRangeEndPadding,
    fitStartPadding,
    fitEndPadding,
    timeRange,
    generateTimeColumns,
    updatePadding,
    saveFitPaddingToStorage,
  }
}
