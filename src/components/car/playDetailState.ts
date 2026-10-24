import { useEffect, useState } from 'react'

/**
 * 车机：播放页改为 Home 内部的常驻浮层，不再 push 新屏幕
 * 首次打开时挂载一次，之后只是显示/隐藏，内容不会重建（也不会再出现滑入过程中的白屏）
 */
type Listener = (visible: boolean) => void

let visible = false
const listeners = new Set<Listener>()

const emit = () => {
  for (const listener of listeners) listener(visible)
}

export const getPlayDetailVisible = () => visible

export const setPlayDetailVisible = (isVisible: boolean) => {
  visible = isVisible
  emit()
}

export const usePlayDetailVisible = (): boolean => {
  const [state, setState] = useState(visible)
  useEffect(() => {
    listeners.add(setState)
    setState(visible)
    return () => {
      listeners.delete(setState)
    }
  }, [])
  return state
}
