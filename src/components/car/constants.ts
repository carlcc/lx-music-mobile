import { useSettingValue } from '@/store/setting/hook'
import { useWindowSize } from '@/utils/hooks'

/**
 * 车机（横屏）界面尺寸规范
 * 车机上以"大热区、大字号、少层级"为原则
 */
export const CAR = {
  /** 左侧一级导航宽度 */
  asideWidth: 84,
  /** 顶栏高度 */
  topBarHeight: 72,
  /** 底部常驻播放条高度 */
  playerBarHeight: 92,
  /** 列表行高 */
  rowHeight: 72,
  /** 最小点击热区 */
  hitSize: 56,
  /** 圆角 */
  radius: 16,
  /** 内容区内边距（四周统一，卡片与页面四周留白一致） */
  padding: 16,
  /** 行内操作按钮尺寸 */
  actionBtnSize: 44,
  /** 卡片/网格间距 */
  gap: 16,
} as const

/** 行内操作按钮的圆角：统一用圆角矩形（不是圆形） */
export const ROW_ACTION_BTN_RADIUS = 10

/** 车机搜索框高度 */
export const SEARCH_BOX_HEIGHT = 60
/** 车机搜索头部顶部内边距（搜索建议浮层的定位依赖它） */
export const SEARCH_HEADER_PADDING_TOP = 14

/**
 * 车机布局尺寸：按屏幕可用**高度**自适应
 *
 * 车机横屏的逻辑分辨率差异很大（实测的小屏机型只有约 397dp 高，而大屏车机可以到 720dp+）。
 * 顶栏 / 播放条 / 行高如果写死，矮屏上这套框架会吃掉近一半屏幕，几乎没有内容空间。
 * 所以这里按高度缩放，并给每个尺寸设下限，保证缩到最小也点得动。
 */
/** 达到这个高度时使用 CAR 里的原始尺寸（内容：行高、控制按钮等） */
const CAR_DESIGN_HEIGHT = 640
/** 内容压缩下限 */
const CAR_MIN_SCALE = 0.7
/**
 * 外围框架（顶栏 / 底部播放条 / 左侧导航）单独一套更激进的缩放
 * 这三层只起"框架"作用，矮屏上要尽量把高度让给内容区
 */
const CAR_CHROME_DESIGN_HEIGHT = 860
/** 框架压缩下限 */
const CAR_MIN_CHROME_SCALE = 0.5

export interface CarMetrics {
  /** 实际采用的缩放比例（内容层） */
  scale: number
  /** 外围框架（顶栏 / 播放条 / 侧栏）的缩放比例 */
  chromeScale: number
  /** 顶栏内按钮尺寸 */
  topBarBtnSize: number
  /** 底部播放条内控制按钮尺寸 */
  playerBarBtnSize: number
  /** 底部播放条内控制按钮之间的间距 */
  playerBarBtnGap: number
  /** 底部播放条内操作按钮（队列）高度 */
  playerBarActionBtnHeight: number
  /** 顶栏高度 */
  topBarHeight: number
  /** 底部播放条高度 */
  playerBarHeight: number
  /** 播放条左侧封面尺寸 */
  playerBarPicSize: number
  /** 列表行高 */
  rowHeight: number
  /** 在线歌曲列表（搜索结果 / 排行榜歌曲）条目高度：矮屏上收一点，一屏显示更多 */
  onlineItemHeight: number
  /** 行内操作按钮尺寸（加入歌单 / 移除等） */
  rowActionBtnSize: number
  /** 左侧导航宽度 */
  asideWidth: number
  /** 左侧导航按钮尺寸 */
  asideBtnSize: number
  /** 播放页：次控制按钮尺寸 */
  controlBtnSize: number
  /** 播放页：主控制（播放/暂停）按钮尺寸 */
  mainControlBtnSize: number
  /** 播放页：控制按钮间距 */
  controlBtnGap: number
  /** 播放页：控制行上下内边距 */
  controlBtnPaddingV: number
  /** 左侧导航：按钮之间的留白（每个按钮的上下内边距） */
  asideItemGap: number
  /** 左侧导航：顶部 logo 区高度 */
  asideLogoHeight: number
  /** 播放页：海报左侧按钮尺寸 */
  moreBtnSize: number
  /** 播放页：海报区与下方播放器之间的留白 */
  playerGap: number
  /** 播放页：歌名字号 */
  playerTitleSize: number
  /** 播放页：副标题（歌手 / 专辑 / 音源）字号 */
  playerSubSize: number
}

