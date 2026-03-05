import { computed } from 'vue'

export function useTaskNumbering(props) {
  // 计算任务编号
  const taskNumbers = computed(() => {
    const taskMap = new Map()
    const rootTasks = []

    // 创建任务映射
    props.tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [], level: 0 })
    })

    // 构建层级结构
    props.tasks.forEach(task => {
      const taskNode = taskMap.get(task.id)
      if (task.parentId && taskMap.has(task.parentId)) {
        const parent = taskMap.get(task.parentId)
        taskNode.level = parent.level + 1
        parent.children.push(taskNode)
      } else {
        rootTasks.push(taskNode)
      }
    })

    // 对子任务按创建时间排序
    const sortByCreatedAt = (a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt)
      }
      return 0
    }

    function sortChildren(tasks) {
      tasks.sort(sortByCreatedAt)
      tasks.forEach(task => {
        if (task.children.length > 0) {
          sortChildren(task.children)
        }
      })
    }
    sortChildren(rootTasks)

    // 生成编号
    const numbers = {}
    function generateNumbers(tasks, parentNumber = '', isRootLevel = true) {
      tasks.forEach((task, index) => {
        let currentNumber = ''
        if (isRootLevel) {
          currentNumber = ''
        } else {
          currentNumber = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`
        }
        numbers[task.id] = currentNumber
        if (task.children.length > 0) {
          generateNumbers(task.children, currentNumber, false)
        }
      })
    }
    generateNumbers(rootTasks)

    return numbers
  })

  // 获取任务的显示编号
  function getTaskNumber(task) {
    return taskNumbers.value[task.id] || ''
  }

  return {
    taskNumbers,
    getTaskNumber
  }
}
