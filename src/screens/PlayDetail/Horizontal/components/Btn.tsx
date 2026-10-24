import { TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useCarMetrics } from '@/components/car/constants'

export const BTN_ICON_SIZE = 22

/**
 * 播放页侧边/顶部按钮：圆形描边 + 主题面板底色 + 主文字色图标
 *
 * 尺寸随屏幕高度自适应（useCarMetrics().moreBtnSize），
 * 与 MoreBtn/Btn 是同一个组件，避免两处尺寸不一致。
 */
export default ({ icon, size, color, onPress, onLongPress }: {
  icon: string
  size?: number
  color?: string
  onPress: () => void
  onLongPress?: () => void
}) => {
  const theme = useTheme()
  const { moreBtnSize } = useCarMetrics()

  return (
    <TouchableOpacity style={{
      ...styles.cotrolBtn,
      width: moreBtnSize,
      height: moreBtnSize,
      borderRadius: moreBtnSize / 2,
      borderWidth: 1,
      borderColor: theme['c-border-background'],
      backgroundColor: theme['c-primary-background'],
    }} activeOpacity={0.5} onPress={onPress} onLongPress={onLongPress}>
      <Icon name={icon} color={color ?? theme['c-font']} rawSize={size ?? BTN_ICON_SIZE} />
    </TouchableOpacity>
  )
}

const styles = createStyle({
  cotrolBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