export const useCarMetrics = (): CarMetrics => {
  const { height } = useWindowSize()
  const h = height || CAR_DESIGN_HEIGHT
  const scale = Math.max(CAR_MIN_SCALE, Math.min(1, h / CAR_DESIGN_HEIGHT))
  // 框架层：比内容层收得更狠
  const chromeScale = Math.max(CAR_MIN_CHROME_SCALE, Math.min(1, h / CAR_CHROME_DESIGN_HEIGHT))

  const topBarHeight = Math.max(36, Math.round(CAR.topBarHeight * chromeScale))
  // 播放条要给按钮留出上下留白（按钮 36，留白各 9）
  const playerBarHeight = Math.max(54, Math.round(CAR.playerBarHeight * chromeScale))
  const rowHeight = Math.max(48, Math.round(CAR.rowHeight * scale))
  // 侧栏不能再压太窄：按钮里是 11px 文字（"我的列表" 约 44px），
  // 太窄会显示不全，按钮之间也没留白
  const asideWidth = Math.max(66, Math.round(CAR.asideWidth * chromeScale))

  return {
    scale,
    chromeScale,
    topBarHeight,
    playerBarHeight,
    playerBarPicSize: Math.max(34, playerBarHeight - 16),
    rowHeight,
    onlineItemHeight: Math.max(44, Math.round(64 * scale)),
    // 行内按钮：不占满行高，上下留白；矮屏上再小一点，给条目其它元素腾空间
    rowActionBtnSize: Math.max(34, Math.round(CAR.actionBtnSize * scale)),
    asideWidth,
    asideBtnSize: Math.min(64, Math.max(44, asideWidth - 16)),
    asideItemGap: Math.max(4, Math.round(10 * chromeScale)),
    asideLogoHeight: Math.max(50, Math.round(60 * chromeScale)),
    topBarBtnSize: Math.max(32, Math.round(46 * chromeScale)),
    playerBarBtnSize: Math.max(36, Math.round(46 * chromeScale)),
    // 按钮之间不留间隙的话，按钮变大后图标会挤在一起
    playerBarBtnGap: Math.max(6, Math.round(10 * chromeScale)),
    playerBarActionBtnHeight: Math.max(36, Math.round(48 * chromeScale)),
    // 播放页：写死尺寸在矮屏上会把上方海报挤到只剩一百多 dp
    controlBtnSize: Math.max(40, Math.round(64 * scale)),
    mainControlBtnSize: Math.max(52, Math.round(84 * scale)),
    controlBtnGap: Math.max(10, Math.round(22 * scale)),
    controlBtnPaddingV: Math.max(4, Math.round(8 * scale)),
    moreBtnSize: Math.max(36, Math.round(48 * scale)),
    playerGap: Math.max(10, Math.round(16 * scale)),
    playerTitleSize: Math.max(17, Math.round(23 * scale)),
    playerSubSize: Math.max(11, Math.round(13 * scale)),
  }
}

/**
 * 车机字号倍率（设置项 car.fontScale）
 */
export const useCarFontScale = (): number => {
  return useSettingValue('car.fontScale') || 1
}

/**
 * 按车机字号倍率计算字号
 */
export const carFontSize = (size: number, scale: number): number => {
  return Math.round(size * (scale || 1))
}
