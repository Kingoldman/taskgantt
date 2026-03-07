import { computed, ref, watch } from 'vue'

/**
 * 任务树相关逻辑 Composable
 * @param {Object} props - 组件 props
 * @param {Ref<string|null>} selectedParentId - 当前选择的父任务ID（响应式）
 * @returns {Object} 任务树相关方法和数据
 */
export function useTaskTree(props, selectedParentId = null) {
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

  // 获取同级子任务列表（用于插入位置选择）
  // 优先使用 selectedParentId（用户在表单中选择的），否则使用 props.task?.parentId
  const siblingTasks = computed(() => {
    // 编辑模式不显示插入位置
    const currentId = props.task?.id
    if (currentId) return []

    // 获取父任务ID：优先使用用户选择的，否则使用 props 中的
    const parentId = selectedParentId?.value !== undefined
      ? selectedParentId.value
      : props.task?.parentId

    const siblings = props.allTasks
      .filter(t => t.parentId === parentId && t.id !== currentId)
      .sort(sortByCreatedAt)

    return siblings.map((task, index) => ({
      id: task.id,
      title: task.title,
      displayIndex: index + 1
    }))
  })

  // 插入位置选项
  const insertPositionOptions = computed(() => {
    // 编辑模式不显示
    if (props.task?.id) return []

    const siblings = siblingTasks.value
    if (siblings.length === 0) return []

    const options = [
      { value: 0, label: '插入到最前面' }
    ]

    siblings.forEach((task, index) => {
      options.push({
        value: index + 1,
        label: `插入到 "${task.title}" 之后`
      })
    })

    return options
  })

  return {
    availableParentTasks,
    availableDependencyTasks,
    hasChildren,
    siblingTasks,
    insertPositionOptions
  }
}
