import { useEffect, useState } from 'react'
import { CAR } from './constants'

/**
 * 车机搜索框的共享状态
 *
 * 搜索框搬到了全局顶栏（CarHeader）里，而搜索动作在搜索页（Search 视图）里，
 * 两边不在同一棵组件树上，所以用一个小 store 共享：
 * - 搜索词（折叠后仍然保留）
 * - 建议浮层显隐
 * - 提交搜索 / 让输入框失焦
 */

let searchText = ''
let panelVisible = false
let blurHandler: (() => void) | null = null

const textListeners = new Set<(text: string) => void>()
const panelListeners = new Set<(visible: boolean) => void>()
const submitListeners = new Set<(text: string) => void>()

const emitText = () => {
  for (const listener of textListeners) listener(searchText)
}
const emitPanel = () => {
  for (const listener of panelListeners) listener(panelVisible)
}

export const getSearchText = () => searchText

export const setSearchText = (text: string) => {
  if (searchText == text) return
  searchText = text
  emitText()
}

export const useSearchText = () => {
  const [text, setText] = useState(searchText)
  useEffect(() => {
    textListeners.add(setText)
    setText(searchText)
    return () => {
      textListeners.delete(setText)
    }
  }, [])
  return text
}

export const getSearchPanelVisible = () => panelVisible

export const setSearchPanelVisible = (visible: boolean) => {
  if (panelVisible == visible) return
  panelVisible = visible
  emitPanel()
}

export const useSearchPanelVisible = () => {
  const [visible, setVisible] = useState(panelVisible)
  useEffect(() => {
    panelListeners.add(setVisible)
    setVisible(panelVisible)
    return () => {
      panelListeners.delete(setVisible)
    }
  }, [])
  return visible
}

/** 顶栏的输入框把自己的 blur 注册进来，搜索页收起浮层时调用（否则输入框一直处于聚焦态） */
export const setSearchBlurHandler = (handler: (() => void) | null) => {
  blurHandler = handler
}

export const blurSearchInput = () => {
  blurHandler?.()
}

/** 顶栏输入框提交搜索 → 搜索页订阅后真正执行搜索 */
export const emitSearchSubmit = (text: string) => {
  for (const listener of submitListeners) listener(text)
}

export const onSearchSubmit = (callback: (text: string) => void) => {
  submitListeners.add(callback)
  return () => {
    submitListeners.delete(callback)
  }
}

/**
 * 搜索框尺寸（顶栏与建议浮层共用同一套，浮层才能对齐）
 *
 * 展开宽度**按常量算**，不做实测：标题区是固定占宽（HEADER_TITLE_WIDTH），
 * 所以剩余空间与当前 tab 无关，切换时宽度一步到位，不会分两段变化。
 */
export const getSearchBoxMetrics = (winWidth: number, btnSize: number) => {
  return {
    collapsedWidth: Math.max(200, Math.min(340, Math.round(winWidth * 0.34))),
    rightOffset: CAR.padding + btnSize + 12,
    // 搜索框展开后是 100%（撑满剩余空间），浮层在测到真实宽度前用这个估算值兜底
    // 预留按「搜索」两个字算，和展开时的实际标题一致
    fallbackExpanded: Math.max(320, winWidth - CAR.padding * 2 - Math.round(72 * (global.lx.fontSize || 1)) - 24 - btnSize),
  }
}

let boxWidth = 0
const boxWidthListeners = new Set<(width: number) => void>()

/**
 * 搜索框展开后的实测宽度（只用于建议浮层对齐）
 * 注意：它**不参与**搜索框自身的宽度计算——那个用 width: '100%' 由布局一次算准，
 * 避免测量滞后导致切换 tab 时宽度分两段变化。
 */
export const getSearchBoxWidth = () => boxWidth

export const setSearchBoxWidth = (width: number) => {
  const value = Math.round(width)
  if (boxWidth == value) return
  boxWidth = value
  for (const listener of boxWidthListeners) listener(value)
}

export const useSearchBoxWidth = () => {
  const [width, setWidth] = useState(boxWidth)
  useEffect(() => {
    boxWidthListeners.add(setWidth)
    setWidth(boxWidth)
    return () => {
      boxWidthListeners.delete(setWidth)
    }
  }, [])
  return width
}
