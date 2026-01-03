import { useMessageStore, type MessageType } from "@/stores/message";

interface MessageOptions {
  title?: string;
  onClose?: () => void;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  description: string;
  type?: MessageType;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const message = {
  // 请求成功消息
  requestSuccess: (content: string, options?: MessageOptions) => {
    const message_store = useMessageStore();
    message_store.addAlert({
      type: "success",
      title: options?.title || "成功",
      description: content,
      duration: options?.duration || 3000,
    });
    if (options?.onClose) {
      setTimeout(options.onClose, options.duration || 3000);
    }
  },

  // 请求错误消息
  requestError: (content: string, options?: MessageOptions) => {
    const message_store = useMessageStore();
    message_store.addAlert({
      type: "error",
      title: options?.title || "错误",
      description: content,
      duration: options?.duration || 3000,
    });
    if (options?.onClose) {
      setTimeout(options.onClose, options.duration || 3000);
    }
  },

  // 警告消息
  warning: (content: string, options?: MessageOptions) => {
    const message_store = useMessageStore();
    message_store.addAlert({
      type: "warning",
      title: options?.title || "警告",
      description: content,
      duration: options?.duration || 3000,
    });
    if (options?.onClose) {
      setTimeout(options.onClose, options.duration || 3000);
    }
  },

  // 权限不足消息
  forbidden: (content: string, options?: MessageOptions) => {
    const message_store = useMessageStore();
    message_store.addAlert({
      type: "error",
      title: options?.title || "权限不足",
      description: content,
      duration: options?.duration || 3000,
    });
    if (options?.onClose) {
      setTimeout(options.onClose, options.duration || 3000);
    }
  },

  // 服务器错误消息
  serverError: (content: string, options?: MessageOptions) => {
    const message_store = useMessageStore();
    message_store.addAlert({
      type: "error",
      title: options?.title || "服务器错误",
      description: content,
      duration: options?.duration || 3000,
    });
    if (options?.onClose) {
      setTimeout(options.onClose, options.duration || 3000);
    }
  },

  // 网络错误消息
  networkError: (content: string, options?: MessageOptions) => {
    const message_store = useMessageStore();
    message_store.addAlert({
      type: "error",
      title: options?.title || "网络错误",
      description: content,
      duration: options?.duration || 3000,
    });
    if (options?.onClose) {
      setTimeout(options.onClose, options.duration || 3000);
    }
  },

  // 信息消息
  info: (content: string, options?: MessageOptions) => {
    const message_store = useMessageStore();
    message_store.addAlert({
      type: "info",
      title: options?.title || "提示",
      description: content,
      duration: options?.duration || 3000,
    });
    if (options?.onClose) {
      setTimeout(options.onClose, options.duration || 3000);
    }
  },

  // 成功消息
  success: (content: string, options?: MessageOptions) => {
    const message_store = useMessageStore();
    message_store.addAlert({
      type: "success",
      title: options?.title || "成功",
      description: content,
      duration: options?.duration || 3000,
    });
    if (options?.onClose) {
      setTimeout(options.onClose, options.duration || 3000);
    }
  },

  // 错误消息
  error: (content: string, options?: MessageOptions) => {
    const message_store = useMessageStore();
    message_store.addAlert({
      type: "error",
      title: options?.title || "错误",
      description: content,
      duration: options?.duration || 3000,
    });
    if (options?.onClose) {
      setTimeout(options.onClose, options.duration || 3000);
    }
  },

  // 确认对话框
  confirm: (options: ConfirmOptions) => {
    const message_store = useMessageStore();
    message_store.addDialog({
      type: options.type || "warning",
      title: options.title,
      description: options.description,
      showCancel: true,
      cancelText: options.cancelText,
      confirmText: options.confirmText,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  },
};

export default message;
