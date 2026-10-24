import { memo, useRef } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import DesktopLyricEnable, { type DesktopLyricEnableType } from '@/components/DesktopLyricEnable'
import { createStyle } from '@/utils/tools'
import { useIsPlay } from '@/store/player/hook'
import { useCarMetrics } from '@/components/car/constants'
import { togglePlayMode, toggleLyricLock, usePlayMode } from '@/components/car/playControlActions'

// 基准尺寸（大屏车机）：次按钮 64、主按钮 84、间距 22；矮屏按 useCarMetrics 的 scale 等比缩小
const BASE_ICON_SIZE = 26
const BASE_MAIN_ICON_SIZE = 34

const CircleBtn = ({ size, icon, iconSize, active, onPress, onLongPress }: {
  size: number
  icon: string
  iconSize: number
  active?: boolean
  onPress: () => void
  onLongPress?: () => void
}) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      style={{
        ...styles.btn,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: active ? theme['c-primary-font'] : theme['c-border-background'],
        backgroundColor: active ? theme['c-primary-background-hover'] : theme['c-primary-background'],
      }}
      activeOpacity={0.5}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Icon name={icon} color={active ? theme['c-primary-font'] : theme['c-font']} rawSize={iconSize} />
    </TouchableOpacity>
  )
}

const MainBtn = ({ size, iconSize }: { size: number, iconSize: number }) => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  return (
    <TouchableOpacity
      style={{
        ...styles.btn,
        width: size,
        height: size,
        borderRadius: size / 2,
        // 用主题里配套的"按钮选中态"组合，保证底色与图标色的对比度
        backgroundColor: theme['c-button-background-selected'],
      }}
      activeOpacity={0.5}
      onPress={togglePlay}
    >
      <Icon name={isPlay ? 'pause' : 'play'} color={theme['c-button-font-selected']} rawSize={iconSize} />
    </TouchableOpacity>
  )
}

/** 播放模式：三种循环模式轮流切换，只有一个按钮 */
const PlayModeBtn = () => {
  const { current, currentIndex } = usePlayMode()
  const { controlBtnSize, scale } = useCarMetrics()
  return <CircleBtn size={controlBtnSize} icon={current.icon} iconSize={Math.round(BASE_ICON_SIZE * scale)} active={currentIndex > 0} onPress={togglePlayMode} />
}

/** 桌面歌词开关（长按锁定/解锁） */
const LyricBtn = () => {
  const enabledLyric = useSettingValue('desktopLyric.enable')
  const desktopLyricEnableRef = useRef<DesktopLyricEnableType>(null)
  const handlePress = () => {
    desktopLyricEnableRef.current?.setEnabled(!enabledLyric)
  }
  const { controlBtnSize, scale } = useCarMetrics()
  return (
    <>
      <CircleBtn
        size={controlBtnSize}
        icon={enabledLyric ? 'lyric-on' : 'lyric-off'}
        iconSize={Math.round(BASE_ICON_SIZE * scale)}
        active={enabledLyric}
        onPress={handlePress}
        onLongPress={toggleLyricLock}
      />
      <DesktopLyricEnable ref={desktopLyricEnableRef} />
    </>
  )
}

export default memo(() => {
  const { scale, controlBtnSize, mainControlBtnSize, controlBtnGap, controlBtnPaddingV } = useCarMetrics()
  const iconSize = Math.round(BASE_ICON_SIZE * scale)
  const mainIconSize = Math.round(BASE_MAIN_ICON_SIZE * scale)

  return (
    <View style={{ ...styles.content, gap: controlBtnGap, paddingVertical: controlBtnPaddingV }}>
      <PlayModeBtn />
      <CircleBtn size={controlBtnSize} icon="prevMusic" iconSize={iconSize} onPress={() => { void playPrev() }} />
      <MainBtn size={mainControlBtnSize} iconSize={mainIconSize} />
      <CircleBtn size={controlBtnSize} icon="nextMusic" iconSize={iconSize} onPress={() => { void playNext() }} />
      <LyricBtn />
    </View>
  )
})

const styles = createStyle({
  content: {
    flexGrow: 1,
    flexShrink: 0,
    flexDirection: 'row',
    // gap 由 useCarMetrics().controlBtnGap 动态给出（矮屏收窄）
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
