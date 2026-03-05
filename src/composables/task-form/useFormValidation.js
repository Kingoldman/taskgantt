import { computed } from 'vue'
import { TaskStatus } from '@/types/task.js'

export function useFormValidation(formData, isDateAfterToday) {
  // 验证规则
  const rules = {
    title: [
      { required: true, message: '请输入任务标题', trigger: 'blur' },
      { min: 1, max: 100, message: '标题长度在1-100个字符之间', trigger: 'blur' }
    ],
    startDate: [
      { required: true, message: '请选择开始日期', trigger: 'change' }
    ],
    endDate: [
      { required: true, message: '请选择结束日期', trigger: 'change' },
      {
        validator: (rule, value, callback) => {
          if (value && formData.value.startDate && value < formData.value.startDate) {
            callback(new Error('结束日期不能早于开始日期'))
            return
          }
          callback()
        },
        trigger: 'change'
      }
    ],
    status: [
      {
        validator: (rule, value, callback) => {
          const startDate = formData.value.startDate
          const endDate = formData.value.endDate

          // 无开始日期的任务只能设置为待办
          if (!startDate && value !== TaskStatus.TODO) {
            callback(new Error('未设置开始日期的任务只能设置为"待办"'))
            return
          }

          // 开始日期在今天之后的任务只能设置为待办
          if (isDateAfterToday(startDate) && value !== TaskStatus.TODO) {
            callback(new Error('开始日期在今天之后的任务只能设置为"待办"'))
            return
          }

          // 结束日期在今天之后的任务不能设置为已完成
          if (value === TaskStatus.DONE && isDateAfterToday(endDate)) {
            callback(new Error('结束日期在今天之后的任务不能设置为"已完成"'))
            return
          }

          callback()
        },
        trigger: 'change'
      }
    ],
    leader: [
      { required: true, message: '请输入牵头领导', trigger: 'blur' }
    ],
    department: [
      { required: true, message: '请输入牵头单位', trigger: 'blur' }
    ]
  }

  return {
    rules
  }
}
