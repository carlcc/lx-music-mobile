import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useWindowSize } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { getList as getHotSearch } from '@/core/hotSearch'
import { clearHistoryList, getSearchHistory, removeHistoryWord } from '@/core/search/search'
import { debounce } from '@/utils'
import musicSdk from '@/utils/musicSdk'
import {
  CAR,
  carFontSize,
  useCarFontScale,
  useCarMetrics,
} from './constants'
import {
  getSearchBoxMetrics,
  setSearchPanelVisible,
  useSearchBoxWidth,
  useSearchPanelVisible,
} from './searchInputState'

/**
 * 搜索建议浮层（模糊推荐 / 最近搜索 / 热门搜索）
 *
 * 注意：它必须由搜索页渲染在「结果列表之后」，而不是作为搜索框的子节点：
 * 绝对定位的浮层会超出父容器范围，作为子节点时触摸会被背后的结果列表吃掉，
 * 表现为"拖动浮层反而滚动了搜索结果"。
 */

const PANEL_TOP_GAP = 6
const MAX_TIP_NUM = 20
const MAX_HISTORY_NUM = 10
const TIP_ITEM_HEIGHT = 52
/**
 * 浮层顶部：搜索框现在在全局顶栏里，本组件挂在搜索页根节点（顶栏下方），
 * 所以只要留一个间距就正好贴在搜索框下面
 */
const PANEL_TOP = PANEL_TOP_GAP

interface TipSearchModule {
  tipSearch?: { search: (keyword: string) => Promise<string[]> }
}

/** 取可用的搜索建议模块，目前只有部分音源支持，不支持时回退到 kw */
const getTipSearch = (source: LX.OnlineSource | 'all') => {
  const sdk = musicSdk as unknown as Record<string, TipSearchModule | undefined>
  return (source == 'all' ? sdk.kw : sdk[source])?.tipSearch ?? sdk.kw?.tipSearch ?? null
}

const debounceTipSearch = debounce((keyword: string, source: LX.OnlineSource | 'all', callback: (list: string[]) => void) => {
  const tipSearch = getTipSearch(source)
  if (!tipSearch) {
    callback([])
    return
  }
  void tipSearch.search(keyword).then(list => { callback(list ?? []) }).catch(() => { callback([]) })
}, 250)

export interface CarSearchPanelType {
  show: () => void
  hide: () => void
}

