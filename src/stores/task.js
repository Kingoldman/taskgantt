import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createTask, TaskStatus } from '@/types/task.js'
import { generateSampleTasks } from '@/data/sampleTasks.js'

const STORAGE_KEY = 'taskgantt_tasks'

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to load tasks from storage:', error)
  }
  return []
}

function saveToStorage(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch (error) {
    console.error('Failed to save tasks to storage:', error)
  }
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const loading = ref(false)
  const selectedTaskId = ref(null)

  const allTasks = computed(() => tasks.value.filter(task => task != null))

  const todoTasks = computed(() =>
    tasks.value.filter(task => task && task.status === TaskStatus.TODO)
  )

  const inProgressTasks = computed(() =>
    tasks.value.filter(task => task && task.status === TaskStatus.IN_PROGRESS)
  )

  const doneTasks = computed(() =>
    tasks.value.filter(task => task && task.status === TaskStatus.DONE)
  )

  const selectedTask = computed(() =>
    tasks.value.find(task => task.id === selectedTaskId.value)
  )

  const getTaskById = computed(() => (id) =>
    tasks.value.find(task => task.id === id)
  )

  const tasksByStatus = computed(() => ({
    [TaskStatus.TODO]: todoTasks.value,
    [TaskStatus.IN_PROGRESS]: inProgressTasks.value,
    [TaskStatus.DONE]: doneTasks.value
  }))

  function initTasks() {
    const stored = loadFromStorage()
    const validTasks = stored.filter(task => task && task.id && task.status)
    if (validTasks.length > 0) {
      tasks.value = validTasks
      if (validTasks.length !== stored.length) {
        saveToStorage(tasks.value)
      }
    } else {
      tasks.value = generateSampleTasks()
      saveToStorage(tasks.value)
    }
  }

  function addTask(taskData) {
    const newTask = createTask(taskData)
    tasks.value.push(newTask)
    saveToStorage(tasks.value)
    return newTask
  }

  function updateTask(taskId, updates) {
    const index = tasks.value.findIndex(task => task.id === taskId)
    if (index !== -1) {
      const oldTask = { ...tasks.value[index] }
      tasks.value[index] = {
        ...tasks.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveToStorage(tasks.value)

      handleTaskStatusLinkage(taskId, updates, oldTask)

      return tasks.value[index]
    }
    return null
  }

  function handleTaskStatusLinkage(taskId, updates, oldTask) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return

    if (updates.progress === 100) {
      const children = tasks.value.filter(t => t.parentId === taskId)
      if (children.length > 0) {
        setChildrenCompleted(taskId)
        saveToStorage(tasks.value)
      }
    }

    if (oldTask.progress === 100 && updates.progress !== undefined && updates.progress < 100) {
      const children = tasks.value.filter(t => t.parentId === taskId)
      if (children.length > 0) {
        const latestChild = children.reduce((latest, current) => {
          const latestEnd = new Date(latest.endDate).getTime()
          const currentEnd = new Date(current.endDate).getTime()
          return currentEnd > latestEnd ? current : latest
        })

        const childIndex = tasks.value.findIndex(t => t.id === latestChild.id)
        if (childIndex !== -1 && tasks.value[childIndex].progress === 100) {
          tasks.value[childIndex] = {
            ...tasks.value[childIndex],
            progress: 90,
            status: 'inprogress',
            updatedAt: new Date().toISOString()
          }
        }
        saveToStorage(tasks.value)
      }
    }

    if (task.parentId && updates.progress !== undefined) {
      checkAndUpdateParentStatus(task.parentId)
    }
  }

  function setChildrenCompleted(parentId) {
    const children = tasks.value.filter(t => t.parentId === parentId)
    children.forEach(child => {
      if (child.progress < 100) {
        const childIndex = tasks.value.findIndex(t => t.id === child.id)
        if (childIndex !== -1) {
          tasks.value[childIndex] = {
            ...tasks.value[childIndex],
            progress: 100,
            status: 'done',
            updatedAt: new Date().toISOString()
          }
        }
      }
      setChildrenCompleted(child.id)
    })
  }

  function checkAndUpdateParentStatus(parentId) {
    const siblings = tasks.value.filter(t => t.parentId === parentId)
    if (siblings.length === 0) return

    const allCompleted = siblings.every(s => s.progress >= 100)
    const parentIndex = tasks.value.findIndex(t => t.id === parentId)

    if (parentIndex === -1) return

    if (allCompleted) {
      if (tasks.value[parentIndex].progress < 100) {
        tasks.value[parentIndex] = {
          ...tasks.value[parentIndex],
          progress: 100,
          status: 'done',
          updatedAt: new Date().toISOString()
        }
        saveToStorage(tasks.value)
      }
    } else {
      if (tasks.value[parentIndex].progress >= 100) {
        tasks.value[parentIndex] = {
          ...tasks.value[parentIndex],
          progress: 90,
          status: 'inprogress',
          updatedAt: new Date().toISOString()
        }
        saveToStorage(tasks.value)
      }
    }

    const parent = tasks.value[parentIndex]
    if (parent.parentId) {
      checkAndUpdateParentStatus(parent.parentId)
    }
  }

  function deleteTask(taskId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return false

    function deleteChildrenRecursive(parentId) {
      const children = tasks.value.filter(t => t.parentId === parentId)
      children.forEach(child => {
        deleteChildrenRecursive(child.id)
        const childIndex = tasks.value.findIndex(t => t.id === child.id)
        if (childIndex !== -1) {
          tasks.value.forEach(t => {
            if (t.dependencies.includes(child.id)) {
              t.dependencies = t.dependencies.filter(id => id !== child.id)
            }
          })
          tasks.value.splice(childIndex, 1)
        }
      })
    }

    deleteChildrenRecursive(taskId)

    tasks.value.forEach(t => {
      if (t.dependencies.includes(taskId)) {
        t.dependencies = t.dependencies.filter(id => id !== taskId)
      }
    })

    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      saveToStorage(tasks.value)

      if (selectedTaskId.value === taskId) {
        selectedTaskId.value = null
      }
      return true
    }
    return false
  }

  function updateTaskStatus(taskId, newStatus) {
    return updateTask(taskId, { status: newStatus })
  }

  function updateTaskProgress(taskId, progress) {
    return updateTask(taskId, { progress })
  }

  function selectTask(taskId) {
    selectedTaskId.value = taskId
  }

  function clearSelection() {
    selectedTaskId.value = null
  }

  function reorderTasks(status, newOrder) {
    const otherTasks = tasks.value.filter(task => task.status !== status)
    tasks.value = [...otherTasks, ...newOrder]
    saveToStorage(tasks.value)
  }

  function moveTask(taskId, newStatus, targetIndex = null) {
    const task = getTaskById.value(taskId)
    if (!task) return null

    const updates = { status: newStatus }

    if (newStatus === TaskStatus.DONE) {
      updates.progress = 100
    }

    return updateTask(taskId, updates)
  }

  function exportTasks() {
    return JSON.stringify(tasks.value, null, 2)
  }

  function importTasks(jsonString) {
    try {
      const imported = JSON.parse(jsonString)
      if (Array.isArray(imported)) {
        tasks.value = imported
        saveToStorage(tasks.value)
        return true
      }
    } catch (error) {
      console.error('Failed to import tasks:', error)
    }
    return false
  }

  function clearAllTasks() {
    tasks.value = []
    saveToStorage(tasks.value)
    selectedTaskId.value = null
  }

  function updateParentTaskTime(parentId) {
    const parent = tasks.value.find(t => t.id === parentId)
    if (!parent) return

    const children = tasks.value.filter(t => t.parentId === parentId)
    if (children.length === 0) return

    const startDates = children.map(c => new Date(c.startDate).getTime()).filter(d => !isNaN(d))
    const endDates = children.map(c => new Date(c.endDate).getTime()).filter(d => !isNaN(d))

    if (startDates.length > 0 && endDates.length > 0) {
      const minStart = new Date(Math.min(...startDates))
      const maxEnd = new Date(Math.max(...endDates))

      const formatDate = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      updateTask(parentId, {
        startDate: formatDate(minStart),
        endDate: formatDate(maxEnd)
      })
    }

    if (parent.parentId) {
      updateParentTaskTime(parent.parentId)
    }
  }

  return {
    tasks,
    loading,
    selectedTaskId,
    allTasks,
    todoTasks,
    inProgressTasks,
    doneTasks,
    selectedTask,
    getTaskById,
    tasksByStatus,
    initTasks,
    addTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskProgress,
    selectTask,
    clearSelection,
    reorderTasks,
    moveTask,
    exportTasks,
    importTasks,
    clearAllTasks,
    updateParentTaskTime
  }
})
