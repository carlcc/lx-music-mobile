import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { InitState as SearchState } from '@/store/search/state'
import type { Source as MusicSource } from '@/store/search/music/state'
import type { Source as SongListSource } from '@/store/search/songlist/state'
import MusicList, { type MusicListType } from './MusicList'
import BlankView, { type BlankViewType } from './BlankView'
import SonglistList from './SonglistList'
import searchState from '@/store/search/state'
import { useHorizontalMode } from '@/utils/hooks'

interface ListProps {
  onSearch: (keyword: string) => void
}
export interface ListType {
  loadList: (text: string, source: MusicSource | SongListSource, type: SearchState['searchType']) => void
}

export default forwardRef<ListType, ListProps>(({ onSearch }, ref) => {
  const [listType, setListType] = useState<SearchState['searchType']>('music')
  // 界面重建（切换导航 tab）时如果有上次的搜索词，直接进结果页，避免先闪一下空白页
  const [showBlankView, setShowListView] = useState(!searchState.searchText)
  const isHorizontal = useHorizontalMode()
  const listRef = useRef<MusicListType>(null)
  const blankViewRef = useRef<BlankViewType>(null)

  useImperativeHandle(ref, () => ({
    loadList(text, source, type) {
      if (text) {
        setShowListView(false)
        setListType(type)
        // const listDetailInfo = searchMusicState.listDetailInfo
        requestAnimationFrame(() => {
          listRef.current?.loadList(text, source)
        })
      } else {
        setShowListView(true)
        requestAnimationFrame(() => {
          blankViewRef.current?.show(source)
        })
      }
    },
  }), [])

  return (
    showBlankView
      // 车机横屏：历史搜索 / 热门搜索统一放在搜索框下方的浮层里（见 CarSearchHeader），这里不再重复显示
      ? (isHorizontal ? null : <BlankView ref={blankViewRef} onSearch={onSearch} />)
      : listType == 'songlist'
        ? <SonglistList ref={listRef} />
        : <MusicList ref={listRef} />
  )
})
