import { ref, nextTick } from 'vue'
import { domToCanvas } from 'modern-screenshot'

export function useExport() {
  const isExporting = ref(false)
  const showExportConfirmDialog = ref(false)
  const showProgressDialog = ref(false)
  const exportProgress = ref(0)
  const exportProgressText = ref('准备导出...')

  async function exportToPDF() {
    if (isExporting.value) return
    showExportConfirmDialog.value = true
  }

  async function confirmExport(ganttBodyRef, doExportFn) {
    showExportConfirmDialog.value = false
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 100))
    await doExportFn(ganttBodyRef)
  }

  async function doExport(ganttBodyRef) {
    if (isExporting.value) return
    if (!ganttBodyRef.value) return

    isExporting.value = true
    showProgressDialog.value = true
    exportProgress.value = 10
    exportProgressText.value = '正在准备导出...'

    try {
      const container = ganttBodyRef.value

      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 300))

      exportProgress.value = 40
      exportProgressText.value = '正在生成图像...'

      const canvas = await domToCanvas(container, {
        scale: 3,
        backgroundColor: '#ffffff',
        style: {
          fontWeight: 'normal',
        },
      })

      exportProgress.value = 80
      exportProgressText.value = '正在生成图片文件...'

      await downloadImage(canvas)

      exportProgress.value = 100
      exportProgressText.value = '导出完成！'

      await new Promise((resolve) => setTimeout(resolve, 800))
    } catch (error) {
      console.error('导出失败:', error)
      exportProgressText.value = '导出失败，请重试'
      await new Promise((resolve) => setTimeout(resolve, 1500))
    } finally {
      showProgressDialog.value = false
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 200))
      isExporting.value = false
      exportProgress.value = 0
    }
  }

  async function downloadImage(canvas) {
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(
      2,
      '0'
    )}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const fileName = `甘特图_${dateStr}.png`

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      },
      'image/png',
      1.0
    )
  }

  return {
    isExporting,
    showExportConfirmDialog,
    showProgressDialog,
    exportProgress,
    exportProgressText,
    exportToPDF,
    confirmExport,
    doExport,
  }
}
