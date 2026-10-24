import { memo, useCallback } from 'react'
import { FlatList, TouchableOpacity, View } from 'react-native'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { CAR, carFontSize, ROW_ACTION_BTN_RADIUS, useCarFontScale, useCarMetrics } from '@/components/car/constants'
import { pickBestQuality, type CachedMusicItem } from '@/core/auditionCache'

const ROW_HEIGHT = 50

/** 字节数转可读体积 */
const formatSize = (bytes: number) => {
  if (bytes <= 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  return `${index == 0 ? value : value.toFixed(1)} ${units[index]}`
}

const Row = memo(({ item, index, onPlay, onAppend, onDelete }: {
  item: CachedMusicItem
  index: number
  onPlay: (item: CachedMusicItem) => void
  onAppend: (item: CachedMusicItem) => void
  onDelete: (item: CachedMusicItem) => void
}) => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const { rowActionBtnSize } = useCarMetrics()
  const bestQuality = pickBestQuality(item.qualities)
  const btnStyle = {
    width: rowActionBtnSize,
    height: rowActionBtnSize,
    borderRadius: ROW_ACTION_BTN_RADIUS,
    borderColor: theme['c-border-background'],
  }

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={() => { onPlay(item) }}>
      <Text size={carFontSize(12, fontScale)} color={theme['c-font-label']} style={styles.index}>{index + 1}</Text>
      <View style={styles.info}>
        <Text size={carFontSize(13.5, fontScale)} color={theme['c-font']} numberOfLines={1}>{item.name}</Text>
        <Text size={carFontSize(12, fontScale)} color={theme['c-font-label']} numberOfLines={1}>
          {[item.singer, item.albumName].filter(Boolean).join(' · ') || '未知歌手'}
        </Text>
      </View>
      {/* 缓存了多份音质时只展示最高的那份，避免右侧被一堆小胶囊占满 */}
      {bestQuality
        ? (
          <View style={{ ...styles.quality, borderColor: theme['c-border-background'] }}>
            <Text size={carFontSize(11, fontScale)} color={theme['c-font-label']}>{bestQuality}</Text>
          </View>
          )
        : null}
      <Text size={carFontSize(12, fontScale)} color={theme['c-font-label']} style={styles.size}>
        {formatSize(item.size)}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={{ ...styles.btn, ...btnStyle }} activeOpacity={0.6} onPress={() => { onPlay(item) }}>
          <Icon name="play" size={15} color={theme['c-font']} rawSize={15} />
        </TouchableOpacity>
        {/* 加入播放队列：用"有序列表"图标表示排队，避免和"添加到歌单"的 add-music 混淆 */}
        <TouchableOpacity style={{ ...styles.btn, ...btnStyle }} activeOpacity={0.6} onPress={() => { onAppend(item) }}>
          <Icon name="list-order" size={15} color={theme['c-font']} rawSize={15} />
        </TouchableOpacity>
        <TouchableOpacity style={{ ...styles.btn, ...btnStyle }} activeOpacity={0.6} onPress={() => { onDelete(item) }}>
          <Icon name="remove" size={15} color={theme['c-font']} rawSize={15} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
})

export default memo(({ list, emptyText, onPlay, onAppend, onDelete }: {
  list: CachedMusicItem[]
  emptyText: string
  onPlay: (item: CachedMusicItem) => void
  onAppend: (item: CachedMusicItem) => void
  onDelete: (item: CachedMusicItem) => void
}) => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const renderItem = useCallback(({ item, index }: { item: CachedMusicItem, index: number }) => (
    <Row item={item} index={index} onPlay={onPlay} onAppend={onAppend} onDelete={onDelete} />
  ), [onPlay, onAppend, onDelete])
  const getItemLayout = useCallback((_data: unknown, index: number) => ({
    length: ROW_HEIGHT,
    offset: ROW_HEIGHT * index,
    index,
  }), [])

  if (!list.length) {
    return (
      <View style={styles.empty}>
        <Text size={carFontSize(13, fontScale)} color={theme['c-font-label']}>{emptyText}</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={list}
      keyExtractor={item => item.songKey}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      windowSize={7}
      removeClippedSubviews
      contentContainerStyle={styles.list}
    />
  )
})

const styles = createStyle({
  list: {
    paddingHorizontal: CAR.padding,
    paddingBottom: CAR.padding,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  index: {
    width: 28,
    flexShrink: 0,
    textAlign: 'right',
  },
  info: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
    gap: 1,
  },
  quality: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  size: {
    width: 66,
    flexShrink: 0,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  btn: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
