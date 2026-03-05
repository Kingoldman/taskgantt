import { computed } from 'vue'

export function useTaskTree(props) {
  // 按创建时间排序
  function sortByCreatedAt(a, b) {
    if (a.createdAt && b.createdAt) {
      return new Date(a.createdAt) - new Date(b.createdAt)
    }
    return 0
  }

  // 构建树形数据结构
  function buildTaskTreeData(tasks, parentId = null) {
    const children = tasks.filter(t => t.parentId === parentId)
    children.sort(sortByCreatedAt)

    return children.map(task => ({
      value: task.id,
      label: task.title,
      children: buildTaskTreeData(tasks, task.id)
    }))
  }

  // 可选的父任务树形数据（排除自己和自己的子孙任务）
  const availableParentTasks = computed(() => {
    const currentId = props.task?.id

    // 找出所有子孙任务ID
    const descendantIds = new Set()
    if (currentId) {
      const findDescendants = (id) => {
        props.allTasks.forEach(t => {
          if (t.parentId === id) {
            descendantIds.add(t.id)
            findDescendants(t.id)
          }
        })
      }
      findDescendants(currentId)
    }

    // 过滤掉自己和子孙任务
    const filteredTasks = props.allTasks.filter(t => {
      if (t.id === currentId) return false
      if (descendantIds.has(t.id)) return false
      return true
    })

    return buildTaskTreeData(filteredTasks)
  })

  // 可选的依赖任务树形数据（排除自己）
  const availableDependencyTasks = computed(() => {
    const currentId = props.task?.id
    const filteredTasks = props.allTasks.filter(t => t.id !== currentId)
    return buildTaskTreeData(filteredTasks)
  })

  // 检查当前任务是否有子任务
  const hasChildren = computed(() => {
    if (!props.task?.id) return false
    return props.allTasks.some(t => t.parentId === props.task.id)
  })

  return {
    availableParentTasks,
    availableDependencyTasks,
    hasChildren
  }
}
