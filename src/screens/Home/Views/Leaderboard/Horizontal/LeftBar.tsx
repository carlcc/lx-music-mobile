import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useSourceNames } from '@/store/common/hook'
import boardState, { type BoardItem } from '@/store/leaderboard/state'
import { getBoardsList } from '@/core/leaderboard'
import { carFontSize, useCarFontScale, useCarMetrics } from '@/components/car/constants'

export interface LeftBarProps {
  onChangeList: (source: LX.OnlineSource, id: string, name?: string) => void
}

export interface LeftBarType {
  setBound: (source: LX.OnlineSource, id: string) => void
}

/**
 * 车机排行榜左列：顶部固定音源选择器，下面只显示该音源的榜单
 * 注：BoardItem 只有 id / name / bangid，因此不显示封面、更新时间、Top3
 */
export default forwardRef<LeftBarType, LeftBarProps>(({ onChangeList }, ref) => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const sourceNames = useSourceNames()
  const { rowHeight } = useCarMetrics()
  // 榜单名是单行文本，行高可以比歌曲列表更紧凑
  const itemHeight = Math.max(34, rowHeight - 18)
  const [source, setSource] = useState<LX.OnlineSource>(boardState.sources[0] ?? 'kw')
  const [list, setList] = useState<BoardItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  const loadList = useCallback((targetSource: LX.OnlineSource, selectId?: string) => {
    void getBoardsList(targetSource).then(boards => {
      setList(boards ?? [])
      if (selectId) {
        setSelectedId(selectId)
        return
      }
      const id = boards?.[0]?.id ?? ''
      setSelectedId(id)
      if (id) onChangeList(targetSource, id, boards[0].name)
    }).catch(() => {})
  }, [onChangeList])

  useEffect(() => {
    loadList(source)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    setBound(targetSource, id) {
      setSource(targetSource)
      loadList(targetSource, id)
    },
  }), [loadList])

  const handleSourceChange = (targetSource: LX.OnlineSource) => {
    if (targetSource == source) return
    setSource(targetSource)
    loadList(targetSource)
  }

  const handlePress = (id: string, name: string) => {
    setSelectedId(id)
    onChangeList(source, id, name)
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.sources} horizontal showsHorizontalScrollIndicator={false}>
        {boardState.sources.map(item => (
          <TouchableOpacity
            key={item}
            style={{
              ...styles.source,
              ...(item == source ? { ...styles.sourceActive, borderColor: theme['c-primary-font'] } : null),
            }}
            activeOpacity={0.6}
            onPress={() => { handleSourceChange(item) }}
          >
            <Text size={carFontSize(12.5, fontScale)} color={item == source ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>{sourceNames[item] ?? item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.list}>
        {list.map(item => {
          const active = selectedId == item.id
          return (
            <TouchableOpacity
              key={item.id}
              style={{
                ...styles.item,
                height: itemHeight,
                backgroundColor: active ? theme['c-primary-background-hover'] : 'rgba(0,0,0,0)',
              }}
              activeOpacity={0.6}
              onPress={() => { handlePress(item.id, item.name) }}
            >
              <Text size={carFontSize(14, fontScale)} color={active ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'column',
    flex: 1,
  },
  sources: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  source: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(127, 127, 127, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sourceActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  list: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 10,
  },
  item: {
    paddingHorizontal: 14,
    borderRadius: 10,
    marginHorizontal: 6,
    justifyContent: 'center',
  },
})
