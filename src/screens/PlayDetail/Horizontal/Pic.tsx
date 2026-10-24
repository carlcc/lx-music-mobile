import { memo, useEffect, useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import { useIsPlay, usePlayerMusicInfo } from '@/store/player/hook'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { createStyle } from '@/utils/tools'
import { marginLeft } from './constant'
import Image from '@/components/common/Image'
import { useSettingValue } from '@/store/setting/hook'
import VinylDisc from '@/components/car/VinylDisc'


/**
 * 播放页海报
 *
 * 尺寸不再靠"屏幕高度 × 系数"估算——那样在矮屏上算出来的方形边长
 * 会大于容器实际高度，被 overflow: hidden 截掉（海报显示不全）。
 * 改成：容器用 flex 占满剩余空间，再按实测的 min(宽, 高) 画正方形，
 * 保证任何时候都是完整且尽可能大的正方形。
 */
export default memo(() => {
  const musicInfo = usePlayerMusicInfo()
  const useVinyl = useSettingValue('car.vinyl')
  const isPlay = useIsPlay()
  const [pic, setPic] = useState(musicInfo.pic)
  const [box, setBox] = useState({ width: 0, height: 0 })

  // 封面实时跟随当前歌曲：不再等 componentDidAppear（播放页现在是常驻浮层，
  // 那个事件不会按预期触发），否则封面要等到动画结束才出现
  useEffect(() => {
    setPic(musicInfo.pic)
  }, [musicInfo.pic])

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout
    if (width == box.width && height == box.height) return
    setBox({ width, height })
  }

  const size = Math.max(0, Math.min(box.width, box.height))

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {
        size
          ? (
            // 黑胶时去掉方形容器阴影（阴影在圆形唱片上）
            <View style={{ ...styles.content, elevation: useVinyl ? 0 : 3 }}>
              {
                useVinyl
                  ? <VinylDisc
                      size={size}
                      pic={pic}
                      isPlay={isPlay}
                      nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic}
                    />
                  : <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={{
                    width: size,
                    height: size,
                    borderRadius: 2,
                  }} />
              }
            </View>
            )
          : null
      }
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    marginLeft,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    backgroundColor: 'rgba(0,0,0,0)',
    borderRadius: 4,
  },
})
