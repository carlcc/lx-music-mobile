import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { useNavActiveId } from '@/store/common/hook'
import { NAV_MENUS } from '@/config/constant'
import Search from '../Views/Search'
import SongList from '../Views/SongList'
import Mylist from '../Views/Mylist'
import Leaderboard from '../Views/Leaderboard'
import Setting from '../Views/Setting'
import CachedMusic from '../Views/CachedMusic'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { useCarSonglistDetail } from '@/components/car/carDetailState'
import CarSonglistDetail from '@/components/car/CarSonglistDetail'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'


const createView = (id: CommonState['navActiveId']) => {
  switch (id) {
    case 'nav_songlist': return <SongList />
    case 'nav_top': return <Leaderboard />
    case 'nav_love': return <Mylist />
    case 'nav_cache': return <CachedMusic />
    case 'nav_setting': return <Setting />
    case 'nav_search':
    default: return <Search />
  }
}

/** 全部常驻的 tab：启动后逐个在后台挂载，之后切换永远是瞬间的 */
const ALL_IDS = NAV_MENUS.map(menu => menu.id)
/** 后台挂载每个 tab 之间的间隔，避免启动瞬间一次性渲染 5 个界面 */
const MOUNT_INTERVAL = 120

const Main = () => {
  // 与侧栏 / 顶栏用同一个订阅（useNavActiveId），保证高亮和容器是同一次提交里切换的
  const id = useNavActiveId()
  // 首帧只渲染当前 tab，其余在后台补齐（全部保持挂载，切 tab 只是显示/隐藏）
  const [mountedIds, setMountedIds] = useState<Array<CommonState['navActiveId']>>([commonState.navActiveId])
  // 缓存创建好的界面元素：切 tab 时只改外层样式，元素引用不变 → 其余 tab 的子树不会重渲染
  const viewsRef = useRef(new Map<CommonState['navActiveId'], JSX.Element>())
  const detailInfo = useCarSonglistDetail()
  const componentIdRef = useRef(commonState.componentIds.home)
  const theme = useTheme()

  const getView = (itemId: CommonState['navActiveId']) => {
    let view = viewsRef.current.get(itemId)
    if (!view) {
      view = createView(itemId)
      viewsRef.current.set(itemId, view)
    }
    return view
  }

  // 兜底：万一 id 不在列表里（例如设置里新增的 tab），立即补上
  if (!mountedIds.includes(id)) setMountedIds([...mountedIds, id])

  // 后台逐个挂载剩余 tab
  useEffect(() => {
    let index = 0
    let timer: NodeJS.Timeout | null = null
    const remain = ALL_IDS.filter(itemId => itemId != commonState.navActiveId)
    const mountNext = () => {
      if (index >= remain.length) return
      const itemId = remain[index++]
      setMountedIds(ids => ids.includes(itemId) ? ids : [...ids, itemId])
      timer = setTimeout(mountNext, MOUNT_INTERVAL)
    }
    timer = setTimeout(mountNext, MOUNT_INTERVAL)
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <View style={styles.container}>
      {mountedIds.map(itemId => {
        const active = itemId == id
        return (
          <View
            key={itemId}
            // 隐藏用「绝对定位 + 透明度」而不是 display: none：
            // display: none 会让原生视图被销毁重建，切回来时图片要重新加载、还要重新布局（卡顿）
            style={active ? styles.view : styles.hiddenView}
            pointerEvents={active ? 'auto' : 'none'}
          >
            {getView(itemId)}
          </View>
        )
      })}
      {/* 车机：歌单详情覆盖在当前 tab 之上，底层界面保持挂载 */}
      {
        detailInfo
          ? (
            <View style={{ ...styles.detail, backgroundColor: theme['c-content-background'] }}>
              <CarSonglistDetail info={detailInfo} componentId={componentIdRef.current ?? ''} />
            </View>
            )
          : null
      }
    </View>
  )
}


export default Main

const styles = createStyle({
  container: {
    flex: 1,
  },
  view: {
    flex: 1,
  },
  hiddenView: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0,
  },
  detail: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
})
