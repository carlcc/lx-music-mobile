import { memo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useSourceNames } from '@/store/common/hook'
import { createStyle } from '@/utils/tools'
import type { SearchType } from '@/store/search/state'
import { CAR, carFontSize, useCarFontScale } from './constants'

const TYPES: Array<{ id: SearchType, name: string }> = [
  { id: 'music', name: '歌曲' },
  { id: 'songlist', name: '歌单' },
]

export interface CarSearchHeaderInfo {
  searchType: SearchType
  source: LX.OnlineSource | 'all'
  sources: Array<LX.OnlineSource | 'all'>
}

interface CarSearchHeaderProps {
  info: CarSearchHeaderInfo
  onTypeChange: (type: SearchType) => void
  onSourceChange: (source: LX.OnlineSource | 'all') => void
  /** 收起搜索建议浮层（切类型 / 切音源时调用） */
  onHidePanel?: () => void
}

/**
 * 车机搜索页顶部：搜索类型（歌曲 / 歌单）+ 音源
 *
 * 搜索框已经统一到顶栏（CarHeader 的 SearchInput），这里不再重复。
 */
function CarSearchHeader({ info, onTypeChange, onSourceChange, onHidePanel }: CarSearchHeaderProps) {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const sourceNames = useSourceNames()

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.tabs}>
          {TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={{
                ...styles.tab,
                borderColor: theme['c-border-background'],
                backgroundColor: theme['c-primary-background'],
                ...(info.searchType == type.id ? { ...styles.tabActive, borderColor: theme['c-primary-font'] } : null),
              }}
              activeOpacity={0.6}
              onPress={() => {
                onHidePanel?.()
                onTypeChange(type.id)
              }}
            >
              <Text size={carFontSize(13.5, fontScale)} color={info.searchType == type.id ? theme['c-primary-font'] : theme['c-font']}>{type.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView style={styles.sources} horizontal showsHorizontalScrollIndicator={false}>
          {info.sources.map(source => (
            <TouchableOpacity
              key={source}
              style={{
                ...styles.source,
                borderColor: theme['c-border-background'],
                backgroundColor: theme['c-primary-background'],
                ...(info.source == source ? { ...styles.tabActive, borderColor: theme['c-primary-font'] } : null),
              }}
              activeOpacity={0.6}
              onPress={() => {
                onHidePanel?.()
                onSourceChange(source)
              }}
            >
              <Text size={carFontSize(12.5, fontScale)} color={info.source == source ? theme['c-primary-font'] : theme['c-font']}>{source == 'all' ? '全部音源' : (sourceNames[source] ?? source)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

export default memo(CarSearchHeader)

const styles = createStyle({
  container: {
    paddingHorizontal: CAR.padding,
    paddingTop: 8,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
  },
  tab: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  sources: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  source: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
})
