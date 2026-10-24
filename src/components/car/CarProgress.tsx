import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, View, type GestureResponderEvent } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** 滑块尺寸：静止 / 拖动中 */
const KNOB_SIZE = 16
const KNOB_ACTIVE_SIZE = 20
/** 松手后等待播放进度追上来的最长时间，超过就直接回到真实进度（避免一直卡在拖动值） */
const PENDING_MAX_WAIT = 1200
/** 认为「播放进度已追上拖动位置」的容差（比例） */
const PENDING_TOLERANCE = 0.02

/**
 * 车机进度条：圆角粗条 + 圆形滑块，可点击 / 拖动跳转
 *
 * 坐标必须用 pageX（相对窗口）而不是 nativeEvent.locationX：
 * locationX 是相对「手指下方那一层视图」的，手指落在滑块或轨道上时基准会变，
 * 算出来的位置就会跳（表现为滑块不跟手）。
 *
 * 拖动行为（对齐主流播放器）：
 * - 按下即进入拖动态，滑块跟手；拖动过程中只更新显示，不发起 seek
 *   （避免与播放器异步回传的进度打架）
 * - 松手才真正 seek 一次
 * - 松手后继续显示拖动值，直到播放进度追上来（或超时）才交还真实进度，不会来回跳
 * - 轨道左右各内缩半个滑块，0% 与 100% 都能拖到且滑块完整可见
 *
 * 注意：progress / buffered 是 0~1 的比例，duration 仅在 seek 时换算成秒
 */
export default memo(({ progress, buffered = 0, duration, onSeek }: {
  progress: number
  buffered?: number
  duration: number
  onSeek?: (time: number) => void
}) => {
  const theme = useTheme()
  const containerRef = useRef<View>(null)
  // 用 ref 存尺寸：不进入渲染，避免宽度变化导致回调重建、把手势打断
  const widthRef = useRef(0)
  const pageXRef = useRef(0)
  // 拖动中（含松手后等待进度回传的阶段）：这段时间一律显示拖动值
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [dragPercent, setDragPercent] = useState(0)
  // 松手后等待进度追上来的阶段
  const [pending, setPending] = useState(false)
  const pendingStartRef = useRef(0)
  const targetRef = useRef(0)

  const canSeek = !!onSeek
  const halfKnob = KNOB_ACTIVE_SIZE / 2

  const handleLayout = useCallback(() => {
    containerRef.current?.measure((_x, _y, width, _height, pageX) => {
      widthRef.current = width
      pageXRef.current = pageX
    })
  }, [])

  const percentFromEvent = useCallback((evt: GestureResponderEvent) => {
    const usable = Math.max(1, widthRef.current - KNOB_ACTIVE_SIZE)
    // 轨道内缩了半个滑块，所以要把按下点减掉这半个滑块再算比例
    const x = evt.nativeEvent.pageX - pageXRef.current - halfKnob
    return clamp01(x / usable) * 100
  }, [halfKnob])

  const endDrag = useCallback(() => {
    draggingRef.current = false
    setDragging(false)
    setPending(false)
  }, [])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => canSeek,
    onMoveShouldSetPanResponder: () => canSeek,
    // 拖动中不被父容器（列表 / 滚动视图）抢走手势
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      if (!canSeek) return
      draggingRef.current = true
      setPending(false)
      setDragPercent(percentFromEvent(evt))
      setDragging(true)
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      if (!canSeek || !draggingRef.current) return
      setDragPercent(percentFromEvent(evt))
    },
    onPanResponderRelease: (evt: GestureResponderEvent) => {
      if (!canSeek || !draggingRef.current) return
      const percent = percentFromEvent(evt)
      setDragPercent(percent)
      const target = percent / 100
      targetRef.current = target
      pendingStartRef.current = Date.now()
      setPending(true)
      onSeek?.(target * duration)
    },
    onPanResponderTerminate: endDrag,
  }), [canSeek, duration, endDrag, onSeek, percentFromEvent])

  // 松手后：等进度追上（或超时）再退出拖动态。
  // 超时判断用「松手时记下的时间戳」，不是每次 progress 变化就重置定时器 ——
  // 否则播放中进度每秒都在变，会永远等不到超时。
  useEffect(() => {
    if (!pending) return
    const caughtUp = Math.abs(progress - targetRef.current) <= PENDING_TOLERANCE
    const timeout = Date.now() - pendingStartRef.current > PENDING_MAX_WAIT
    if (caughtUp || timeout) {
      endDrag()
      return
    }
    const timer = setTimeout(() => { endDrag() }, 150)
    return () => { clearTimeout(timer) }
  }, [progress, pending, endDrag])

  const percent = dragging ? dragPercent : clamp01(progress) * 100
  const bufferedPercent = clamp01(buffered) * 100
  const knobSize = dragging ? KNOB_ACTIVE_SIZE : KNOB_SIZE

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={handleLayout}
      {...(canSeek ? panResponder.panHandlers : null)}
    >
      {/* 子视图一律不吃触摸，保证手势始终由容器接管 */}
      <View
        pointerEvents="none"
        style={{ ...styles.track, marginHorizontal: halfKnob, backgroundColor: theme['c-primary-background'] }}
      >
        <View style={{ ...styles.bar, width: `${bufferedPercent}%`, backgroundColor: theme['c-primary-background-hover'] }} />
        <View style={{ ...styles.bar, width: `${percent}%`, backgroundColor: theme['c-primary'] }} />
        <View style={{
          ...styles.knob,
          left: `${percent}%`,
          width: knobSize,
          height: knobSize,
          borderRadius: knobSize / 2,
          marginLeft: -knobSize / 2,
          marginTop: -knobSize / 2,
          backgroundColor: theme['c-primary-font'],
        }} />
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
  },
  knob: {
    position: 'absolute',
  },
})
