import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { clearListDetail, getListDetail, getOnlineListSnapshot, saveOnlineListSnapshot, setListDetail, setListDetailInfo } from '@/core/songlist'
import songlistState from '@/store/songlist/state'
import { handlePlay } from './listAction'
import Header, { type HeaderType } from './Header'
import { useListInfo } from './state'

export interface MusicListProps {
  componentId: string
  /** 车机内嵌详情：隐藏列表头部的封面与按钮（由固定头部渲染） */
  hideHeaderPic?: boolean
  hideActionBar?: boolean
  /** 完全不渲染列表头部（简介也不需要） */
  hideHeader?: boolean
  /** hideHeader 时放在列表顶部、随内容一起滚动的内容（例如歌单简介） */
  listHeaderComponent?: OnlineListProps['ListHeaderComponent']
}

export interface MusicListType {
  loadList: (source: LX.OnlineSource, listId: string) => void
}

export default forwardRef<MusicListType, MusicListProps>(({ componentId, hideHeaderPic = false, hideActionBar = false, hideHeader = false, listHeaderComponent }, ref) => {
  const listRef = useRef<OnlineListType>(null)
  const headerRef = useRef<HeaderType>(null)
  const isUnmountedRef = useRef(false)
  const info = useListInfo()

  useImperativeHandle(ref, () => ({
    async loadList(source, id) {
      clearListDetail()
      const listDetailInfo = songlistState.listDetailInfo
      const setHeaderInfo = () => {
        headerRef.current?.setInfo({
          name: (info.name || listDetailInfo.info.name) ?? '',
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          desc: listDetailInfo.info.desc || info.desc || '',
          playCount: (info.play_count ?? listDetailInfo.info.play_count) ?? '',
          imgUrl: info.img ?? listDetailInfo.info.img,
        })
      }
      listRef.current?.setList([])
      if (listDetailInfo.id == id && listDetailInfo.source == source && listDetailInfo.list.length) {
        requestAnimationFrame(() => {
          listRef.current?.setList(listDetailInfo.list)
          setHeaderInfo()
        })
        return
      }

      // 本地优先：先用上次拷贝到本地的数据渲染首屏，再后台静默拉在线数据刷新并回写本地
      const snapshot = await getOnlineListSnapshot(source, id).catch(() => null)
      setListDetailInfo(info.source, info.id)
      setHeaderInfo()
      if (snapshot?.list.length) {
        requestAnimationFrame(() => {
          if (isUnmountedRef.current) return
          listRef.current?.setList(snapshot.list)
          listRef.current?.setStatus(snapshot.maxPage <= 1 ? 'end' : 'idle')
        })
      } else {
        listRef.current?.setStatus('loading')
      }

      const page = 1
      return getListDetail(id, source, page).then((listDetail) => {
        const result = setListDetail(listDetail, id, page)
        if (isUnmountedRef.current) return
        void saveOnlineListSnapshot(source, id, result.list, songlistState.listDetailInfo.maxPage)
        requestAnimationFrame(() => {
          setHeaderInfo()
          listRef.current?.setList(result.list)
          listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
        })
      }).catch(() => {
        if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
        listRef.current?.setStatus('error')
      })
    },
  }))

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])


  const handlePlayList: OnlineListProps['onPlayList'] = (index) => {
    const listDetailInfo = songlistState.listDetailInfo
    // console.log(songlistState.listDetailInfo)
    void handlePlay(listDetailInfo.id, listDetailInfo.source, listDetailInfo.list, index)
  }
  const handleRefresh: OnlineListProps['onRefresh'] = () => {
    const page = 1
    listRef.current?.setStatus('refreshing')
    getListDetail(songlistState.listDetailInfo.id, songlistState.listDetailInfo.source, page, true).then((listDetail) => {
      const result = setListDetail(listDetail, songlistState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      void saveOnlineListSnapshot(songlistState.listDetailInfo.source, songlistState.listDetailInfo.id, result.list, songlistState.listDetailInfo.maxPage)
      listRef.current?.setList(result.list)
      listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
      listRef.current?.setStatus('error')
    })
  }
  const handleLoadMore: OnlineListProps['onLoadMore'] = () => {
    listRef.current?.setStatus('loading')
    const page = songlistState.listDetailInfo.list.length ? songlistState.listDetailInfo.page + 1 : 1
    getListDetail(songlistState.listDetailInfo.id, songlistState.listDetailInfo.source, page).then((listDetail) => {
      const result = setListDetail(listDetail, songlistState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      listRef.current?.setList(result.list, true)
      listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
      listRef.current?.setStatus('error')
    })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const header = useMemo(() => <Header ref={headerRef} componentId={componentId} hidePic={hideHeaderPic} hideActionBar={hideActionBar} />, [])

  return <OnlineList
    ref={listRef}
    onPlayList={handlePlayList}
    onRefresh={handleRefresh}
    onLoadMore={handleLoadMore}
    ListHeaderComponent={hideHeader ? (listHeaderComponent ?? null) : header}
    // progressViewOffset={}
   />
})
