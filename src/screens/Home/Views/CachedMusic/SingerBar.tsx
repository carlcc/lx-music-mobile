import { memo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { CAR, carFontSize, useCarFontScale } from '@/components/car/constants'
import type { CacheFilterOption } from '@/core/auditionCache'

/**
 * 左栏歌手筛选：全部置顶，每行歌手名 + 歌曲数，选中高亮
 * 后续要加「专辑 / 音质」维度时，复用同一个组件再传一组 options 即可
 *
 * active 为 null 表示「全部」，'' 表示「未知歌手」——两者是不同的值，不会同时高亮
 */
export default memo(({ options, total, active, onChange }: {
  options: CacheFilterOption[]
  /** 全部歌曲数：多歌手会让各歌手计数之和大于实际歌曲数，所以这里直接用总数 */
  total: number
  active: string | null
  onChange: (value: string | null) => void
}) => {
  const theme = useTheme()
  const fontScale = useCarFontScale()

  return (
    <View style={{ ...styles.container, borderRightColor: theme['c-border-background'] }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={{
            ...styles.item,
            borderColor: active == null ? theme['c-primary-font'] : 'transparent',
            backgroundColor: active == null ? 'rgba(127, 127, 127, 0.14)' : 'transparent',
          }}
          activeOpacity={0.6}
          onPress={() => { onChange(null) }}
        >
          <Text size={carFontSize(13, fontScale)} color={theme['c-font']} numberOfLines={1} style={styles.name}>全部</Text>
          <Text size={carFontSize(12, fontScale)} color={theme['c-font-label']}>{total}</Text>
        </TouchableOpacity>
        {options.map(option => (
          <TouchableOpacity
            key={option.value || '__unknown__'}
            style={{
              ...styles.item,
              borderColor: active == option.value ? theme['c-primary-font'] : 'transparent',
              backgroundColor: active == option.value ? 'rgba(127, 127, 127, 0.14)' : 'transparent',
            }}
            activeOpacity={0.6}
            onPress={() => { onChange(option.value) }}
          >
            <Text size={carFontSize(13, fontScale)} color={theme['c-font']} numberOfLines={1} style={styles.name}>
              {option.value || '未知歌手'}
            </Text>
            <Text size={carFontSize(12, fontScale)} color={theme['c-font-label']}>{option.count}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
})

const styles = createStyle({
  container: {
    width: 200,
    flexShrink: 0,
    borderRightWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: CAR.radius,
    borderWidth: 1,
    marginBottom: 2,
  },
  name: {
    flex: 1,
    flexShrink: 1,
  },
})
