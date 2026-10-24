import { useRef, forwardRef, useImperativeHandle } from 'react'
import { type ListInfoItem } from '@/store/songlist/state'
// import LoadingMask, { LoadingMaskType } from '@/components/common/LoadingMask'
import List, { type ListProps, type ListType, type Status } from './List'
import { navigations } from '@/navigation'
import { useHorizontalMode } from '@/utils/hooks'
import { setCarSonglistDetail } from '@/components/car/carDetailState'
import commonState from '@/store/common/state'

export interface SonglistProps {
  onRefresh: ListProps['onRefresh']
  onLoadMore: ListProps['onLoadMore']
}
export interface SonglistType {
  setList: (list: ListInfoItem[], showSource?: boolean) => void
  setStatus: (val: Status) => void
}

export default forwardRef<SonglistType, SonglistProps>(({
  onRefresh,
  onLoadMore,
}, ref) => {
  const listRef = useRef<ListType>(null)
  // const loadingMaskRef = useRef<LoadingMaskType>(null)

  useImperativeHandle(ref, () => ({
    setList(list, showSource) {
      listRef.current?.setList(list, showSource)
    },
    setStatus(val) {
      listRef.current?.setStatus(val)
    },
  }))

  const handleOpenDetail = (item: ListInfoItem, index: number) => {
    // 车机横屏：歌单详情在"歌单 tab"内打开，左侧导航保持可见
    if (isHorizontalMode) {
      setCarSonglistDetail(item)
      return
    }
    navigations.pushSonglistDetailScreen(commonState.componentIds.home!, item)
  }
  const isHorizontalMode = useHorizontalMode()

  return (
    <List
      ref={listRef}
      onRefresh={onRefresh}
      onLoadMore={onLoadMore}
      onOpenDetail={handleOpenDetail}
    />
  )
})
