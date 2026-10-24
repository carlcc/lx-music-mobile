import { createContext, useContext } from 'react'

/**
 * 列表行内动作的显示配置
 *
 * 用 context 而不是逐层传 prop：行组件嵌在 FlatList 的单元格里，
 * 中间要穿过 OnlineList / List / ListItem 好几层，任何一层漏传都会失效。
 * context 可以穿透任意层级，不会被中间组件吞掉。
 */
export interface RowActionsConfig {
  /** 是否显示「加入歌单」按钮 */
  showAdd?: boolean
}

const DEFAULT_CONFIG: RowActionsConfig = {}

export const RowActionsContext = createContext<RowActionsConfig>(DEFAULT_CONFIG)

/** 行内是否显示「加入歌单」按钮，默认显示 */
export const useShowAddToPlaylist = (): boolean => {
  return useContext(RowActionsContext).showAdd ?? true
}
