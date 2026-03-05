import { ref, computed, triggerRef } from 'vue'

// localStorage 键名
const STORAGE_KEYS = {
  HIDDEN_TASKS: 'gantt-hidden-tasks',
}

// 从 localStorage 加载隐藏任务
function loadHiddenTasksFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.HIDDEN_TASKS)
    if (saved) {
      const ids = JSON.parse(saved)
      return new Set(ids)
    }
  } catch (e) {
    console.warn('加载隐藏任务失败:', e)
  }
  return new Set()
}

// 保存隐藏任务到 localStorage
function saveHiddenTasksToStorage(ids) {
  try {
    localStorage.setItem(STORAGE_KEYS.HIDDEN_TASKS, JSON.stringify([...ids]))
  } catch (e) {
    console.warn('保存隐藏任务失败:', e)
  }
}

// 按创建时间排序的比较函数
const sortByCreatedAt = (a, b) => {
  if (a.createdAt && b.createdAt) {
    return new Date(a.createdAt) - new Date(b.createdAt)
  }
  return 0
}

export function useTaskOrganization(tasks) {
  // 折叠状态
  const collapsedIds = ref(new Set())
  // 隐藏任务状态
  const hiddenIds = ref(loadHiddenTasksFromStorage())

  // 切换折叠状态
  function toggleCollapse(taskId) {
    if (collapsedIds.value.has(taskId)) {
      collapsedIds.value.delete(taskId)
    } else {
      collapsedIds.value.add(taskId)
    }
    triggerRef(collapsedIds)
  }

  // 切换隐藏状态
  function toggleHidden(taskId) {
    if (hiddenIds.value.has(taskId)) {
      hiddenIds.value.delete(taskId)
    } else {
      hiddenIds.value.add(taskId)
    }
    saveHiddenTasksToStorage(hiddenIds.value)
    triggerRef(hiddenIds)
  }

  // 显示所有隐藏的任务
  function showAllHidden() {
    hiddenIds.value.clear()
    saveHiddenTasksToStorage(hiddenIds.value)
    triggerRef(hiddenIds)
  }

  // 根据标题切换隐藏状态
  function toggleHiddenByTitle(title) {
    const task = tasks.value.find(t => t.title === title)
    if (task) {
      toggleHidden(task.id)
    }
  }

  // 获取隐藏任务的标题列表
  const hiddenTaskTitles = computed(() => {
    const titles = []
    tasks.value.forEach(task => {
      if (hiddenIds.value.has(task.id)) {
        titles.push(task.title)
      }
    })
    return titles
  })

  // 检查任务或其祖先是否被隐藏
  function isTaskOrAncestorHidden(taskId) {
    if (hiddenIds.value.has(taskId)) return true
    const task = tasks.value.find(t => t.id === taskId)
    if (task && task.parentId) {
      return isTaskOrAncestorHidden(task.parentId)
    }
    return false
  }

  // 组织任务的层级结构
  const organizedTasks = computed(() => {
    const taskMap = new Map()
    const rootTasks = []

    // 创建任务映射
    for (const task of tasks.value) {
      taskMap.set(task.id, {
        ...task,
        children: [],
        level: 0,
        displayNumber: '',
      })
    }

    // 构建层级结构
    for (const task of tasks.value) {
      const taskNode = taskMap.get(task.id)
      if (task.parentId && taskMap.has(task.parentId)) {
        const parent = taskMap.get(task.parentId)
        taskNode.level = parent.level + 1
        parent.children.push(taskNode)
      } else {
        rootTasks.push(taskNode)
      }
    }

    // 递归排序子任务
    function sortChildren(tasks) {
      tasks.sort(sortByCreatedAt)
      for (const task of tasks) {
        if (task.children.length > 0) {
          sortChildren(task.children)
        }
      }
    }
    sortChildren(rootTasks)

    // 扁平化显示顺序（考虑折叠状态和隐藏状态）并生成编号
    const result = []
    function flatten(tasks, parentCollapsed = false, parentHidden = false, parentNumber = '', isRootLevel = true) {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]

        // 如果父任务被隐藏或当前任务被隐藏，跳过
        if (parentHidden || hiddenIds.value.has(task.id)) continue
        if (parentCollapsed) return

        const currentNumber = isRootLevel ? '' : (parentNumber ? `${parentNumber}.${i + 1}` : `${i + 1}`)
        task.displayNumber = currentNumber

        result.push(task)
        if (task.children.length > 0) {
          flatten(task.children, collapsedIds.value.has(task.id), false, currentNumber, false)
        }
      }
    }
    flatten(rootTasks)

    return result
  })

  return {
    collapsedIds,
    hiddenIds,
    hiddenTaskTitles,
    organizedTasks,
    toggleCollapse,
    toggleHidden,
    showAllHidden,
    toggleHiddenByTitle,
    isTaskOrAncestorHidden,
  }
}
