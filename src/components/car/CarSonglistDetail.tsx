import { memo, useEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'
import Text from '@/components/common/Text'
import MusicList, { type MusicListType } from '@/screens/SonglistDetail/MusicList'
import { ListInfoContext } from '@/screens/SonglistDetail/state'
import { type ListInfoItem } from '@/store/songlist/state'
import { useTheme } from '@/store/theme/hook'
import { carFontSize, useCarFontScale } from './constants'
import { createStyle } from '@/utils/tools'

/**
 * 车机内嵌的在线歌单详情
 * 顶栏只有一行（返回 + 缩略封面 + 标题 + 操作），简介放在列表顶部随内容一起滚动
 */
export default memo(({ info, componentId }: {
  info: ListInfoItem
  componentId: string
}) => {
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const musicListRef = useRef<MusicListType>(null)

  useEffect(() => {
    musicListRef.current?.loadList(info.source, info.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.source, info.id])

  // 简介放在列表头部：随歌曲列表一起滚动，不占固定高度
  const descHeader = useMemo(() => {
    if (!info.desc) return null
    return (
      <View style={styles.descBox}>
        <Text size={carFontSize(12.5, fontScale)} color={theme['c-font-label']}>{info.desc}</Text>
      </View>
    )
  }, [info.desc, theme, fontScale])

  return (
    <ListInfoContext.Provider value={info}>
      <View style={{ flex: 1 }}>
        <MusicList
          ref={musicListRef}
          componentId={componentId}
          hideHeader
          listHeaderComponent={descHeader}
        />
      </View>
    </ListInfoContext.Provider>
  )
})

const styles = createStyle({
  descBox: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
})
