import { memo } from 'react'
import { View, type ViewStyle } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { CAR } from './constants'

/**
 * 车机卡片容器：用卡片代替分割线，界面更灵动
 */
export default memo(({ children, style }: {
  children: React.ReactNode
  style?: ViewStyle
}) => {
  const theme = useTheme()
  return (
    <View style={{
      ...styles.card,
      backgroundColor: theme['c-primary-background'],
      borderColor: theme['c-border-background'],
      ...style,
    }}>
      {children}
    </View>
  )
})

const styles = createStyle({
  card: {
    borderRadius: CAR.radius,
    borderWidth: 1,
    overflow: 'hidden',
  },
})
