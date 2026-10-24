import { memo, useRef } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useIsPlay } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useHorizontalMode } from '@/utils/hooks'
import { useCarMetrics } from '@/components/car/constants'
import { togglePlayMode, toggleLyricLock, usePlayMode } from '@/components/car/playControlActions'
import DesktopLyricEnable, { type DesktopLyricEnableType } from '@/components/DesktopLyricEnable'
import { createStyle } from '@/utils/tools'

/**
 * 播放条右侧的控制键
 *
 * 车机横屏与播放详情同款 5 键：播放模式 / 上一首 / 播放暂停 / 下一首 / 桌面歌词。
 *
 * 之前这里只给了按钮一个随屏幕缩放的宽高，图标却用 size 属性换算
 * （scaleSizeW，受屏幕像素密度、屏幕像素数和系统字号共同影响），
 * 且按钮之间完全没有任何间距，所以在部分设备上会挤成一团/互相重叠。
 * 现在：按钮尺寸固定，图标按按钮尺寸换算（rawSize，不再跟随像素密度与字号），
 * 按钮之间留固定的间隙。
 */

/** 图标占按钮尺寸的比例 */
const ICON_RATIO = 0.56

/** 竖屏（手机）下的按钮尺寸与间距 */
const VERTICAL_BTN_SIZE = 40
const VERTICAL_BTN_GAP = 8

const handlePlayPrev = () => {
  void playPrev()
}
const handlePlayNext = () => {
  void playNext()
}

const usePlayerBarMetrics = () => {
  const isHorizontalMode = useHorizontalMode()
  const { playerBarBtnSize, playerBarBtnGap } = useCarMetrics()
  return {
    btnSize: isHorizontalMode ? playerBarBtnSize : VERTICAL_BTN_SIZE,
    btnGap: isHorizontalMode ? playerBarBtnGap : VERTICAL_BTN_GAP,
  }
}

const Btn = ({ icon, color, onPress, onLongPress }: {
  icon: string
  color?: string
  onPress: () => void
  onLongPress?: () => void
}) => {
  const theme = useTheme()
  const { btnSize } = usePlayerBarMetrics()

  return (
    <TouchableOpacity
      style={{
        ...styles.btn,
        width: btnSize,
        height: btnSize,
        borderRadius: btnSize / 2,
      }}
      activeOpacity={0.5}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Icon name={icon} color={color ?? theme['c-button-font']} rawSize={Math.round(btnSize * ICON_RATIO)} />
    </TouchableOpacity>
  )
}

const PlayPrevBtn = () => <Btn icon="prevMusic" onPress={handlePlayPrev} />

const PlayNextBtn = () => <Btn icon="nextMusic" onPress={handlePlayNext} />

const TogglePlayBtn = () => {
  const isPlay = useIsPlay()
  return <Btn icon={isPlay ? 'pause' : 'play'} onPress={togglePlay} />
}

/** 播放模式（播放详情同款：三选一循环切换） */
const PlayModeBtn = () => {
  const theme = useTheme()
  const { current, currentIndex } = usePlayMode()
  return <Btn
    icon={current.icon}
    color={currentIndex > 0 ? theme['c-primary-font'] : undefined}
    onPress={togglePlayMode}
  />
}

/** 桌面歌词开关（长按锁定/解锁） */
const LyricBtn = () => {
  const theme = useTheme()
  const enabledLyric = useSettingValue('desktopLyric.enable')
  const desktopLyricEnableRef = useRef<DesktopLyricEnableType>(null)
  const handlePress = () => {
    desktopLyricEnableRef.current?.setEnabled(!enabledLyric)
  }

  return (
    <>
      <Btn
        icon={enabledLyric ? 'lyric-on' : 'lyric-off'}
        color={enabledLyric ? theme['c-primary-font'] : undefined}
        onPress={handlePress}
        onLongPress={toggleLyricLock}
      />
      <DesktopLyricEnable ref={desktopLyricEnableRef} />
    </>
  )
}

export default memo(() => {
  const isHorizontalMode = useHorizontalMode()
  const { btnGap } = usePlayerBarMetrics()

  return (
    <View style={{ ...styles.content, gap: btnGap }}>
      { isHorizontalMode ? <PlayModeBtn /> : null }
      { isHorizontalMode ? <PlayPrevBtn /> : null }
      <TogglePlayBtn />
      <PlayNextBtn />
      { isHorizontalMode ? <LyricBtn /> : null }
    </View>
  )
})


const styles = createStyle({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
})
