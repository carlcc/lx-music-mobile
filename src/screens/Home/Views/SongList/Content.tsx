import { getSongListSetting, saveSongListSetting } from '@/utils/data'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

// import List from './List/List'
import HeaderBar, { type HeaderBarProps, type HeaderBarType } from './HeaderBar'
import songlistState, { type InitState, type SortInfo, type Source } from '@/store/songlist/state'
import List, { type ListType } from './List'
import { useHorizontalMode } from '@/utils/hooks'
import CarFilterBar from '@/components/car/FilterBar'
import CarFilterPopup, { type CarFilterPopupType } from '@/components/car/FilterPopup'
import { useSourceNames } from '@/store/common/hook'


interface SonglistInfo {
  source: InitState['sources'][number]
  sortId: SortInfo['id']
  tagId: string
  tagName: string
}

export default () => {
  const headerBarRef = useRef<HeaderBarType>(null)
  const listRef = useRef<ListType>(null)
  const filterPopupRef = useRef<CarFilterPopupType>(null)
  const isHorizontalMode = useHorizontalMode()
  const sourceNames = useSourceNames()
  const [info, setInfo] = useState<SonglistInfo>({ source: 'kw', sortId: '5', tagId: '', tagName: '' })
  const [total, setTotal] = useState(0)
  const songlistInfo = useRef<SonglistInfo>({ source: 'kw', sortId: '5', tagId: '', tagName: '' })

  const load = (source: Source, sortId: string, tagId: string, tagName: string) => {
    songlistInfo.current = { source, sortId, tagId, tagName }
    setInfo({ source, sortId, tagId, tagName })
    void listRef.current?.loadList(source, sortId, tagId).then(() => {
      setTotal(songlistState.listInfo.total)
    })
  }

  useEffect(() => {
    void getSongListSetting().then(setting => {
      const next = {
        source: setting.source,
        sortId: setting.sortId,
        tagId: setting.tagId,
        tagName: setting.tagName ?? '',
      }
      songlistInfo.current = next
      setInfo(next)
      headerBarRef.current?.setSource(next.source, next.sortId, next.tagName, next.tagId)
      void listRef.current?.loadList(next.source, next.sortId, next.tagId).then(() => {
        setTotal(songlistState.listInfo.total)
      })
    })
  }, [])

  const handleSortChange: HeaderBarProps['onSortChange'] = (id) => {
    void saveSongListSetting({ sortId: id })
    load(songlistInfo.current.source, id, songlistInfo.current.tagId, songlistInfo.current.tagName)
  }

  const handleTagChange: HeaderBarProps['onTagChange'] = (name, id) => {
    void saveSongListSetting({ tagName: name, tagId: id })
    load(songlistInfo.current.source, songlistInfo.current.sortId, id, name)
  }

  const handleSourceChange: HeaderBarProps['onSourceChange'] = (source) => {
    const sortId = songlistState.sortList[source]![0].id
    void saveSongListSetting({ sortId, source, tagId: '', tagName: '' })
    headerBarRef.current?.setSource(source, sortId, '', '')
    load(source, sortId, '', '')
  }

  const handleReset = () => {
    handleSourceChange(songlistInfo.current.source)
  }

  const sortName = songlistState.sortList[info.source]?.find(s => s.id == info.sortId)?.name ?? ''

  return (
    <View style={styles.container}>
      {
        isHorizontalMode
          ? (
            <>
              <CarFilterBar
                info={{
                  sourceName: sourceNames[info.source] ?? info.source,
                  sortName,
                  tagName: info.tagName,
                }}
                total={total}
                onOpenFilter={() => { filterPopupRef.current?.show() }}
              />
              <CarFilterPopup
                ref={filterPopupRef}
                info={{ source: info.source, sortId: info.sortId, tagId: info.tagId, tagName: info.tagName }}
                onSortChange={handleSortChange}
                onTagChange={handleTagChange}
                onSourceChange={handleSourceChange}
                onReset={handleReset}
              />
            </>
            )
          : (
            <HeaderBar
              ref={headerBarRef}
              onSortChange={handleSortChange}
              onTagChange={handleTagChange}
              onSourceChange={handleSourceChange}
            />
            )
      }
      <List ref={listRef} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
  },
})
