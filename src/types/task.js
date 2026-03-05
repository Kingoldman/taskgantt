/**
 * @typedef {Object} Task
 * @property {string} id - 任务唯一标识
 * @property {string} title - 任务标题
 * @property {string} description - 任务描述
 * @property {'todo' | 'inprogress' | 'done'} status - 任务状态
 * @property {'high' | 'medium' | 'low'} priority - 任务优先级
 * @property {string} startDate - 开始日期 (YYYY-MM-DD)
 * @property {string} endDate - 结束日期 (YYYY-MM-DD)
 * @property {number} progress - 进度百分比 (0-100)
 * @property {string | null} parentId - 父任务ID，顶级任务为null
 * @property {string[]} dependencies - 依赖任务ID列表（前置任务）
 * @property {string} leader - 牵头领导
 * @property {string} department - 牵头单位（科室）
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */

/**
 * 任务状态枚举
 */
export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'inprogress',
  DONE: 'done'
}

/**
 * 任务优先级枚举
 */
export const TaskPriority = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

/**
 * 任务状态标签映射
 */
export const StatusLabels = {
  [TaskStatus.TODO]: '待办',
  [TaskStatus.IN_PROGRESS]: '进行中',
  [TaskStatus.DONE]: '已完成'
}

/**
 * 任务优先级标签映射
 */
export const PriorityLabels = {
  [TaskPriority.HIGH]: '高',
  [TaskPriority.MEDIUM]: '中',
  [TaskPriority.LOW]: '低'
}

/**
 * 创建新任务
 * @param {Partial<Task>} data - 任务数据
 * @returns {Task}
 */
export function createTask(data = {}) {
  const now = new Date().toISOString()
  const id = generateId()

  return {
    id,
    title: data.title || '新建任务',
    description: data.description || '',
    status: data.status || TaskStatus.TODO,
    priority: data.priority || TaskPriority.MEDIUM,
    startDate: data.startDate || formatDate(new Date()),
    endDate: data.endDate || formatDate(addDays(new Date(), 7)),
    progress: data.progress ?? 0,
    parentId: data.parentId || null,
    dependencies: data.dependencies || [],
    leader: data.leader || '',
    department: data.department || '',
    createdAt: now,
    updatedAt: now,
    ...data
  }
}

/**
 * 生成唯一ID
 * @returns {string}
 */
function generateId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 添加天数
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
