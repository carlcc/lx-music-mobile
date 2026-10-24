import { memo, useEffect, useRef, useState } from 'react'
import {
  ScrollView,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { createStyle } from '@/utils/tools'
import Lyric from './Lyric'
import QueueList, { useQueueList } from '@/components/car/QueueList'
import { carFontSize, useCarFontScale } from '@/components/car/constants'

type Tab = 'lyric' | 'queue'
const TAB_LIST: Array<[Tab, string]> = [['lyric', '歌词'], ['queue', '队列']]

/**
 * 车机播放页右列：歌词 / 队列
 * - 两个面板同时挂载并保持：切换只是翻页，不会重建（列表重新加载、定位丢失）
 * - 支持点 tab 与左右拖动切换
 */
export default memo(() => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const [tab, setTab] = useState<Tab>('lyric')
  // 首帧只画 tabs，两个面板等首帧绘制完再挂载：
  // 导航滑入动画在原生层跑，React 首帧越重，滑入过程中空白的时间越长
  const [ready, setReady] = useState(false)
  const [pageWidth, setPageWidth] = useState(0)
  const pagerRef = useRef<ScrollView>(null)
  const { musics, remove } = useQueueList()

  useEffect(() => {
    const timer = setTimeout(() => { setReady(true) }, 0)
    return () => { clearTimeout(timer) }
  }, [])

  const handleTabPress = (id: Tab) => {
    setTab(id)
    if (!pageWidth) return
    pagerRef.current?.scrollTo({ x: id == 'lyric' ? 0 : pageWidth, animated: true })
  }

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    if (nativeEvent.layout.width) setPageWidth(nativeEvent.layout.width)
  }

  const handleMomentumScrollEnd = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return
    const index = Math.round(nativeEvent.contentOffset.x / pageWidth)
    setTab(index > 0 ? 'queue' : 'lyric')
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TAB_LIST.map(([id, name]) => (
          <TouchableOpacity
            key={id}
            style={styles.tab}
            activeOpacity={0.6}
            onPress={() => { handleTabPress(id) }}
          >
            <Text
              style={{ ...styles.tabText, borderBottomColor: tab == id ? theme['c-primary-font'] : 'transparent' }}
              size={carFontSize(14, fontScale)}
              color={tab == id ? theme['c-primary-font'] : theme['c-font']}
            >{name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {
        ready
          ? (
            <ScrollView
              ref={pagerRef}
              style={styles.pager}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onLayout={handleLayout}
              onMomentumScrollEnd={handleMomentumScrollEnd}
            >
              <View style={{ ...styles.page, width: pageWidth }}>
                <Lyric />
              </View>
              <View style={{ ...styles.page, width: pageWidth }}>
                <QueueList musics={musics} onRemove={remove} />
              </View>
            </ScrollView>
            )
          : <View style={styles.pager} />
      }
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  page: {
    height: '100%',
  },
  // 简介式 tabs：纯文本 + 下划线，整体居中
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tabText: {
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderBottomWidth: BorderWidths.normal3,
  },
})
