import { ref, computed } from 'vue'
import { TIME_SCALES } from '@/config/ganttConfig.js'

// 默认显示设置
const DEFAULT_DISPLAY_SETTINGS = {
  scale: 'week',
  zoom: 100,
  showTodayLine: true,
  showDependencyArrows: true,
  showExternalLabels: true,
  scrollLeft: 0,
  scrollTop: 0,
}

// localStorage 键名
const STORAGE_KEYS = {
  DISPLAY_SETTINGS: 'gantt-display-settings',
}

// 从 localStorage 加载显示设置
function loadDisplaySettingsFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DISPLAY_SETTINGS)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...DEFAULT_DISPLAY_SETTINGS,
        ...parsed,
      }
    }
  } catch (e) {
    console.warn('加载显示设置失败:', e)
  }
  return { ...DEFAULT_DISPLAY_SETTINGS }
}

export function useTimeScale() {
  const timeScales = TIME_SCALES
  const savedDisplaySettings = loadDisplaySettingsFromStorage()

  const currentScale = ref(savedDisplaySettings.scale)
  const cellWidth = ref(100)
  const baseCellWidth = ref(100)
  const zoomSliderValue = ref(savedDisplaySettings.zoom)

  // 当前刻度配置
  const currentScaleConfig = computed(() => {
    return timeScales.find((s) => s.value === currentScale.value)
  })

  // 每天对应的单元格宽度
  const daysPerCell = computed(() => {
    return currentScaleConfig.value?.daysPerCell || 7
  })

  // 保存显示设置到 localStorage
  function saveDisplaySettingsToStorage(scrollLeft = 0, scrollTop = 0) {
    try {
      const settings = {
        scale: currentScale.value,
        zoom: zoomSliderValue.value,
        showTodayLine: true,
        showDependencyArrows: true,
        showExternalLabels: true,
        scrollLeft,
        scrollTop,
      }
      localStorage.setItem(STORAGE_KEYS.DISPLAY_SETTINGS, JSON.stringify(settings))
    } catch (e) {
      console.warn('保存显示设置失败:', e)
    }
  }

  // 切换时间刻度
  function handleScaleChange(scale) {
    currentScale.value = scale
    const scaleConfig = timeScales.find((s) => s.value === scale)
    if (scaleConfig) {
      baseCellWidth.value = scaleConfig.cellWidth
      cellWidth.value = Math.round((zoomSliderValue.value / 100) * baseCellWidth.value)
    }
  }

  // 处理缩放滑块变化
  function handleZoomSliderChange(value) {
    zoomSliderValue.value = value
    cellWidth.value = Math.round((value / 100) * baseCellWidth.value)
  }

  // 重置缩放
  function resetZoom() {
    zoomSliderValue.value = 100
    cellWidth.value = baseCellWidth.value
  }

  // 设置缩放值
  function setZoom(value) {
    zoomSliderValue.value = value
    cellWidth.value = Math.round((value / 100) * baseCellWidth.value)
  }

  // 初始化
  function initScale() {
    const scaleConfig = timeScales.find((s) => s.value === currentScale.value)
    if (scaleConfig) {
      baseCellWidth.value = scaleConfig.cellWidth
      cellWidth.value = Math.round((zoomSliderValue.value / 100) * baseCellWidth.value)
    }
  }

  return {
    timeScales,
    currentScale,
    cellWidth,
    baseCellWidth,
    zoomSliderValue,
    currentScaleConfig,
    daysPerCell,
    saveDisplaySettingsToStorage,
    handleScaleChange,
    handleZoomSliderChange,
    resetZoom,
    setZoom,
    initScale,
  }
}
