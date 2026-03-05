import { createTask, TaskStatus } from '@/types/task.js'

export function generateSampleTasks() {
  const today = new Date()
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const addDays = (date, days) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  const tasks = []

  const projectTask = createTask({
    title: '测试xxxx项目建设任务',
    description: '测试xxxx建设项目，总面积5000亩',
    status: TaskStatus.IN_PROGRESS,
    priority: 'high',
    startDate: formatDate(addDays(today, -30)),
    endDate: formatDate(addDays(today, 90)),
    progress: 35,
    leader: '王局长',
    department: '农业农村局',
    parentId: null,
    dependencies: []
  })
  tasks.push(projectTask)

  const phase1 = createTask({
    title: '前期准备阶段',
    description: '项目规划设计与前期手续办理',
    status: TaskStatus.DONE,
    priority: 'high',
    startDate: formatDate(addDays(today, -30)),
    endDate: formatDate(addDays(today, -15)),
    progress: 100,
    leader: '李科长',
    department: '规划科',
    parentId: projectTask.id,
    dependencies: []
  })
  tasks.push(phase1)

  const task1_1 = createTask({
    title: '项目立项审批',
    description: '完成项目立项申请与审批',
    status: TaskStatus.DONE,
    priority: 'high',
    startDate: formatDate(addDays(today, -30)),
    endDate: formatDate(addDays(today, -22)),
    progress: 100,
    leader: '张主任',
    department: '规划科',
    parentId: phase1.id,
    dependencies: []
  })
  tasks.push(task1_1)

  const task1_2 = createTask({
    title: '现场勘测设计',
    description: '现场地形测量与方案设计',
    status: TaskStatus.DONE,
    priority: 'high',
    startDate: formatDate(addDays(today, -22)),
    endDate: formatDate(addDays(today, -15)),
    progress: 100,
    leader: '刘工程师',
    department: '设计院',
    parentId: phase1.id,
    dependencies: [task1_1.id]
  })
  tasks.push(task1_2)

  const phase2 = createTask({
    title: '土地平整工程',
    description: '田块整理与土壤改良',
    status: TaskStatus.IN_PROGRESS,
    priority: 'high',
    startDate: formatDate(addDays(today, -15)),
    endDate: formatDate(addDays(today, 30)),
    progress: 50,
    leader: '赵队长',
    department: '施工一队',
    parentId: projectTask.id,
    dependencies: [phase1.id]
  })
  tasks.push(phase2)

  const task2_1 = createTask({
    title: '田块整理',
    description: '小田并大田，田埂修筑',
    status: TaskStatus.IN_PROGRESS,
    priority: 'high',
    startDate: formatDate(addDays(today, -15)),
    endDate: formatDate(addDays(today, 10)),
    progress: 70,
    leader: '孙工',
    department: '施工一队',
    parentId: phase2.id,
    dependencies: [task1_2.id]
  })
  tasks.push(task2_1)

  const task2_1_1 = createTask({
    title: '田埂修筑',
    description: '修筑田埂3000米',
    status: TaskStatus.DONE,
    priority: 'medium',
    startDate: formatDate(addDays(today, -15)),
    endDate: formatDate(addDays(today, -5)),
    progress: 100,
    leader: '周师傅',
    department: '施工一队',
    parentId: task2_1.id,
    dependencies: []
  })
  tasks.push(task2_1_1)

  const task2_1_2 = createTask({
    title: '土地深翻',
    description: '深翻土地2000亩',
    status: TaskStatus.IN_PROGRESS,
    priority: 'medium',
    startDate: formatDate(addDays(today, -5)),
    endDate: formatDate(addDays(today, 10)),
    progress: 60,
    leader: '吴师傅',
    department: '施工一队',
    parentId: task2_1.id,
    dependencies: [task2_1_1.id]
  })
  tasks.push(task2_1_2)

  const task2_2 = createTask({
    title: '土壤改良',
    description: '增施有机肥，改良土壤结构',
    status: TaskStatus.TODO,
    priority: 'medium',
    startDate: formatDate(addDays(today, 10)),
    endDate: formatDate(addDays(today, 30)),
    progress: 0,
    leader: '钱农艺师',
    department: '农技站',
    parentId: phase2.id,
    dependencies: [task2_1.id]
  })
  tasks.push(task2_2)

  const phase3 = createTask({
    title: '灌溉与排水工程',
    description: '灌溉渠道与排水沟建设',
    status: TaskStatus.IN_PROGRESS,
    priority: 'high',
    startDate: formatDate(addDays(today, -10)),
    endDate: formatDate(addDays(today, 60)),
    progress: 25,
    leader: '陈队长',
    department: '施工二队',
    parentId: projectTask.id,
    dependencies: [phase1.id]
  })
  tasks.push(phase3)

  const task3_1 = createTask({
    title: '灌溉渠道建设',
    description: '修建灌溉渠道8000米',
    status: TaskStatus.IN_PROGRESS,
    priority: 'high',
    startDate: formatDate(addDays(today, -10)),
    endDate: formatDate(addDays(today, 40)),
    progress: 40,
    leader: '郑工',
    department: '施工二队',
    parentId: phase3.id,
    dependencies: [task1_2.id]
  })
  tasks.push(task3_1)

  const task3_1_1 = createTask({
    title: '主干渠建设',
    description: '修建主干渠3000米',
    status: TaskStatus.IN_PROGRESS,
    priority: 'high',
    startDate: formatDate(addDays(today, -10)),
    endDate: formatDate(addDays(today, 15)),
    progress: 60,
    leader: '马师傅',
    department: '施工二队',
    parentId: task3_1.id,
    dependencies: []
  })
  tasks.push(task3_1_1)

  const task3_1_2 = createTask({
    title: '支渠建设',
    description: '修建支渠5000米',
    status: TaskStatus.TODO,
    priority: 'medium',
    startDate: formatDate(addDays(today, 15)),
    endDate: formatDate(addDays(today, 40)),
    progress: 0,
    leader: '黄师傅',
    department: '施工二队',
    parentId: task3_1.id,
    dependencies: [task3_1_1.id]
  })
  tasks.push(task3_1_2)

  const task3_2 = createTask({
    title: '排水沟建设',
    description: '修建排水沟6000米',
    status: TaskStatus.TODO,
    priority: 'medium',
    startDate: formatDate(addDays(today, 40)),
    endDate: formatDate(addDays(today, 60)),
    progress: 0,
    leader: '林工',
    department: '施工二队',
    parentId: phase3.id,
    dependencies: [task3_1.id]
  })
  tasks.push(task3_2)

  const phase4 = createTask({
    title: '竣工验收阶段',
    description: '工程验收与资料归档',
    status: TaskStatus.TODO,
    priority: 'medium',
    startDate: formatDate(addDays(today, 60)),
    endDate: formatDate(addDays(today, 90)),
    progress: 0,
    leader: '王局长',
    department: '农业农村局',
    parentId: projectTask.id,
    dependencies: [phase2.id, phase3.id]
  })
  tasks.push(phase4)

  const task4_1 = createTask({
    title: '工程验收',
    description: '组织工程验收',
    status: TaskStatus.TODO,
    priority: 'high',
    startDate: formatDate(addDays(today, 60)),
    endDate: formatDate(addDays(today, 75)),
    progress: 0,
    leader: '李科长',
    department: '规划科',
    parentId: phase4.id,
    dependencies: [task2_2.id, task3_2.id]
  })
  tasks.push(task4_1)

  const task4_2 = createTask({
    title: '资料归档',
    description: '项目资料整理归档',
    status: TaskStatus.TODO,
    priority: 'medium',
    startDate: formatDate(addDays(today, 75)),
    endDate: formatDate(addDays(today, 90)),
    progress: 0,
    leader: '张主任',
    department: '办公室',
    parentId: phase4.id,
    dependencies: [task4_1.id]
  })
  tasks.push(task4_2)

  return tasks
}
