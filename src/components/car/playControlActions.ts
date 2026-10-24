import { useSettingValue } from '@/store/setting/hook'
import settingState from '@/store/setting/state'
import { MUSIC_TOGGLE_MODE } from '@/config/constant'
import { updateSetting } from '@/core/common'
import { toggleDesktopLyricLock } from '@/core/desktopLyric'
import { toast } from '@/utils/tools'

/**
 * 播放控制按键的公共行为
 *
 * 底部播放条（车机）与播放详情页用的是同一套按键（播放模式 / 桌面歌词），
 * 行为统一放在这里，避免两处各写一份导致表现不一致。
 */

/** 循环模式：按队列顺序循环 → 按队列随机播放 → 单曲循环 */
export const PLAY_MODES = [
  { mode: MUSIC_TOGGLE_MODE.listLoop, icon: 'list-loop', label: '队列顺序循环' },
  { mode: MUSIC_TOGGLE_MODE.random, icon: 'list-random', label: '队列随机播放' },
  { mode: MUSIC_TOGGLE_MODE.singleLoop, icon: 'single-loop', label: '单曲循环' },
] as const

/** 当前播放模式（index < 0 表示设置里是未被包含的模式，此时按第一个处理） */
export const usePlayMode = () => {
  const togglePlayMethod = useSettingValue('player.togglePlayMethod')
  const currentIndex = PLAY_MODES.findIndex(item => item.mode == togglePlayMethod)
  return {
    currentIndex,
    current: currentIndex < 0 ? PLAY_MODES[0] : PLAY_MODES[currentIndex],
  }
}

/** 切换到下一个播放模式 */
export const togglePlayMode = () => {
  const currentIndex = PLAY_MODES.findIndex(item => item.mode == settingState.setting['player.togglePlayMethod'])
  const next = PLAY_MODES[(currentIndex + 1) % PLAY_MODES.length] ?? PLAY_MODES[0]
  updateSetting({ 'player.togglePlayMethod': next.mode })
  toast(next.label)
}

/** 桌面歌词锁定 / 解锁 */
export const toggleLyricLock = () => {
  const isLock = !settingState.setting['desktopLyric.isLock']
  void toggleDesktopLyricLock(isLock).then(() => {
    updateSetting({ 'desktopLyric.isLock': isLock })
  })
}
