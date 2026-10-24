import { memo, useEffect, useRef } from 'react'
import { Animated, Easing, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import Image from '@/components/common/Image'
import { setNavActiveId } from '@/core/common'
import { createStyle } from '@/utils/tools'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import songlistState from '@/store/songlist/state'
import { setCarSonglistDetail, useCarSonglistDetail } from './carDetailState'
import { appendToQueue, carPlayList } from './action'
import {
  emitSearchSubmit,
  getSearchBoxMetrics,
  setSearchBlurHandler,
  setSearchBoxWidth,
  setSearchPanelVisible,
  setSearchText,
  useSearchBoxWidth,
  useSearchText,
} from './searchInputState'

import { useWindowSize } from '@/utils/hooks'
import { handleCollect } from '@/screens/SonglistDetail/listAction'
import { CAR, carFontSize, ROW_ACTION_BTN_RADIUS, useCarFontScale, useCarMetrics } from './constants'

const handleBack = () => {
  setCarSonglistDetail(null)
}

/**
 * 歌单详情头部（与返回按钮同一行）：封面 + 标题 + 操作按钮
 */
const DetailHeader = ({ id, name, source, img }: {
  id: string
  name: string
  source: string
  img?: string
}) => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const { topBarBtnSize } = useCarMetrics()
  // 封面与标题文字等高（缩略图级别），简介移到正文里随内容一起滚动，
  // 这样头部只占一行，把竖向空间全部让给歌曲列表
  const picSize = topBarBtnSize

  const handlePlayAll = () => {
    const detail = songlistState.listDetailInfo
    if (!detail.list.length) return
    void carPlayList(`${detail.source}__${detail.id}`, detail.list, 0)
  }
  const handleAppend = () => {
    const detail = songlistState.listDetailInfo
    if (!detail.list.length) return
    void appendToQueue(detail.list)
  }
  const handleSave = () => {
    void handleCollect(id, source as LX.OnlineSource, songlistState.listDetailInfo.info.name ?? name)
  }

  return (
    <View style={styles.detailContainer}>
      <TouchableOpacity style={{
        ...styles.backBtn,
        width: topBarBtnSize,
        height: topBarBtnSize,
        borderColor: theme['c-border-background'],
      }} activeOpacity={0.6} onPress={handleBack}>
        <Icon name="chevron-left" size={20} color={theme['c-font-label']} rawSize={20} />
      </TouchableOpacity>
      <View style={{ width: picSize, height: picSize }}>
        <Image url={img} style={{ width: picSize, height: picSize, borderRadius: 6 }} />
      </View>
      <View style={styles.detailInfo}>
        <Text size={carFontSize(15, fontScale)} color={theme['c-font-label']} numberOfLines={1}>{name}</Text>
      </View>
      <View style={styles.detailActions}>
        <TouchableOpacity style={{ ...styles.detailBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={handleSave}>
          <Text size={carFontSize(12, fontScale)} color={theme['c-font-label']}>收藏</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ ...styles.detailBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={handlePlayAll}>
          <Text size={carFontSize(12, fontScale)} color={theme['c-font-label']}>播放</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ ...styles.detailBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={handleAppend}>
          <Text size={carFontSize(12, fontScale)} color={theme['c-font-label']}>追加</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/**
 * 顶栏搜索框：全 App 只有一个，所有页面共用
 * - 折叠态：胶囊按钮，点击后展开并切到搜索页
 * - 展开态：真实输入框 + 清除 + 搜索按钮（在搜索页时为展开态，切走自动折叠并保留已输入内容）
 */
const SearchInput = () => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const { topBarBtnSize } = useCarMetrics()
  const { width: winWidth } = useWindowSize()
  const id = useNavActiveId()
  const text = useSearchText()
  const expanded = id == 'nav_search'
  const inputRef = useRef<TextInput>(null)
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { collapsedWidth } = getSearchBoxMetrics(winWidth, topBarBtnSize)
  // 实测宽度：只同步给建议浮层做对齐，不参与自身宽度计算
  const measuredWidth = useSearchBoxWidth()
  // 展开 / 折叠的视觉过渡：只用 transform / opacity，走原生线程
  // （宽度是布局属性，只能 JS 驱动 + 每帧重排；这个界面整屏带模糊背景，每帧重排实测只有 3 帧）
  const enterAnim = useRef(new Animated.Value(1)).current
  const isFirstRunRef = useRef(true)
  // 只有「点了搜索框」才自动聚焦：从左侧导航切进搜索页时不应该弹键盘
  const shouldFocusRef = useRef(false)

  // 展开时用 100% 撑满外层 flex 容器：宽度由布局一次算准（= 当前 tab 的真实剩余空间），
  // 不需要测量，也就不会因为「先按旧宽度渲染、实测回来再跳一次」而出现两段动画
  const boxWidth: number | `${number}%` = expanded ? '100%' : collapsedWidth
  // 右锚定的横向撑开：scaleX 会把右边缘往左拉 W(1-s)/2，用 translateX 补回去
  // （展开时宽度是 100%，这里用实测值估算补偿量；测不到时退回折叠宽度也不会出错）
  const shiftBase = typeof boxWidth == 'number' ? boxWidth : (measuredWidth || collapsedWidth)
  const boxScale = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] })
  const boxShift = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.round(shiftBase * 0.03), 0],
  })
  // 内容淡入 + 轻微右移
  const contentOpacity = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
  const contentShift = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] })

  // 宽度瞬间切换（只变一次布局），视觉过渡交给上面的原生动画
  // 展开 / 收起都播同一段「撑开 + 淡入」，两个方向的观感才一致
  useEffect(() => {
    // 启动就落在某个状态时直接给终值，不播动画
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
      enterAnim.setValue(1)
      return
    }
    enterAnim.setValue(0)
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: expanded ? 220 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [expanded, enterAnim])

  // 切到其它 tab 时收起建议浮层；展开且是用户点击触发时才聚焦（等动画结束再聚焦，
  // 避免键盘弹出和宽度动画抢帧导致的卡顿）
  useEffect(() => {
    if (!expanded) {
      setSearchPanelVisible(false)
      return
    }
    if (!shouldFocusRef.current) return
    shouldFocusRef.current = false
    const timer = setTimeout(() => { inputRef.current?.focus() }, 260)
    return () => { clearTimeout(timer) }
  }, [expanded])

  // 搜索页收起浮层时要能把输入框失焦，否则再点它不会触发 onFocus
  useEffect(() => {
    setSearchBlurHandler(() => { inputRef.current?.blur() })
    return () => { setSearchBlurHandler(null) }
  }, [])

  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
  }, [])

  const showPanel = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current)
      blurTimerRef.current = null
    }
    setSearchPanelVisible(true)
  }

  const hidePanel = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current)
      blurTimerRef.current = null
    }
    setSearchPanelVisible(false)
  }

  // 失焦后延迟收起，避免先卸载导致浮层内点击丢失
  const hidePanelDelay = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    blurTimerRef.current = setTimeout(() => {
      blurTimerRef.current = null
      setSearchPanelVisible(false)
    }, 200)
  }

  const handleChangeText = (value: string) => {
    setSearchText(value)
    showPanel()
  }

  const handleSubmit = () => {
    hidePanel()
    inputRef.current?.blur()
    emitSearchSubmit(text)
  }

  const handleClearText = () => {
    setSearchText('')
    showPanel()
  }

  return (
    // 外层 flex：占据顶栏的剩余空间并把实测宽度同步给浮层；
    // 内层宽度瞬间切换（不逐帧改布局），撑开效果由原生 transform 承担，
    // 不会把标题或播放按钮挤出去
    <View style={styles.searchBoxFlex} onLayout={({ nativeEvent }) => { setSearchBoxWidth(nativeEvent.layout.width) }}>
      <Animated.View style={{
        ...styles.searchBox,
        width: boxWidth,
        height: topBarBtnSize,
        borderRadius: topBarBtnSize / 2,
        borderColor: theme['c-border-background'],
        backgroundColor: theme['c-primary-background'],
        transform: [{ translateX: boxShift }, { scaleX: boxScale }],
      }}>
        <Icon name="search-2" size={18} color={theme['c-font-label']} rawSize={18} />
        {/* 展开 / 收起切换时，内容整体淡入 + 轻微滑入：宽度切换被藏在这段透明度变化后面 */}
        <Animated.View style={{
          ...styles.inputWrap,
          opacity: contentOpacity,
          transform: [{ translateX: contentShift }],
        }}>
      {
        expanded
          ? (
            <>
              <TextInput
                ref={inputRef}
                style={{ ...styles.input, color: theme['c-font'] }}
                placeholder="搜索歌曲 / 歌手 / 专辑 / 歌单"
                placeholderTextColor={theme['c-font-label']}
                value={text}
                onChangeText={handleChangeText}
                onFocus={showPanel}
                // Android 上点击外部不会自动失焦，再点输入框不会触发 onFocus，所以按点击补一次
                onPressIn={() => { if (!text) showPanel() }}
                onBlur={hidePanelDelay}
                onSubmitEditing={handleSubmit}
                returnKeyType="search"
              />
              {
                text
                  ? (
                    <TouchableOpacity style={styles.clearBtn} activeOpacity={0.6} onPress={handleClearText}>
                      <Icon name="close" size={16} color={theme['c-font']} rawSize={16} />
                    </TouchableOpacity>
                    )
                  : null
              }
              <TouchableOpacity style={{ ...styles.searchBtn, backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={handleSubmit}>
                <Text size={carFontSize(12.5, fontScale)} color={theme['c-primary-font']}>搜索</Text>
              </TouchableOpacity>
            </>
            )
          : (
            <TouchableOpacity
              style={styles.collapsedBtn}
              activeOpacity={0.6}
              onPress={() => {
                shouldFocusRef.current = true
                setNavActiveId('nav_search')
              }}
            >
              <Text size={carFontSize(13, fontScale)} color={theme['c-font-label']} numberOfLines={1}>{text || '搜索歌曲 / 歌手 / 歌单'}</Text>
            </TouchableOpacity>
            )
      }
        </Animated.View>
      </Animated.View>
    </View>
  )
}

/**
 * 播放页直达入口（与侧栏"正在播放"重复但更顺手）
 */
const PlayDetailBtn = () => {
  const theme = useTheme()
  const { topBarBtnSize } = useCarMetrics()
  return (
    <TouchableOpacity
      style={{
        ...styles.iconBtn,
        width: topBarBtnSize,
        height: topBarBtnSize,
        borderColor: theme['c-border-background'],
        backgroundColor: theme['c-primary-background'],
      }}
      activeOpacity={0.6}
      onPress={() => {
        const componentId = commonState.componentIds.home
        if (componentId) navigations.pushPlayDetailScreen(componentId)
      }}
    >
      <Icon name="album" size={20} color={theme['c-font-label']} rawSize={20} />
    </TouchableOpacity>
  )
}

export default memo(() => {
  const theme = useTheme()
  const id = useNavActiveId()
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const detailInfo = useCarSonglistDetail()
  const { topBarHeight } = useCarMetrics()

  // 歌单详情：封面/标题/按钮都在这一行，内容区只放列表
  if (detailInfo) {
    return (
      <View style={{ paddingTop: statusBarHeight, borderBottomColor: theme['c-border-background'], borderBottomWidth: 1 }}>
        <DetailHeader
          id={detailInfo.id}
          name={detailInfo.name}
          source={detailInfo.source}
          img={detailInfo.img}
        />
      </View>
    )
  }

  return (
    <View style={{
      ...styles.container,
      height: topBarHeight + statusBarHeight,
      paddingTop: statusBarHeight,
      borderBottomColor: theme['c-border-background'],
    }}>
      <Text style={styles.title} size={18} color={theme['c-primary-font']} numberOfLines={1}>{t(id as never)}</Text>
      <View style={styles.right}>
        {/* 全 App 唯一的搜索框：非搜索页折叠，搜索页展开 */}
        <SearchInput />
        <PlayDetailBtn />
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: CAR.padding,
    paddingRight: CAR.padding,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    zIndex: 10,
  },
  title: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: 220,
    // 与右侧播放页按钮保持同样的留白（right 的 gap 也是 12）
    marginRight: 12,
  },
  right: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  // 搜索框外层：占满顶栏剩余空间，并把实测宽度同步给浮层
  searchBoxFlex: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    // 折叠时搜索框靠右（紧贴播放页按钮），展开时占满这一段
    alignItems: 'flex-end',
  },
  // 顶栏搜索框：宽度由展开 / 折叠动画控制
  searchBox: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    gap: 6,
    overflow: 'hidden',
  },
  // 展开态的内容容器（输入框 + 清除 + 搜索），整体做淡入滑入
  inputWrap: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  collapsedBtn: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtn: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 圆角矩形：图标本身是方的，用圆形包裹不好看
  iconBtn: {
    borderRadius: ROW_ACTION_BTN_RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 歌单详情头部：压缩成一行，简介移到正文
  detailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: CAR.padding,
    paddingTop: 6,
    paddingBottom: 6,
  },
  backBtn: {
    borderRadius: ROW_ACTION_BTN_RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInfo: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  detailDesc: {
    paddingTop: 3,
    opacity: 0.85,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  // 精简后的小按钮：不挤占标题与简介的空间
  detailBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
})
