import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { CAR, carFontSize, useCarFontScale } from './constants'

export interface CarFilterInfo {
  sourceName: string
  sortName: string
  tagName: string
}

/**
 * 车机歌单筛选状态条：只显示"当前条件 + 筛选入口"，过滤器本体在 popup 里
 */
export default memo(({ info, total, onOpenFilter }: {
  info: CarFilterInfo
  total: number
  onOpenFilter: () => void
}) => {
  const theme = useTheme()
  const fontScale = useCarFontScale()

  return (
    <View style={styles.container}>
      <Text style={styles.count} size={carFontSize(12.5, fontScale)} color={theme['c-font-label']}>共 {total} 个歌单</Text>
      <View style={styles.tokens}>
        {info.sourceName ? <Token text={info.sourceName} theme={theme} fontScale={fontScale} /> : null}
        {info.sortName ? <Token text={info.sortName} theme={theme} fontScale={fontScale} /> : null}
        {info.tagName ? <Token text={info.tagName} theme={theme} fontScale={fontScale} /> : null}
      </View>
      <TouchableOpacity style={styles.filter} activeOpacity={0.6} onPress={onOpenFilter}>
        <Icon name="slider" size={14} color={theme['c-font-label']} rawSize={14} />
        <Text style={styles.filterText} size={carFontSize(13, fontScale)} color={theme['c-font-label']}>筛选</Text>
      </TouchableOpacity>
    </View>
  )
})

type Theme = ReturnType<typeof useTheme>

const Token = ({ text, theme, fontScale }: { text: string, theme: Theme, fontScale: number }) => (
  <View style={{ ...styles.token, borderColor: theme['c-border-background'] }}>
    <Text size={carFontSize(12.5, fontScale)} color={theme['c-primary-font']} numberOfLines={1}>{text}</Text>
  </View>
)

const styles = createStyle({
  container: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CAR.padding,
    gap: 12,
  },
  count: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tokens: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  token: {
    height: 34,
    maxWidth: 160,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 与同一行的条件按钮（token）等高，更整洁也省竖向空间
  filter: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(127, 127, 127, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    gap: 6,
  },
  filterText: {
    paddingLeft: 2,
  },
})
