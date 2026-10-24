import { createContext, useContext } from 'react'

/**
 * 当前界面是否在背景图片之上显示内容
 *
 * 背景图的亮度是随机的，无法保证与主题色一致，
 * 文字落在这种背景上时对比度可能极差（亮底 + 亮字几乎看不见）。
 * 由 PageContent / CarBg 提供，Text、Icon 等通过它决定要不要自动加文字阴影兜底。
 */
export const BgImageContext = createContext(false)

export const useBgImageActive = () => useContext(BgImageContext)
