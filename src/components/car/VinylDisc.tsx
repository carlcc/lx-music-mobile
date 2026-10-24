import { memo, useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Image from '@/components/common/Image'

/** 唱片纹槽（相对直径） */
const RINGS = [0.97, 0.94, 0.91, 0.88]

/** 唱片标签（封面）占直径比例，海报尽量大，纯黑胶外圈收窄 */
const LABEL_RATIO = 0.8

/** 转满一圈所需的时间 */
const ROTATION_DURATION = 16000

/**
 * 旋转进度值的插值范围
 *
 * 每次播放都从「上次停住的角度」动画到「该角度 + 360」，所以值的范围是 [0, 720)，
 * 用一张固定的插值表做 1:1 的角度映射即可。
 */
const VALUE_MAX = 720

/**
 * 黑胶唱片：
 * - 播放时匀速旋转，暂停停在当前角度（不回弹）
 * - 唱片标签使用当前歌曲封面（大图）
 * - 高光层不随盘转
 */
export default memo(({ size, pic, isPlay, nativeID }: {
  size: number
  pic?: string | number | null
  isPlay: boolean
  nativeID?: string
}) => {
  const rotate = useRef(new Animated.Value(0)).current
  const loopRef = useRef<Animated.CompositeAnimation | null>(null)
  /** 暂停时唱片停住的角度（0 ~ 360），下次播放从这里接着转 */
  const angleRef = useRef(0)
  /** 本次连续旋转的起始时间 */
  const startTimeRef = useRef(0)

  useEffect(() => {
    if (isPlay) {
      loopRef.current?.stop()

      // 每次启动动画前，都要先把进度值摆到「上次停住的角度」，再动画到「该角度 + 360」。
      // Animated.timing 是以启动那一刻的值为起点的，loop 的下一轮同样回到那个值：
      // 一旦上次停在 0.62，重启后唱片就永远只在 0.62 ~ 1 之间来回跑
      // —— 表现就是「只转一点小角度就跳回某个起点」，停在越接近 1 的位置转得越少甚至完全不转。
      // 切歌必然经历一次「暂停 → 播放」，所以这个问题切歌时最容易触发。
      const startAngle = angleRef.current
      rotate.setValue(startAngle)
      startTimeRef.current = Date.now()
      loopRef.current = Animated.loop(
        Animated.timing(rotate, {
          toValue: startAngle + 360,
          duration: ROTATION_DURATION,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      )
      loopRef.current.start()
    } else if (loopRef.current) {
      loopRef.current.stop()
      loopRef.current = null
      // 记下当前角度（对整圈取余，保证下次的起点仍落在 0 ~ 360）
      angleRef.current = (angleRef.current + (Date.now() - startTimeRef.current) * 360 / ROTATION_DURATION) % 360
    }
    return () => {
      loopRef.current?.stop()
      loopRef.current = null
    }
  }, [isPlay, rotate])

  const spin = rotate.interpolate({
    inputRange: [0, VALUE_MAX],
    outputRange: ['0deg', `${VALUE_MAX}deg`],
  })
  const labelSize = size * LABEL_RATIO

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} nativeID={nativeID}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#101010',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transform: [{ rotate: spin }],
          // 唱片落地阴影
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {RINGS.map(r => (
          <View key={r} style={{
            position: 'absolute',
            width: size * r,
            height: size * r,
            borderRadius: (size * r) / 2,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.055)',
          }} />
        ))}
        {/* 唱片标签 = 当前歌曲封面 */}
        <View style={{
          width: labelSize,
          height: labelSize,
          borderRadius: labelSize / 2,
          overflow: 'hidden',
        }}>
          <Image url={pic} style={{ width: '100%', height: '100%' }} />
        </View>
      </Animated.View>
      {/* 高光层（不随盘转） */}
      <View style={{
        position: 'absolute',
        width: size * 0.98,
        height: size * 0.49,
        borderTopLeftRadius: size / 2,
        borderTopRightRadius: size / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
      }} />
    </View>
  )
})
