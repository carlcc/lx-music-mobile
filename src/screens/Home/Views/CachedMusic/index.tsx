import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { confirmDialog, createStyle, toast } from '@/utils/tools'
import { CAR, carFontSize, useCarFontScale, useCarMetrics } from '@/components/car/constants'
import {
  buildOfflineMusicInfo,
  deleteAuditionCache,
  getAuditionCacheSize,
  getCachedFilterOptions,
  getCachedMusicList,
  matchSinger,
  rescanAuditionCache,
  type CachedMusicItem,
} from '@/core/auditionCache'
import { appendToQueue, carPlayList } from '@/components/car/action'
import SingerBar from './SingerBar'
import List from './List'

/** 字节数转可读体积 */
const formatSize = (bytes: number) => {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  return `${index == 0 ? value : value.toFixed(1)} ${units[index]}`
}

export default () => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const { rowActionBtnSize } = useCarMetrics()
  const [list, setList] = useState<CachedMusicItem[]>([])
  const [totalSize, setTotalSize] = useState(0)
  // null = 全部；'' = 未知歌手（没有提取到歌手名的歌）；其它 = 指定歌手
  const [singer, setSinger] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const load = useCallback(async() => {
    const [musicList, size] = await Promise.all([
      getCachedMusicList().catch(() => [] as CachedMusicItem[]),
      getAuditionCacheSize().catch(() => 0),
    ])
    setList(musicList)
    setTotalSize(size)
  }, [])

  useEffect(() => {
    void load()
    const handleChanged = () => { void load() }
    global.app_event.on('auditionCacheChanged', handleChanged)
    return () => {
      global.app_event.off('auditionCacheChanged', handleChanged)
    }
  }, [load])

  const singers = useMemo(() => getCachedFilterOptions(list, 'singer'), [list])
  const filtered = useMemo(
    () => singer == null ? list : list.filter(item => matchSinger(item.singer, singer)),
    [list, singer],
  )

  const playList = useCallback(async(list: CachedMusicItem[]) => {
    if (!list.length) return
    await carPlayList('cache', list.map(buildOfflineMusicInfo), 0)
  }, [])

  const handlePlayAll = useCallback(() => {
    void playList(filtered)
  }, [filtered, playList])

  const handleAppendAll = useCallback(() => {
    if (!filtered.length) return
    void appendToQueue(filtered.map(buildOfflineMusicInfo))
  }, [filtered])

  const handleRescan = useCallback(async() => {
    setScanning(true)
    toast('正在重新扫描缓存…')
    try {
      await rescanAuditionCache()
    } finally {
      setScanning(false)
      await load()
      toast('扫描完成')
    }
  }, [load])

  const handleDelete = useCallback(async(item: CachedMusicItem) => {
    const ok = await confirmDialog({ message: `确定删除《${item.name}》的缓存？` })
    if (!ok) return
    await deleteAuditionCache(item.songKey)
    toast('已删除缓存')
    await load()
  }, [load])

  const handlePlay = useCallback((item: CachedMusicItem) => {
    void carPlayList('cache', [buildOfflineMusicInfo(item)], 0)
  }, [])

  const handleAppend = useCallback((item: CachedMusicItem) => {
    void appendToQueue([buildOfflineMusicInfo(item)])
  }, [])

  return (
    <View style={styles.container}>
      {/* 顶部工具栏 */}
      <View style={styles.toolbar}>
        <Text size={carFontSize(12.5, fontScale)} color={theme['c-font-label']} numberOfLines={1}>
          共 {list.length} 首 · 已用 {formatSize(totalSize)}
        </Text>
        {/* 选中的歌手不在工具栏重复展示：左栏已经高亮，点左栏「全部」即可清除筛选 */}
        <View style={styles.toolbarRight}>
          <TouchableOpacity
            style={{ ...styles.btn, height: rowActionBtnSize, borderColor: theme['c-border-background'] }}
            activeOpacity={0.6}
            onPress={handlePlayAll}
          >
            <Icon name="play" size={14} color={theme['c-primary-font']} rawSize={14} />
            <Text size={carFontSize(12.5, fontScale)} color={theme['c-primary-font']}>播放全部</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ ...styles.btn, height: rowActionBtnSize, borderColor: theme['c-border-background'] }}
            activeOpacity={0.6}
            onPress={handleAppendAll}
          >
            <Icon name="add-music" size={14} color={theme['c-primary-font']} rawSize={14} />
            <Text size={carFontSize(12.5, fontScale)} color={theme['c-primary-font']}>加入队列</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ ...styles.btn, height: rowActionBtnSize, borderColor: theme['c-border-background'] }}
            activeOpacity={0.6}
            disabled={scanning}
            onPress={() => { void handleRescan() }}
          >
            <Icon name="available_updates" size={14} color={theme['c-primary-font']} rawSize={14} />
            <Text size={carFontSize(12.5, fontScale)} color={theme['c-primary-font']}>{scanning ? '扫描中' : '重新扫描'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* 两栏：左筛选 + 右列表 */}
      <View style={styles.body}>
        <SingerBar options={singers} total={list.length} active={singer} onChange={setSinger} />
        <List
          list={filtered}
          emptyText={list.length ? '该歌手下没有缓存歌曲' : '暂无已缓存歌曲，播放音乐后会自动缓存'}
          onPlay={handlePlay}
          onAppend={handleAppend}
          onDelete={handleDelete}
        />
      </View>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: CAR.padding,
    paddingTop: 8,
    paddingBottom: 6,
  },
  toolbarRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
})
