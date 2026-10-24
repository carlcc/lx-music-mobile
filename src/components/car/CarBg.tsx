import { memo } from 'react'
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import ImageBackground from '@/components/common/ImageBackground'
import { useTheme } from '@/store/theme/hook'
import { useWindowSize } from '@/utils/hooks'
import { useBgPic } from '@/store/common/hook'
import { useSettingValue } from '@/store/setting/hook'
import { defaultHeaders } from '@/components/common/Image'
import { BgImageContext } from '@/components/common/BgImageContext'

/**
 * 车机主题背景：主题壁纸 / 当前歌曲封面 + 模糊 + 玻璃层 + 内容底纹
 *
 * 背景图的亮度是随机的，无法保证与主题色一致，如果文字直接压在半透明图片上，
 * 遇到"亮底 + 亮字"或"暗底 + 暗字"就会完全看不清。
 * 因此这里做两层处理：
 *   1. 背景遮罩（car.bgDim）：整体压暗/压亮，保留壁纸观感
 *   2. 内容底纹（car.contentScrim）：在"承载文字的内容层"再铺一层主题底色，
 *      让文字实际落在一个接近主题底色的平面上，对比度由主题保证
 * 两层叠加后壁纸仍有可观可见度，同时任意图片下文字都清晰。
 *
 * 规则与横屏页面（PageContent）完全一致，弹窗卡片也能单独使用：
 * 传入带尺寸与圆角的 style，背景会被裁剪在卡片内（组件内部已 overflow: hidden）
 */
export default memo(({ style, children, onLayout }: {
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
  onLayout?: (event: LayoutChangeEvent) => void
}) => {
  const theme = useTheme()
  const windowSize = useWindowSize()
  const pic = useBgPic()
  const carBgBlur = useSettingValue('car.bgBlur')
  const carBgGlass = useSettingValue('car.bgGlass')
  const carBgBlurRadius = useSettingValue('car.bgBlurRadius')
  const carBgDim = useSettingValue('car.bgDim')
  const carBgSource = useSettingValue('car.bgSource')
  const contentScrim = useSettingValue('car.contentScrim')

  const usePic = carBgSource === 'cover' && !!pic
  // 毛玻璃：任意背景来源（封面 / 主题壁纸）都叠加模糊 + 半透明玻璃层
  const glass = carBgGlass || (usePic && carBgBlur)
  const blurRadius = glass ? Math.max(0, Math.min(25, carBgBlurRadius)) : 0
  const dim = Math.max(0, Math.min(0.8, carBgDim))
  const scrim = Math.max(0, Math.min(1, contentScrim))
  // 是否真的有一张图片在下面（用于决定文字要不要自动加阴影）
  const hasBgImage = !!(usePic && pic) || !!theme['bg-image']

  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={onLayout}>
      <ImageBackground
        style={{ position: 'absolute', left: 0, top: 0, height: windowSize.height, width: windowSize.width, backgroundColor: theme['c-content-background'] }}
        source={usePic && pic ? { uri: pic, headers: defaultHeaders } : theme['bg-image']}
        resizeMode="cover"
        blurRadius={blurRadius}
        imageStyle={blurRadius > 0 ? { transform: [{ scale: 1.12 }] } : undefined}
      >
        {/* 玻璃层：主题背景色半透明 + 一层高光 */}
        <View style={{ flex: 1, backgroundColor: theme['c-content-background'], opacity: glass ? Math.max(dim, 0.35) : dim }}></View>
        {glass ? <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.06)' }}></View> : null}
      </ImageBackground>
      {
        scrim > 0
          ? (
            <View
              style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme['c-content-background'], opacity: scrim }}
              pointerEvents="none"
            />
            )
          : null
      }
      {/* 内容直接作为子节点，保持原来的布局规则（例如只给了 maxHeight 的弹窗会按内容撑开） */}
      <BgImageContext.Provider value={hasBgImage}>
        {children}
      </BgImageContext.Provider>
    </View>
  )
})
