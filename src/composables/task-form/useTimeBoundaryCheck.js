/**
 * 时间边界检查 Composable
 * 用于检查任务时间变化对前置任务和父任务的影响
 */
import { h } from 'vue'
import { Warning, Clock, Connection } from '@element-plus/icons-vue'

/**
 * 时间边界检查钩子函数
 * @param {Ref<Array>} allTasks - 所有任务的响应式引用
 * @returns {Object} 时间边界检查相关方法
 */
export function useTimeBoundaryCheck(allTasks) {
  /**
   * 获取任务的所有祖先任务（从直接父任务到根任务）
   * @param {string} taskId - 任务ID
   * @returns {Array} 祖先任务数组，按从近到远排序
   */
  function getAllAncestors(taskId) {
    const ancestors = []
    let currentTask = allTasks.value.find(t => t.id === taskId)
    while (currentTask?.parentId) {
      const parent = allTasks.value.find(t => t.id === currentTask.parentId)
      if (parent) {
        ancestors.push(parent)
        currentTask = parent
      } else {
        break
      }
    }
    return ancestors
  }

  /**
   * 获取任务的所有后代任务（递归获取所有层级的子任务）
   * @param {string} taskId - 任务ID
   * @returns {Array} 后代任务数组
   */
  function getAllDescendants(taskId) {
    const descendants = []
    const children = allTasks.value.filter(t => t.parentId === taskId)
    children.forEach(child => {
      descendants.push(child)
      descendants.push(...getAllDescendants(child.id))
    })
    return descendants
  }

  /**
   * 收集时间变化影响的任务
   * 核心算法：检查新时间对前置任务链和父任务链的影响
   * @param {string} newStartDate - 新的开始日期
   * @param {string} newEndDate - 新的结束日期
   * @param {string} currentTaskId - 当前任务ID
   * @param {Array} dependencies - 前置任务ID数组
   * @returns {Array} 需要调整的任务变更列表
   */
  function collectTimeChanges(newStartDate, newEndDate, currentTaskId, dependencies) {
    const changes = []
    const processedTasks = new Set()

    /**
     * 添加任务变更记录
     * 只有当新时间确实会导致变化时才添加
     */
    function addChange(taskId, updates, reason, affectedBy = null) {
      if (processedTasks.has(taskId)) return
      const task = allTasks.value.find(t => t.id === taskId)
      if (!task) return

      const actualUpdates = {}
      let hasChange = false

      // 检查开始日期是否需要提前
      if (updates.startDate !== undefined) {
        const oldStart = new Date(task.startDate).getTime()
        const newStart = new Date(updates.startDate).getTime()
        if (newStart < oldStart) {
          actualUpdates.startDate = updates.startDate
          hasChange = true
        }
      }

      // 检查结束日期是否需要延后
      if (updates.endDate !== undefined) {
        const oldEnd = new Date(task.endDate).getTime()
        const newEnd = new Date(updates.endDate).getTime()
        if (newEnd > oldEnd) {
          actualUpdates.endDate = updates.endDate
          hasChange = true
        }
      }

      // 只有真正有变化才记录
      if (hasChange) {
        changes.push({
          taskId,
          task,
          updates: actualUpdates,
          reason,
          affectedBy
        })
        processedTasks.add(taskId)
      }
    }

    // 处理开始日期变化的影响
    if (newStartDate) {
      const newStart = new Date(newStartDate).getTime()

      // 检查前置任务依赖链（递归处理）
      if (dependencies && dependencies.length > 0) {
        for (const depId of dependencies) {
          processDependencyChain(depId, newStartDate, addChange)
        }
      }

      // 检查父任务时间约束
      if (currentTaskId) {
        const ancestors = getAllAncestors(currentTaskId)
        for (const ancestor of ancestors) {
          const ancestorStart = new Date(ancestor.startDate).getTime()
          if (newStart < ancestorStart) {
            addChange(ancestor.id, { startDate: newStartDate }, '父任务时间约束', currentTaskId)
          }
        }
      }
    }

    // 处理结束日期变化的影响
    if (newEndDate) {
      const newEnd = new Date(newEndDate).getTime()

      // 检查父任务时间约束
      if (currentTaskId) {
        const ancestors = getAllAncestors(currentTaskId)
        for (const ancestor of ancestors) {
          const ancestorEnd = new Date(ancestor.endDate).getTime()
          if (newEnd > ancestorEnd) {
            addChange(ancestor.id, { endDate: newEndDate }, '父任务时间约束', currentTaskId)
          }
        }
      }
    }

    return changes
  }

  /**
   * 递归处理前置任务依赖链
   * 当后续任务开始时间早于前置任务时，需要调整前置任务及其父任务
   * @param {string} depId - 前置任务ID
   * @param {string} requiredStartDate - 要求的开始日期
   * @param {Function} addChange - 添加变更记录的函数
   */
  function processDependencyChain(depId, requiredStartDate, addChange) {
    const depTask = allTasks.value.find(t => t.id === depId)
    if (!depTask) return

    const depStart = new Date(depTask.startDate).getTime()
    const requiredStart = new Date(requiredStartDate).getTime()

    // 如果前置任务开始时间晚于要求时间，需要调整
    if (requiredStart < depStart) {
      // 记录前置任务变更
      addChange(depId, { startDate: requiredStartDate }, '前置任务依赖约束')

      // 检查前置任务的父任务是否也需要调整
      const depAncestors = getAllAncestors(depId)
      for (const ancestor of depAncestors) {
        const ancestorStart = new Date(ancestor.startDate).getTime()
        if (requiredStart < ancestorStart) {
          addChange(ancestor.id, { startDate: requiredStartDate }, '父任务时间约束', depId)
        }
      }

      // 递归处理前置任务的前置任务（连锁影响）
      if (depTask.dependencies && depTask.dependencies.length > 0) {
        for (const nextDepId of depTask.dependencies) {
          processDependencyChain(nextDepId, requiredStartDate, addChange)
        }
      }
    }
  }

  /**
   * 生成确认对话框的 VNode 内容
   * 使用 VNode 渲染，避免 XSS 安全风险
   * @param {Array} changes - 变更记录数组
   * @returns {VNode} 对话框内容的 VNode
   */
  function generateConfirmContent(changes) {
    const sections = []
    const groupedChanges = {}

    // 按变更原因分组
    for (const change of changes) {
      const key = change.reason
      if (!groupedChanges[key]) {
        groupedChanges[key] = []
      }
      groupedChanges[key].push(change)
    }

    // 生成前置任务依赖调整部分
    if (groupedChanges['前置任务依赖约束']) {
      const items = groupedChanges['前置任务依赖约束'].map(change => {
        const task = change.task
        const newStart = change.updates.startDate
        return h('div', { class: 'change-item' }, [
          h('div', { class: 'change-task-title' }, [
            h('span', { class: 'task-icon dep-icon' }, '🔗'),
            `"${task.title}"`
          ]),
          h('div', { class: 'change-detail' }, [
            h('span', { class: 'change-label' }, '开始时间'),
            h('span', { class: 'change-old' }, task.startDate),
            h('span', { class: 'change-arrow' }, '→'),
            h('span', { class: 'change-new' }, newStart)
          ])
        ])
      })
      sections.push(h('div', { class: 'change-section' }, [
        h('div', { class: 'change-section-title' }, [
          h(Connection, { class: 'section-icon' }),
          '前置任务依赖调整'
        ]),
        ...items
      ]))
    }

    // 生成父任务时间范围调整部分
    if (groupedChanges['父任务时间约束']) {
      const parentChanges = groupedChanges['父任务时间约束']
      // 合并同一父任务的多个变更
      const uniqueParents = new Map()
      for (const change of parentChanges) {
        if (!uniqueParents.has(change.taskId)) {
          uniqueParents.set(change.taskId, { ...change, updates: { ...change.updates } })
        } else {
          const existing = uniqueParents.get(change.taskId)
          if (change.updates.startDate) existing.updates.startDate = change.updates.startDate
          if (change.updates.endDate) existing.updates.endDate = change.updates.endDate
        }
      }

      const items = Array.from(uniqueParents.values()).map(change => {
        const task = change.task
        const details = []
        if (change.updates.startDate) {
          details.push(h('div', { class: 'change-detail' }, [
            h('span', { class: 'change-label' }, '开始时间'),
            h('span', { class: 'change-old' }, task.startDate),
            h('span', { class: 'change-arrow' }, '→'),
            h('span', { class: 'change-new' }, change.updates.startDate)
          ]))
        }
        if (change.updates.endDate) {
          details.push(h('div', { class: 'change-detail' }, [
            h('span', { class: 'change-label' }, '结束时间'),
            h('span', { class: 'change-old' }, task.endDate),
            h('span', { class: 'change-arrow' }, '→'),
            h('span', { class: 'change-new' }, change.updates.endDate)
          ]))
        }
        return h('div', { class: 'change-item' }, [
          h('div', { class: 'change-task-title' }, [
            h('span', { class: 'task-icon parent-icon' }, '📁'),
            `"${task.title}"`
          ]),
          ...details
        ])
      })
      sections.push(h('div', { class: 'change-section' }, [
        h('div', { class: 'change-section-title parent-title' }, [
          h(Clock, { class: 'section-icon' }),
          '父任务时间范围调整'
        ]),
        ...items
      ]))
    }

    // 返回完整的对话框内容
    return h('div', { class: 'time-change-content' }, [
      h('div', { class: 'change-header' }, [
        h(Warning, { class: 'header-icon' }),
        h('span', null, '检测到以下时间边界变化：')
      ]),
      h('div', { class: 'change-body' }, sections)
    ])
  }

  return {
    getAllAncestors,
    getAllDescendants,
    collectTimeChanges,
    generateConfirmContent
  }
}
