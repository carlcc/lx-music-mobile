import { memo, useCallback } from 'react'
import { Platform, View } from 'react-native'

import Status from './Status'
import CarProgress from '@/components/car/CarProgress'
import { useProgress } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useBufferProgress } from '@/plugins/player'

/** 等宽字体 + 等宽数字 + 补零：宽度自适应但不会抖动，进度条长度稳定 */
export const MONO_FONT = Platform.OS == 'android' ? 'monospace' : 'Menlo'
export const fixTimeStr = (timeStr: string) => {
  if (!timeStr) return '--:--'
  const parts = timeStr.split(':')
  if (parts.length == 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
  return timeStr
}
export const timeStyle = {
  fontFamily: MONO_FONT,
  fontVariant: ['tabular-nums' as const],
  textAlign: 'center' as const,
}

const PlayTimeCurrent = ({ timeStr }: { timeStr: string }) => {
  const theme = useTheme()
  return <Text style={timeStyle} color={theme['c-font']}>{fixTimeStr(timeStr)}</Text>
}

const PlayTimeMax = memo(({ timeStr }: { timeStr: string }) => {
  const theme = useTheme()
  return <Text style={timeStyle} color={theme['c-font']}>{fixTimeStr(timeStr)}</Text>
})

export default () => {
  const theme = useTheme()
  const { maxPlayTimeStr, nowPlayTimeStr, progress, maxPlayTime } = useProgress()
  const buffered = useBufferProgress()
  const handleSeek = useCallback((time: number) => {
    global.app_event.setProgress(time)
  }, [])

  return (
    <View style={styles.container}>
      {/* 没有状态提示时不占位，把空间让给海报 */}
      <View style={styles.status}>
        <Status />
      </View>
      {/* 进度条左右显示时间，对齐 HTML 原型 */}
      <View style={styles.progressRow}>
        <PlayTimeCurrent timeStr={nowPlayTimeStr} />
        <View style={styles.progress}>
          <CarProgress progress={progress} duration={maxPlayTime} buffered={buffered} onSeek={handleSeek} />
        </View>
        <PlayTimeMax timeStr={maxPlayTimeStr} />
      </View>
      <View style={{ ...styles.divider, backgroundColor: theme['c-border-background'] }} />
    </View>
  )
}

const styles = createStyle({
  container: {
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  // 固定占一行：状态文字出现 / 消失时不再引起整块布局跳动。
  // （Status 无提示时返回 null，容器没有固定高度就会塌陷 → 拖动进度条时上面内容上下跳）
  status: {
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progress: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  // 分隔线：矮屏上这 10dp 不如留给海报
  divider: {
    height: 1,
    marginTop: 4,
    opacity: 0.5,
  },
})
