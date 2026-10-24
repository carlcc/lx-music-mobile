import { memo } from 'react'
import { View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { createStyle } from '@/utils/tools'
import { useCarMetrics } from '@/components/car/constants'

/**
 * 车机播放页：唱片下方的歌曲信息（对齐 HTML 原型的标题区）
 */
export default memo(() => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()
  const info = musicInfo as unknown as { singer?: string, meta?: { albumName?: string }, source?: string }
  const sub = [info.singer, info.meta?.albumName, info.source].filter(Boolean).join(' · ')
  const { playerTitleSize, playerSubSize } = useCarMetrics()

  return (
    <View style={styles.container}>
      <Text numberOfLines={1} size={playerTitleSize} color={theme['c-font']}>{musicInfo.name}</Text>
      <Text style={styles.sub} numberOfLines={1} size={playerSubSize} color={theme['c-font']}>{sub}</Text>
    </View>
  )
})

const styles = createStyle({
  container: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  sub: {
    paddingTop: 4,
  },
})
