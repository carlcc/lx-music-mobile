import { useRef, useEffect, useState } from 'react'
import { type LayoutChangeEvent, View } from 'react-native'
import { useHorizontalMode } from '@/utils/hooks'

// import music from '@/utils/musicSdk'
// import InsetShadow from 'react-native-inset-shadow'
// import TipList from './components/TipList'
// import MusicList from './components/MusicList'
import HeaderBar, { type HeaderBarProps, type HeaderBarType } from './HeaderBar'
import searchState, { type SearchType } from '@/store/search/state'
import searchMusicState from '@/store/search/music/state'
import searchSonglistState from '@/store/search/songlist/state'
import { getSearchSetting, saveSearchSetting } from '@/utils/data'
import { createStyle } from '@/utils/tools'
import TipList, { type TipListType } from './TipList'
import List, { type ListType } from './List'
import CarSearchPanel from '@/components/car/CarSearchPanel'
import CarSearchHeader from '@/components/car/CarSearchHeader'
import {
  blurSearchInput,
  onSearchSubmit,
  setSearchPanelVisible,
  setSearchText,
  useSearchText,
} from '@/components/car/searchInputState'
import { addHistoryWord, setSearchText as setSearchStateText } from '@/core/search/search'


interface SearchInfo {
  temp_source: LX.OnlineSource
  source: LX.OnlineSource | 'all'
  searchType: 'music' | 'songlist'
}

export default () => {
  const headerBarRef = useRef<HeaderBarType>(null)
  const searchTipListRef = useRef<TipListType>(null)
  const listRef = useRef<ListType>(null)
  const layoutHeightRef = useRef<number>(0)
  const searchInfo = useRef<SearchInfo>({ temp_source: 'kw', source: 'kw', searchType: 'music' })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isHorizontalMode = useHorizontalMode()
  // 搜索词由顶栏输入框持有（折叠后仍保留）
  const carText = useSearchText()
  const [carType, setCarType] = useState<SearchType>('music')
  const [carSource, setCarSource] = useState<LX.OnlineSource | 'all'>('kw')
  // 内容区实测高度，用来限制搜索建议浮层的最高高度
  const [contentHeight, setContentHeight] = useState(0)
  const handleSearchRef = useRef<HeaderBarProps['onSearch']>(() => {})

  useEffect(() => {
    void getSearchSetting().then(info => {
      // info.type = 'music'
      searchInfo.current.temp_source = info.temp_source
      searchInfo.current.source = info.source
      searchInfo.current.searchType = info.type
      switch (info.type) {
        case 'music':
          headerBarRef.current?.setSourceList(searchMusicState.sources, info.source)
          break
        case 'songlist':
          headerBarRef.current?.setSourceList(searchSonglistState.sources, info.source)
          break
      }
      headerBarRef.current?.setText(searchState.searchText)
      setSearchText(searchState.searchText)
      setCarType(info.type)
      setCarSource(info.source)
      listRef.current?.loadList(searchState.searchText, searchInfo.current.source, searchInfo.current.searchType)
    })

    const handleTypeChange = (type: SearchType) => {
      searchInfo.current.searchType = type
      void saveSearchSetting({ type })
      setCarType(type)
      listRef.current?.loadList(searchState.searchText, searchInfo.current.source, type)
    }
    global.app_event.on('searchTypeChanged', handleTypeChange)

    return () => {
      global.app_event.off('searchTypeChanged', handleTypeChange)
    }
  }, [])


  const handleLayout = (e: LayoutChangeEvent) => {
    layoutHeightRef.current = e.nativeEvent.layout.height
    setContentHeight(e.nativeEvent.layout.height)
  }

  const handleSourceChange: HeaderBarProps['onSourceChange'] = (source) => {
    searchInfo.current.source = source
    void saveSearchSetting({ source })
    setCarSource(source)
    listRef.current?.loadList(searchState.searchText, source, searchInfo.current.searchType)
  }
  const handleCarTypeChange = (type: SearchType) => {
    global.app_event.searchTypeChanged(type)
  }
  const handleTipSearch: HeaderBarProps['onTipSearch'] = (text) => {
    setTimeout(() => {
      searchTipListRef.current?.search(text, layoutHeightRef.current)
    }, 500)
  }
  const handleHideTipList = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    searchTipListRef.current?.hide()
  }
  const handleSearch: HeaderBarProps['onSearch'] = (text) => {
    handleHideTipList()
    setSearchPanelVisible(false)
    searchTipListRef.current?.search(text, layoutHeightRef.current)
    headerBarRef.current?.setText(text)
    headerBarRef.current?.blur()
    // 记住最后一次搜索词：切换导航 tab 导致界面重建后可以按它恢复结果（不再重新搜索）
    setSearchStateText(text)
    void addHistoryWord(text)
    listRef.current?.loadList(text, searchInfo.current.source, searchInfo.current.searchType)
  }
  handleSearchRef.current = handleSearch

  // 顶栏输入框提交搜索 → 在这里真正执行（用 ref 取最新的 handleSearch，避免闭包过期）
  useEffect(() => onSearchSubmit(text => { handleSearchRef.current(text) }), [])

  // 收起建议浮层：必须同时让顶栏输入框失焦，否则输入框仍处于聚焦态，
  // 下次点击不会再触发 onFocus，浮层就再也呼不出来了
  const handleDismissPanel = () => {
    blurSearchInput()
    setSearchPanelVisible(false)
  }
  const handleShowTipList: HeaderBarProps['onShowTipList'] = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      searchTipListRef.current?.show(layoutHeightRef.current)
    }, 500)
  }

  return (
    <View style={styles.container}>
      {
        isHorizontalMode
          ? (
            <CarSearchHeader
              info={{
                searchType: carType,
                source: carSource,
                sources: (carType == 'songlist' ? searchSonglistState.sources : searchMusicState.sources) as Array<LX.OnlineSource | 'all'>,
              }}
              onTypeChange={handleCarTypeChange}
              onSourceChange={handleSourceChange}
              onHidePanel={() => { setSearchPanelVisible(false) }}
            />
            )
          : (
            <HeaderBar
              ref={headerBarRef}
              onSourceChange={handleSourceChange}
              onTipSearch={handleTipSearch}
              onSearch={handleSearch}
              onHideTipList={handleHideTipList}
              onShowTipList={handleShowTipList}
            />
            )
      }
      <View style={styles.content} onLayout={handleLayout}>
        {/* 车机模式的搜索建议浮层由 CarSearchHeader 自己渲染（紧贴搜索框），这里不再重复 */}
        {isHorizontalMode ? null : <TipList ref={searchTipListRef} onSearch={handleSearch} />}
        <List ref={listRef} onSearch={handleSearch} />
      </View>
      {/* 车机搜索建议浮层：必须渲染在结果列表之后，否则触摸会被结果列表吃掉（滚不动浮层） */}
      {
        isHorizontalMode
          ? (
            <CarSearchPanel
              text={carText}
              source={carSource}
              onChangeText={setSearchText}
              onSearch={handleSearch}
              onDismiss={handleDismissPanel}
              maxHeight={contentHeight}
            />
            )
          : null
      }
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flex: 1,
  },
  content: {
    flex: 1,
  },
})
