import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { createStyle, toast } from '@/utils/tools'
import { getQueue, QUEUE_ID, removeFromQueue } from '@/core/player/queue'
import { playList } from '@/core/player/player'
import { usePlayMusicInfo } from '@/store/player/hook'
import { showAddMusicPopover } from './popup'
import { carFontSize, ROW_ACTION_BTN_RADIUS, useCarFontScale, useCarMetrics } from './constants'

/** 列表行高（随屏幕高度自适应） */
const useItemHeight = () => {
  const { rowHeight } = useCarMetrics()
  return Math.max(40, rowHeight)
}

/**
 * 播放队列列表：播放页"队列"与播放队列 popup 复用同一套逻辑
 *
 * 数据源固定是**队列这个匿名歌单**（QUEUE_ID），不跟随"当前播放列表" ——
 * 否则当播放列表是某个真实歌单时，队列里的增删会直接改动那个歌单
 */
export const useQueueList = () => {
  const [musics, setMusics] = useState<LX.Music.MusicInfo[]>([])
  // 播放页常驻后组件不会重新挂载，必须监听"当前播放"的变化来刷新队列
  const playMusicInfo = usePlayMusicInfo()
  const listId = playMusicInfo.listId ?? QUEUE_ID

  const refresh = useCallback(() => {
    void getQueue().then(list => { setMusics([...list]) })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, listId])

  useEffect(() => {
    const handleUpdate = (ids: string[]) => {
      if (ids.includes(QUEUE_ID)) refresh()
    }
    global.app_event.on('myListMusicUpdate', handleUpdate)
    return () => {
      global.app_event.off('myListMusicUpdate', handleUpdate)
    }
  }, [refresh])

  const remove = useCallback((musicInfo: LX.Music.MusicInfo) => {
    void removeFromQueue([musicInfo.id]).then(() => {
      toast(`已从队列移除：${musicInfo.name}`)
      refresh()
    })
  }, [refresh])

  return { musics, refresh, remove, count: musics.length }
}

export default memo(({ musics, onRemove }: {
  musics: LX.Music.MusicInfo[]
  onRemove?: (musicInfo: LX.Music.MusicInfo) => void
}) => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const itemHeight = useItemHeight()
  const { rowActionBtnSize: actionBtnSize } = useCarMetrics()
  const flatListRef = useRef<FlatList<LX.Music.MusicInfo>>(null)
  // 记录已经定位过的歌曲 id：首次打开时瞬时定位，之后切换歌曲时平滑跟随
  const scrolledIdRef = useRef('')
  // 面板可能被隐藏（display: none）后才显示，没完成布局时滚动是无效的
  const isLayoutedRef = useRef(false)
  const playMusicInfo = usePlayMusicInfo()
  const playingId = playMusicInfo.musicInfo?.id

  // 打开时定位到正在播放（含暂停）的歌曲，之后每次切歌都跟着定位；没有正在播放的歌（例如刚启动）则不定位
  const scrollToPlaying = useCallback(() => {
    if (!isLayoutedRef.current || !musics.length || !playingId) return
    if (scrolledIdRef.current == playingId) return
    const index = musics.findIndex(item => item.id == playingId)
    if (index < 0) return
    const animated = scrolledIdRef.current != ''
    scrolledIdRef.current = playingId
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index, animated, viewPosition: 0.5 })
    })
  }, [musics, playingId])

  useEffect(() => {
    scrollToPlaying()
  }, [scrollToPlaying])

  // 面板宽度要等布局完成才确定（首次挂载时可能是 0），此时滚动无效
  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    if (!nativeEvent.layout.width) return
    isLayoutedRef.current = true
    scrollToPlaying()
  }

  const handleScrollToIndexFailed = ({ index }: { index: number }) => {
    flatListRef.current?.scrollToOffset({ offset: index * itemHeight, animated: false })
  }

  const renderItem = ({ item, index }: { item: LX.Music.MusicInfo, index: number }) => {
    const active = playingId == item.id
    return (
      <TouchableOpacity
        style={{ ...styles.row, height: itemHeight, backgroundColor: active ? theme['c-primary-background-hover'] : 'rgba(0,0,0,0)' }}
        activeOpacity={0.6}
        onPress={() => {
          void playList(QUEUE_ID, index)
        }}
      >
        <Text style={styles.sn} size={carFontSize(13, fontScale)} color={active ? theme['c-primary-font'] : theme['c-font']}>{index + 1}</Text>
        <View style={styles.rowInfo}>
          <Text size={carFontSize(14, fontScale)} color={active ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>{item.name}</Text>
          <Text size={carFontSize(11.5, fontScale)} color={theme['c-font']} numberOfLines={1}>{item.singer}</Text>
        </View>
        <TouchableOpacity
          style={{ ...styles.actionBtn, width: actionBtnSize, height: actionBtnSize, borderRadius: ROW_ACTION_BTN_RADIUS }}
          activeOpacity={0.6}
          onPress={() => { showAddMusicPopover(item) }}
        >
          <Icon name="add-music" size={18} color={theme['c-font-label']} rawSize={18} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ ...styles.actionBtn, width: actionBtnSize, height: actionBtnSize, borderRadius: ROW_ACTION_BTN_RADIUS }}
          activeOpacity={0.6}
          onPress={() => { onRemove?.(item) }}
        >
          <Icon name="remove" size={18} color={theme['c-font-label']} rawSize={18} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  const getItemLayout = (_data: unknown, index: number) => {
    return { length: itemHeight, offset: itemHeight * index, index }
  }

  return (
    <FlatList
      ref={flatListRef}
      data={musics}
      keyExtractor={(item, index) => `${item.id}_${index}`}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      onScrollToIndexFailed={handleScrollToIndexFailed}
      onLayout={handleLayout}
      extraData={playingId}
      style={styles.list}
      nestedScrollEnabled
      ListEmptyComponent={<Text style={styles.empty} size={carFontSize(13, fontScale)} color={theme['c-font']}>队列是空的 · 可从列表点「＋」或播放整张歌单</Text>}
    />
  )
})

const styles = createStyle({
  list: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    // 右侧留白，别让最后一个按钮贴到边缘
    paddingLeft: 8,
    paddingRight: 10,
  },
  sn: {
    width: 40,
    textAlign: 'center',
  },
  rowInfo: {
    flex: 1,
    paddingRight: 8,
  },
  // 行内动作：加入其它歌单 / 从队列移除（尺寸随行高，不占满整行）
  actionBtn: {
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127, 127, 127, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  empty: {
    paddingVertical: 40,
    textAlign: 'center',
  },
})
