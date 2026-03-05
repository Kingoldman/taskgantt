import { ref, nextTick } from 'vue'

export function useFitToScreen() {
  // 自适应参数设置对话框
  const showFitPaddingDialog = ref(false)
  const tempFitStartPadding = ref(1)
  const tempFitEndPadding = ref(15)

  // 自适应屏幕
  async function fitToScreen(
    timelineRef,
    tasks,
    isTaskOrAncestorHidden,
    timeRange,
    currentScale,
    timeScales,
    fitStartPadding,
    fitEndPadding,
    timeRangeStartPadding,
    timeRangeEndPadding,
    baseCellWidth,
    setZoom
  ) {
    if (!timelineRef.value || !tasks.length) return

    // 直接使用用户设置的边距值
    timeRangeStartPadding.value = fitStartPadding.value
    timeRangeEndPadding.value = fitEndPadding.value

    await nextTick()

    const containerWidth = timelineRef.value.clientWidth
    const { start, end } = timeRange.value

    const diffTime = end.getTime() - start.getTime()
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    let targetScale = currentScale.value
    let recommendedScale = 'day'
    if (totalDays > 365 * 2) {
      recommendedScale = 'year'
    } else if (totalDays > 90) {
      recommendedScale = 'month'
    } else if (totalDays > 21) {
      recommendedScale = 'week'
    } else {
      recommendedScale = 'day'
    }

    const currentScaleIndex = timeScales.findIndex((s) => s.value === currentScale.value)
    const recommendedIndex = timeScales.findIndex((s) => s.value === recommendedScale)
    if (currentScaleIndex < recommendedIndex) {
      targetScale = recommendedScale
      currentScale.value = targetScale
    }

    const scaleConfig = timeScales.find((s) => s.value === targetScale)
    const defaultCellWidth = scaleConfig?.cellWidth || 100

    baseCellWidth.value = defaultCellWidth

    const { start: newStart, end: newEnd } = timeRange.value

    let columnCount = 0
    if (targetScale === 'day') {
      const dayDiff = Math.ceil((newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      columnCount = dayDiff
    } else if (targetScale === 'week') {
      const dayDiff = Math.ceil((newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      columnCount = Math.ceil(dayDiff / 7)
    } else if (targetScale === 'month') {
      columnCount = (newEnd.getFullYear() - newStart.getFullYear()) * 12 + (newEnd.getMonth() - newStart.getMonth()) + 1
    } else if (targetScale === 'quarter') {
      columnCount = (newEnd.getFullYear() - newStart.getFullYear()) * 4 + Math.floor((newEnd.getMonth() - newStart.getMonth()) / 3) + 1
    } else if (targetScale === 'year') {
      columnCount = newEnd.getFullYear() - newStart.getFullYear() + 1
    }

    const availableWidth = containerWidth - 20
    const targetCellWidth = Math.max(40, Math.floor(availableWidth / Math.max(1, columnCount)))

    const minCellWidth = 30
    const maxCellWidth = Math.max(defaultCellWidth * 3, 300)
    const actualCellWidth = Math.min(maxCellWidth, Math.max(minCellWidth, targetCellWidth))

    const zoomPercent = Math.round((actualCellWidth / defaultCellWidth) * 100)

    setZoom(zoomPercent)

    await nextTick()
    if (timelineRef.value) {
      timelineRef.value.scrollLeft = 0
      timelineRef.value.scrollTop = 0
    }
  }

  // 打开自适应参数设置对话框
  function openFitPaddingDialog(fitStartPadding, fitEndPadding, tempStart, tempEnd) {
    tempStart.value = fitStartPadding.value
    tempEnd.value = fitEndPadding.value
    showFitPaddingDialog.value = true
  }

  return {
    showFitPaddingDialog,
    tempFitStartPadding,
    tempFitEndPadding,
    fitToScreen,
    openFitPaddingDialog,
  }
}
