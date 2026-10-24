import { useEffect, useState } from 'react'
import { type ListInfoItem } from '@/store/songlist/state'

/**
 * 车机：在线歌单详情作为"当前 tab 内的子页面"打开，
 * 不再 push 新屏幕，左侧导航栏保持可见
 */
type Listener = (info: ListInfoItem | null) => void

let currentInfo: ListInfoItem | null = null
const listeners = new Set<Listener>()

const emit = () => {
  for (const listener of listeners) listener(currentInfo)
}

export const getCarSonglistDetail = () => currentInfo

export const setCarSonglistDetail = (info: ListInfoItem | null) => {
  currentInfo = info
  emit()
}

export const useCarSonglistDetail = (): ListInfoItem | null => {
  const [info, setInfo] = useState<ListInfoItem | null>(currentInfo)
  useEffect(() => {
    listeners.add(setInfo)
    setInfo(currentInfo)
    return () => {
      listeners.delete(setInfo)
    }
  }, [])
  return info
}