export default memo(({ text, source, onChangeText, onSearch, onDismiss, maxHeight }: {
  text: string
  source: LX.OnlineSource | 'all'
  onChangeText: (text: string) => void
  onSearch: (text: string) => void
  /** 点击浮层外部时触发（需要同时让搜索框失焦，否则下次点击不会再触发 onFocus） */
  onDismiss?: () => void
  /** 内容区实测高度：浮层高度不会超过它，避免盖住顶栏 / 底部播放条 */
  maxHeight?: number
}) => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  // 与「搜索设置」里的开关保持一致
  const isShowHotSearch = useSettingValue('search.isShowHotSearch')
  const isShowHistorySearch = useSettingValue('search.isShowHistorySearch')
  const { width: winWidth, height: winHeight } = useWindowSize()
  const { topBarBtnSize } = useCarMetrics()
  // 与顶栏搜索框对齐：浮层宽度取搜索框的实测宽度（测到前用估算值），右边距同一套
  const { rightOffset, fallbackExpanded } = getSearchBoxMetrics(winWidth, topBarBtnSize)
  const expandedWidth = useSearchBoxWidth() || fallbackExpanded
  // 显隐由共享状态控制（顶栏输入框驱动）
  const visible = useSearchPanelVisible()
  const [tips, setTips] = useState<string[]>([])
  const [historyWords, setHistoryWords] = useState<string[]>([])
  const [hotWords, setHotWords] = useState<string[]>([])
  const [contentHeight, setContentHeight] = useState(0)
  const isUnmountedRef = useRef(false)
  const keywordRef = useRef('')

  useEffect(() => {
    isUnmountedRef.current = false
    return () => { isUnmountedRef.current = true }
  }, [])

  // 关闭"热门搜索"时不再请求热搜接口；与内建 HotSearch 一致：按当前选中音源取热搜，且不额外截断
  useEffect(() => {
    let ignore = false
    if (!isShowHotSearch) return
    void getHotSearch(source).then(list => {
      if (ignore) return
      setHotWords(list ?? [])
    }).catch(() => {})
    return () => { ignore = true }
  }, [isShowHotSearch, source])

  const loadHistory = useCallback(() => {
    if (!isShowHistorySearch) return
    void getSearchHistory().then(list => {
      if (isUnmountedRef.current) return
      setHistoryWords((list ?? []).slice(0, MAX_HISTORY_NUM))
    }).catch(() => {})
  }, [isShowHistorySearch])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const requestTips = useCallback((keyword: string) => {
    keywordRef.current = keyword
    if (!keyword) {
      setTips([])
      return
    }
    debounceTipSearch(keyword, source, (list) => {
      if (isUnmountedRef.current || keyword != keywordRef.current) return
      setTips(list.slice(0, MAX_TIP_NUM))
    })
  }, [source])

  // 展开时按当前输入刷新：有关键词取模糊推荐，没有则刷新历史
  useEffect(() => {
    if (!visible) return
    const keyword = text.trim()
    requestTips(keyword)
    if (!keyword) loadHistory()
  }, [visible, text, source, loadHistory, requestTips])

  const hide = () => { setSearchPanelVisible(false) }

  const handleTipPress = (tip: string) => {
    hide()
    onChangeText(tip)
    onSearch(tip)
  }

  /** 仅把推荐填入输入框，不发起搜索 */
  const handleInputTip = (tip: string) => {
    onChangeText(tip)
  }

  const handleRemoveHistory = (word: string) => {
    const index = historyWords.indexOf(word)
    if (index < 0) return
    removeHistoryWord(index)
    setHistoryWords(list => [...list.slice(0, index), ...list.slice(index + 1)])
  }

  const handleClearHistory = () => {
    clearHistoryList()
    setHistoryWords([])
  }

  const keyword = text.trim()
  const showTips = !!keyword && tips.length > 0
  const hasHistory = isShowHistorySearch && historyWords.length > 0
  const hasHotSearch = isShowHotSearch && hotWords.length > 0
  const showContent = showTips || hasHistory || hasHotSearch
  // 高度上限 = 内容区可用高度（由搜索页实测传入），
  // 保证不会往上盖到顶栏、往下盖到播放状态栏；内容不足时贴合内容，超出则在浮层内部滚动
  const panelAvailable = maxHeight
    ? Math.max(TIP_ITEM_HEIGHT * 2, maxHeight - PANEL_TOP - CAR.padding)
    : Math.max(TIP_ITEM_HEIGHT * 2, Math.round(winHeight * 0.6))
  const tipBoxHeight = Math.min(contentHeight || panelAvailable, panelAvailable)

  const renderChip = (word: string, index: number, keyPrefix: string, onLongPress?: () => void) => (
    <TouchableOpacity
      key={`${keyPrefix}_${word}_${index}`}
      style={{ ...styles.chip, backgroundColor: theme['c-primary-background'] }}
      activeOpacity={0.6}
      onPress={() => { handleTipPress(word) }}
      onLongPress={onLongPress}
    >
      <Text size={carFontSize(12.5, fontScale)} color={theme['c-font']} numberOfLines={1}>{word}</Text>
    </TouchableOpacity>
  )

  if (!visible || !showContent) return null

  return (
    <>
      {/* 点击浮层之外的任意位置收起（同时挡住透传到搜索结果的触摸） */}
      <TouchableOpacity
        style={styles.dismissLayer}
        activeOpacity={1}
        onPress={() => {
          if (onDismiss) onDismiss()
          else hide()
        }}
      />
      <View style={{
        ...styles.tipBox,
        width: expandedWidth,
        right: rightOffset,
        backgroundColor: theme['c-content-background'],
        borderColor: theme['c-border-background'],
      }}>
        <ScrollView
          style={{ ...styles.tipScroll, height: tipBoxHeight }}
          contentContainerStyle={styles.tipScrollContent}
          onContentSizeChange={(_w, h) => { setContentHeight(h) }}
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          // 内容超出时才显示滚动条
          showsVerticalScrollIndicator={contentHeight > tipBoxHeight}
        >
          {
            showTips
              ? tips.map((tip, index) => (
                <View key={`tip_${tip}_${index}`} style={styles.tipItem}>
                  <TouchableOpacity style={styles.tipItemMain} activeOpacity={0.6} onPress={() => { handleTipPress(tip) }}>
                    <Icon name="search-2" size={16} color={theme['c-font-label']} rawSize={16} />
                    <Text style={styles.tipText} size={carFontSize(14, fontScale)} color={theme['c-font']} numberOfLines={1}>{tip}</Text>
                  </TouchableOpacity>
                  {/* 仅采纳到输入框，不搜索：斜向左上的箭头表示"填回上方的搜索框" */}
                  <TouchableOpacity
                    style={{ ...styles.inputBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }}
                    activeOpacity={0.6}
                    onPress={() => { handleInputTip(tip) }}
                  >
                    <Icon
                      name="back-2"
                      size={16}
                      rawSize={16}
                      color={theme['c-primary-font']}
                      style={styles.inputBtnIcon}
                    />
                  </TouchableOpacity>
                </View>
              ))
              : (
                <View>
                  {
                    hasHistory
                      ? (
                        <View style={styles.section}>
                          <View style={styles.sectionHeader}>
                            <Text size={carFontSize(13, fontScale)} color={theme['c-font-label']}>最近搜索</Text>
                            <TouchableOpacity style={styles.sectionBtn} activeOpacity={0.6} onPress={handleClearHistory}>
                              <Icon name="eraser" size={16} color={theme['c-font-label']} rawSize={16} />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.chips}>
                            {historyWords.map((word, index) => renderChip(word, index, 'history', () => { handleRemoveHistory(word) }))}
                          </View>
                        </View>
                        )
                      : null
                  }
                  {
                    hasHotSearch
                      ? (
                        <View style={styles.section}>
                          <View style={styles.sectionHeader}>
                            <Text size={carFontSize(13, fontScale)} color={theme['c-font-label']}>热门搜索</Text>
                          </View>
                          <View style={styles.chips}>
                            {hotWords.map((word, index) => renderChip(word, index, 'hot'))}
                          </View>
                        </View>
                        )
                      : null
                  }
                </View>
                )
          }
        </ScrollView>
      </View>
    </>
  )
})

const styles = createStyle({
  // 覆盖整个搜索区，用于点击外部收起（在浮层之下，但盖住内容区其它元素）
  dismissLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 998,
  },
  // 搜索建议浮层：紧贴顶栏搜索框下沿，宽度与展开后的搜索框一致，层级最高
  tipBox: {
    position: 'absolute',
    top: PANEL_TOP,
    zIndex: 999,
    borderRadius: CAR.radius,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  tipScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  tipScrollContent: {
    paddingBottom: 6,
  },
  tipItem: {
    height: TIP_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    gap: 10,
  },
  tipItemMain: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    flex: 1,
    flexShrink: 1,
  },
  // 仅采纳推荐到输入框
  inputBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 左向箭头顺时针旋转 45° → 斜指向左上（上方的搜索框）
  inputBtnIcon: {
    transform: [{ rotate: '45deg' }],
  },
  // 最近搜索 / 热门搜索
  section: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  sectionBtn: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    // 允许折行，不再横向滚动
    flexWrap: 'wrap',
  },
  chip: {
    height: 38,
    maxWidth: 200,
    paddingHorizontal: 14,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
})
