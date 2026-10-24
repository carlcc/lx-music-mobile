import { memo, useEffect, useRef, useState } from 'react'
import { Animated, Easing } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useWindowSize } from '@/utils/hooks'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import commonState from '@/store/common/state'
import PlayDetail from '@/screens/PlayDetail/Horizontal'
import { usePlayDetailVisible } from './playDetailState'

const DURATION = 300

/**
 * 车机播放页浮层：从右侧滑入 / 滑出（与之前 push 的动画一致）
 * 挂载一次后常驻，隐藏时只是把它移到屏幕右侧外面，组件内容与状态全部保留
 */
export default memo(() => {
  const theme = useTheme()
  const visible = usePlayDetailVisible()
  const { width } = useWindowSize()
  // 首次打开后才创建，之后一直保留
  const [mounted, setMounted] = useState(visible)
  const translateX = useRef(new Animated.Value(visible ? 0 : width)).current

  useEffect(() => {
    if (visible) setMounted(true)
  }, [visible])

  useEffect(() => {
    if (!width) return
    Animated.timing(translateX, {
      toValue: visible ? 0 : width,
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [visible, width, translateX])

  // 浮层常驻后播放页不会再经历 mount/unmount，这里按显隐维持屏幕常亮
  useEffect(() => {
    if (visible) screenkeepAwake()
    else screenUnkeepAwake()
  }, [visible])

  if (!mounted || !width) return null

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width,
        backgroundColor: theme['c-content-background'],
        transform: [{ translateX }],
      }}
    >
      <PlayDetail componentId={commonState.componentIds.home ?? ''} />
    </Animated.View>
  )
})
