import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import { search } from '@/core/search/songlist'
import Songlist, { type SonglistProps, type SonglistType } from '@/screens/Home/Views/SongList/components/Songlist'
import searchSonglistState, { type Source } from '@/store/search/songlist/state'

// export type MusicListProps = Pick<OnlineListProps,
// 'onLoadMore'
// | 'onPlayList'
// | 'onRefresh'
// >

export interface MusicListType {
  loadList: (text: string, source: Source) => void
}

export default forwardRef<MusicListType, {}>((props, ref) => {
  const listRef = useRef<SonglistType>(null)
  const searchInfoRef = useRef<{ text: string, source: Source }>({ text: '', source: 'kw' })
  const isUnmountedRef = useRef(false)
  useImperativeHandle(ref, () => ({
    async loadList(text, source) {
      // const listDetailInfo = searchSonglistState.listDetailInfo
      searchInfoRef.current.text = text
      searchInfoRef.current.source = source
      // 命中缓存（切 tab 回来）：直接恢复，不要再先清空列表，避免先闪一下空列表
      if (searchSonglistState.searchText == text && searchSonglistState.source == source && searchSonglistState.listInfos[searchSonglistState.source]!.list.length) {
        listRef.current?.setList(searchSonglistState.listInfos[searchSonglistState.source]!.list, source == 'all')
        return
      }
      listRef.current?.setList([], source == 'all')
      listRef.current?.setStatus('loading')
      const page = 1
      return search(text, page, source).then((list) => {
        // const result = setListInfo(listDetail, id, page)
        if (isUnmountedRef.current) return
        requestAnimationFrame(() => {
          listRef.current?.setList(list, source == 'all')
          listRef.current?.setStatus(searchSonglistState.maxPages[searchSonglistState.source] == page ? 'end' : 'idle')
        })
      }).catch(() => {
        listRef.current?.setStatus('error')
      })
    },
  }), [])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])


  const handleRefresh: SonglistProps['onRefresh'] = () => {
    const page = 1
    listRef.current?.setStatus('refreshing')
    search(searchInfoRef.current.text, page, searchInfoRef.current.source).then((list) => {
      // const result = setListInfo(listDetail, searchSonglistState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      listRef.current?.setList(list, searchInfoRef.current.source == 'all')
      listRef.current?.setStatus(searchSonglistState.maxPages[searchSonglistState.source] == page ? 'end' : 'idle')
    }).catch(() => {
      listRef.current?.setStatus('error')
    })
  }
  const handleLoadMore: SonglistProps['onLoadMore'] = () => {
    listRef.current?.setStatus('loading')
    const info = searchSonglistState.listInfos[searchInfoRef.current.source]!
    const page = info.list.length ? info.page + 1 : 1
    search(searchInfoRef.current.text, page, searchInfoRef.current.source).then((list) => {
      // const result = setListInfo(listDetail, searchSonglistState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      listRef.current?.setList(list, searchInfoRef.current.source == 'all')
      listRef.current?.setStatus(searchSonglistState.maxPages[searchSonglistState.source] == page ? 'end' : 'idle')
    }).catch(() => {
      listRef.current?.setStatus('error')
    })
  }

  return <Songlist
    ref={listRef}
    onRefresh={handleRefresh}
    onLoadMore={handleLoadMore}
  />
})

