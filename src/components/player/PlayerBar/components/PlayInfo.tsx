import { memo, useCallback, useState } from 'react'
import { Platform, View, StyleSheet } from 'react-native'

import Progress, { ProgressPlain } from '@/components/player/Progress'
import Status from './Status'
import { useProgress } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { COMPONENT_IDS } from '@/config/constant'
import { usePageVisible } from '@/store/common/hook'
import { scaleSizeH, scaleSizeW, scaleSizeWR } from '@/utils/pixelRatio'
import { useBufferProgress } from '@/plugins/player'
import { useSettingValue } from '@/store/setting/hook'
import { useHorizontalMode } from '@/utils/hooks'
import CarProgress from '@/components/car/CarProgress'

const FONT_SIZE = 13
const PADDING_TOP_RAW = 1.8
const PADDING_TOP = Math.round(scaleSizeWR(PADDING_TOP_RAW))
const MARGIN_TOP = Math.round(scaleSizeH(2))
const PADDING_TOP_PROGRESS = PADDING_TOP + MARGIN_TOP

/** 等宽字体 + 等宽数字 + 补零：宽度自适应但不会抖动，进度条长度稳定 */
const MONO_FONT = Platform.OS == 'android' ? 'monospace' : 'Menlo'
const fixTimeStr = (timeStr: string) => {
  if (!timeStr) return '--:--'
  const parts = timeStr.split(':')
  if (parts.length == 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
  return timeStr
}
const timeStyle = {
  fontFamily: MONO_FONT,
  fontVariant: ['tabular-nums' as const],
  textAlign: 'center' as const,
}

const PlayTimeCurrent = ({ timeStr }: { timeStr: string }) => {
  const theme = useTheme()
  // console.log(timeStr)
  return <Text style={timeStyle} size={FONT_SIZE} color={theme['c-font']}>{fixTimeStr(timeStr)}</Text>
}

const PlayTimeMax = memo(({ timeStr }: { timeStr: string }) => {
  const theme = useTheme()
  return <Text style={timeStyle} size={FONT_SIZE} color={theme['c-font']}>{fixTimeStr(timeStr)}</Text>
})

export default ({ isHome }: { isHome: boolean }) => {
  const theme = useTheme()
  const [autoUpdate, setAutoUpdate] = useState(true)
  const { maxPlayTimeStr, nowPlayTimeStr, progress, maxPlayTime } = useProgress(autoUpdate)
  const buffered = useBufferProgress()
  const allowProgressBarSeek = useSettingValue('common.allowProgressBarSeek')
  const isHorizontalMode = useHorizontalMode()

  usePageVisible([COMPONENT_IDS.home], useCallback((visible) => {
    if (isHome) setAutoUpdate(visible)
  }, [isHome]))

  const handleSeek = useCallback((time: number) => {
    global.app_event.setProgress(time)
  }, [])

  // 车机横屏：与播放页同一套圆角进度条，时间 + 进度 + 时间 一行（对齐 HTML 原型）
  if (isHorizontalMode) {
    return (
      <View style={stylesRaw.carContainer}>
        <PlayTimeCurrent timeStr={nowPlayTimeStr} />
        <View style={stylesRaw.carProgress}>
          <CarProgress
            progress={progress}
            duration={maxPlayTime}
            buffered={buffered}
            onSeek={allowProgressBarSeek ? handleSeek : undefined}
          />
        </View>
        <PlayTimeMax timeStr={maxPlayTimeStr} />
      </View>
    )
  }

  return (
    <View style={stylesRaw.container}>
      {/* <MusicName /> */}
      <View style={styles.status}>
        <Status autoUpdate={autoUpdate} />
      </View>
      <View style={{ flexGrow: 0, flexShrink: 0, flexDirection: 'row', alignItems: 'flex-start' }} >
        <PlayTimeCurrent timeStr={nowPlayTimeStr} />
        <Text size={FONT_SIZE} color={theme['c-font']}> / </Text>
        <PlayTimeMax timeStr={maxPlayTimeStr} />
      </View>
      <View style={[StyleSheet.absoluteFill, stylesRaw.progress]}>
        {
          allowProgressBarSeek
            ? <Progress progress={progress} duration={maxPlayTime} buffered={buffered} paddingTop={PADDING_TOP_PROGRESS} />
            : <ProgressPlain progress={progress} duration={maxPlayTime} buffered={buffered} paddingTop={PADDING_TOP_PROGRESS} />
        }
      </View>
    </View>
  )
}


const styles = createStyle({
  // container: {
  //   // height: 16,
  //   maxHeight: 32,
  //   flexGrow: 1,
  //   flexShrink: 0,
  //   // flexDirection: 'column',
  //   // justifyContent: 'center',
  //   // alignItems: 'center',
  //   // marginBottom: -1,
  //   // backgroundColor: '#ccc',
  //   // overflow: 'hidden',
  //   // height:
  //   // position: 'absolute',
  //   // width: '100%',
  //   // top: 0,
  //   paddingTop: PADDING_TOP_RAW,
  //   paddingHorizontal: 3,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  // },
  status: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 5,
    // backgroundColor: '#ccc',
  },
})

const stylesRaw = StyleSheet.create({
  container: {
    // height: 16,
    maxHeight: scaleSizeH(32),
    flexGrow: 1,
    flexShrink: 0,
    paddingTop: PADDING_TOP,
    paddingHorizontal: scaleSizeW(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progress: {
    // paddingVertical: 2,
    marginBottom: MARGIN_TOP,
    zIndex: 100,
  },
  carContainer: {
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  carProgress: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
})
