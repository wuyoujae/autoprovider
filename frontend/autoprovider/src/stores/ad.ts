import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type AdCloseReason = 'manual' | 'mask' | 'auto'

export interface AdConfig {
  src: string
  title?: string
  width?: string
  height?: string
  closable?: boolean
  maskClosable?: boolean
  allowFullscreen?: boolean
  disableScroll?: boolean
  zIndex?: number
  onClose?: (reason?: AdCloseReason) => void
}

type AdOpenPayload = AdConfig

const defaultConfig: Required<Omit<AdConfig, 'src' | 'onClose'>> = {
  title: '',
  width: 'calc(100vw - 48px)', // 留出少量边距
  height: 'calc(100vh - 48px)',
  closable: true,
  maskClosable: true,
  allowFullscreen: true,
  disableScroll: true,
  zIndex: 9998,
}

const createInitialConfig = (): AdConfig => ({
  ...defaultConfig,
  src: '',
})

export const useAdStore = defineStore('ad', () => {
  const visible = ref(false)
  const adConfig = ref<AdConfig>(createInitialConfig())

  const open = (payload: AdOpenPayload) => {
    if (!payload?.src) return
    adConfig.value = {
      ...defaultConfig,
      ...payload,
    }
    visible.value = true
  }

  const close = (reason: AdCloseReason = 'manual') => {
    if (!visible.value) return
    const cb = adConfig.value.onClose
    visible.value = false
    adConfig.value = createInitialConfig()
    cb?.(reason)
  }

  const update = (payload: Partial<AdConfig>) => {
    adConfig.value = {
      ...adConfig.value,
      ...payload,
    }
  }

  const isActive = computed(() => visible.value && !!adConfig.value.src)

  return {
    visible,
    adConfig,
    isActive,
    open,
    close,
    update,
  }
})

export const useAd = () => {
  const store = useAdStore()
  return {
    show: store.open,
    hide: store.close,
    update: store.update,
  }
}

