import { defineStore } from 'pinia'
import { ref } from 'vue'

export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'default'

export interface AlertMessage {
  id: string
  type: MessageType
  title?: string
  description: string
  duration?: number
}

export interface DialogMessage {
  id: string
  type: MessageType
  title: string
  description: string
  showCancel?: boolean
  cancelText?: string
  confirmText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export const useMessageStore = defineStore('message', () => {
  const alerts = ref<AlertMessage[]>([])
  const dialogs = ref<DialogMessage[]>([])

  // 添加 Alert 消息
  const addAlert = (message: Omit<AlertMessage, 'id'>) => {
    const id = `alert-${Date.now()}-${Math.random()}`
    const duration = message.duration ?? 3000
    const newMessage: AlertMessage = {
      id,
      ...message,
      duration,
    }

    alerts.value.push(newMessage)

    // 自动移除
    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id)
      }, duration)
    }

    return id
  }

  // 移除 Alert 消息
  const removeAlert = (id: string) => {
    const index = alerts.value.findIndex(msg => msg.id === id)
    if (index > -1) {
      alerts.value.splice(index, 1)
    }
  }

  // 添加 Dialog 消息
  const addDialog = (message: Omit<DialogMessage, 'id'>) => {
    const id = `dialog-${Date.now()}-${Math.random()}`
    const newMessage: DialogMessage = {
      id,
      showCancel: true,
      ...message,
    }

    dialogs.value.push(newMessage)
    return id
  }

  // 移除 Dialog 消息
  const removeDialog = (id: string) => {
    const index = dialogs.value.findIndex(msg => msg.id === id)
    if (index > -1) {
      dialogs.value.splice(index, 1)
    }
  }

  // 处理 Dialog 操作
  const handleDialogAction = (id: string, confirmed: boolean) => {
    const dialog = dialogs.value.find(msg => msg.id === id)
    if (dialog) {
      if (confirmed && dialog.onConfirm) {
        dialog.onConfirm()
      } else if (!confirmed && dialog.onCancel) {
        dialog.onCancel()
      }
      removeDialog(id)
    }
  }

  // 清空所有消息
  const clearAll = () => {
    alerts.value = []
    dialogs.value = []
  }

  return {
    alerts,
    dialogs,
    addAlert,
    removeAlert,
    addDialog,
    removeDialog,
    handleDialogAction,
    clearAll,
  }
})

// 便捷方法 - 导出全局使用的消息 API
export const useMessage = () => {
  const store = useMessageStore()

  return {
    // Alert 消息
    info: (description: string, title?: string, duration?: number) => {
      return store.addAlert({ type: 'info', description, title, duration })
    },
    success: (description: string, title?: string, duration?: number) => {
      return store.addAlert({ type: 'success', description, title, duration })
    },
    warning: (description: string, title?: string, duration?: number) => {
      return store.addAlert({ type: 'warning', description, title, duration })
    },
    error: (description: string, title?: string, duration?: number) => {
      return store.addAlert({ type: 'error', description, title, duration })
    },

    // Dialog 消息
    confirm: (options: {
      title: string
      description: string
      type?: MessageType
      cancelText?: string
      confirmText?: string
      onConfirm?: () => void
      onCancel?: () => void
    }) => {
      return store.addDialog({
        type: options.type || 'info',
        title: options.title,
        description: options.description,
        showCancel: true,
        cancelText: options.cancelText,
        confirmText: options.confirmText,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      })
    },

    alert: (options: {
      title: string
      description: string
      type?: MessageType
      confirmText?: string
      onConfirm?: () => void
    }) => {
      return store.addDialog({
        type: options.type || 'info',
        title: options.title,
        description: options.description,
        showCancel: false,
        confirmText: options.confirmText,
        onConfirm: options.onConfirm,
      })
    },
  }
}

