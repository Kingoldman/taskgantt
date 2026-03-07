import { computed } from 'vue'

export function useDependencyLines(organizedTasks, getTaskBarStyle, COLORS) {
  // 计算依赖关系连接线坐标
  function getDependencyLine(task, depId, taskIndex) {
    const depTask = organizedTasks.value.find((t) => t.id === depId)
    if (!depTask) return null

    const depIndex = organizedTasks.value.findIndex((t) => t.id === depId)
    if (depIndex === -1) return null

    const depStyle = getTaskBarStyle(depTask)
    const taskStyle = getTaskBarStyle(task)

    const depLeft = parseFloat(depStyle.left)
    const depWidth = parseFloat(depStyle.width)
    const taskLeft = parseFloat(taskStyle.left)

    const x1 = depLeft + depWidth
    const y1 = depIndex * 48 + 24
    const x2 = taskLeft
    const y2 = taskIndex * 48 + 24

    return { x1, y1, x2, y2 }
  }

  // 检查前置任务是否已开始
  function checkDependenciesStarted(task, allTasks) {
    if (!task.dependencies || task.dependencies.length === 0) {
      return { allStarted: true, notStartedTasks: [] }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const notStartedTasks = []
    task.dependencies.forEach((depId) => {
      const depTask = allTasks.find((t) => t.id === depId)
      if (depTask) {
        const depStartDate = new Date(depTask.startDate)
        if (depStartDate > today) {
          notStartedTasks.push(depTask.title)
        }
      }
    })

    return {
      allStarted: notStartedTasks.length === 0,
      notStartedTasks,
    }
  }

  // 获取前置任务标题
  function getDependencyTitle(depId, allTasks) {
    const depTask = allTasks.find((t) => t.id === depId)
    return depTask ? depTask.title : '未知任务'
  }

  // 检查单个前置任务是否已开始
  function isDependencyStarted(depId, allTasks) {
    const depTask = allTasks.find((t) => t.id === depId)
    if (!depTask) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const depStartDate = new Date(depTask.startDate)
    return depStartDate <= today
  }

  return {
    getDependencyLine,
    checkDependenciesStarted,
    getDependencyTitle,
    isDependencyStarted,
  }
}
