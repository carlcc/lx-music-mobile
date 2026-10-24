import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { showAddMusicPopover } from './popup'
import { ROW_ACTION_BTN_RADIUS, useCarMetrics } from './constants'
import { useShowAddToPlaylist } from './rowActionsConfig'

/**
 * 车机列表行内动作：一次点击即可「加入歌单」；
 * 播放由双击列表行触发（车机防误触），⋯ 保留长按菜单里的低频操作
 */
export default memo(({ musicInfo, onMore, showAdd }: {
  musicInfo: LX.Music.MusicInfoOnline
  onMore: () => void
  /** 是否显示「加入歌单」按钮（空间紧张的列表可关掉） */
  showAdd?: boolean
}) => {
  const theme = useTheme()
  // 与播放队列里的行内按钮共用同一套尺寸 / 圆角
  const { rowActionBtnSize } = useCarMetrics()
  // 显式传的 showAdd 优先，否则看所在列表的 context 配置（默认显示）
  const contextShowAdd = useShowAddToPlaylist()
  const isShowAdd = showAdd ?? contextShowAdd

  const handleAdd = () => {
    showAddMusicPopover(musicInfo)
  }

  const btnStyle = {
    ...styles.btn,
    width: rowActionBtnSize,
    height: rowActionBtnSize,
    borderRadius: ROW_ACTION_BTN_RADIUS,
  }

  // 车机上"双击列表行"才播放，行内不提供播放按钮（避免误触）
  return (
    <View style={styles.container}>
      {
        isShowAdd
          ? (
            <TouchableOpacity style={btnStyle} activeOpacity={0.6} onPress={handleAdd}>
              <Icon name="add-music" size={18} color={theme['c-font-label']} rawSize={18} />
            </TouchableOpacity>
            )
          : null
      }
      <TouchableOpacity style={btnStyle} activeOpacity={0.6} onPress={onMore}>
        <Icon name="dots-vertical" size={16} color={theme['c-font-label']} rawSize={16} />
      </TouchableOpacity>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    borderRadius: ROW_ACTION_BTN_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127, 127, 127, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
})
