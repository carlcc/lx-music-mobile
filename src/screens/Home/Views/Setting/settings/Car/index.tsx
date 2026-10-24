import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBoxItem from '../../components/CheckBoxItem'
import Slider, { type SliderProps } from '../../components/Slider'
import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { setFontSize, updateSetting } from '@/core/common'
import { useFontSize } from '@/store/common/hook'
import { initOnlineImgCache } from '@/core/onlineImgCache'
import { getAuditionCacheDir, initAuditionCache, resetAuditionCacheDir } from '@/core/auditionCache'
import { createStyle } from '@/utils/tools'
import { CAR } from '@/components/car/constants'

type BgSource = 'cover' | 'theme' | 'color'
type StartupView = 'nav_love' | 'nav_search' | 'nav_songlist' | 'nav_cache' | 'playDetail'
type AutoAddList = 'default' | 'love' | 'none'
/** 全局界面缩放（global.lx.fontSize）：同时作用于文字与尺寸，值越小一屏显示越多 */
const UI_SCALE_MIN = 0.5
const UI_SCALE_MAX = 2
const UI_SCALE_STEP = 0.1

const ToggleGroup = <T extends string>({ values, current, labels, onChange }: {
  values: T[]
  current: T
  labels: Record<T, string>
  onChange: (value: T) => void
}) => {
  const theme = useTheme()
  return (
    <View style={styles.toggleGroup}>
      {values.map(value => (
        <TouchableOpacity
          key={value}
          style={{
            ...styles.toggle,
            ...(value == current ? { ...styles.toggleActive, borderColor: theme['c-primary-font'] } : null),
          }}
          activeOpacity={0.6}
          onPress={() => { onChange(value) }}
        >
          <Text color={value == current ? theme['c-primary-font'] : theme['c-font']}>{labels[value]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default memo(() => {
  const theme = useTheme()
  const choosePathRef = useRef<ChoosePathType>(null)
  const bgBlur = useSettingValue('car.bgBlur')
  const bgGlass = useSettingValue('car.bgGlass')
  const imgCacheDays = useSettingValue('car.imgCacheDays')
  const auditionCache = useSettingValue('car.auditionCache')
  const bgBlurRadius = useSettingValue('car.bgBlurRadius')
  const bgDim = useSettingValue('car.bgDim')
  const contentScrim = useSettingValue('car.contentScrim')
  const bgSource = useSettingValue('car.bgSource')
  const vinyl = useSettingValue('car.vinyl')
  const startupView = useSettingValue('car.startupView')
  const uiScale = useFontSize()
  const fontScale = useSettingValue('car.fontScale')
  const autoAddDefaultList = useSettingValue('car.autoAddDefaultList')

  const [blurRadius, setBlurRadius] = useState(bgBlurRadius)
  const [imgCacheDaysValue, setImgCacheDaysValue] = useState(imgCacheDays)
  const [dim, setDim] = useState(bgDim)
  const [scrimValue, setScrimValue] = useState(contentScrim)
  const [fontScaleValue, setFontScaleValue] = useState(fontScale)
  const [uiScaleValue, setUiScaleValue] = useState(uiScale)

  const handleBlurChange = useCallback<NonNullable<SliderProps['onSlidingComplete']>>(value => {
    setBlurRadius(value)
    updateSetting({ 'car.bgBlurRadius': value })
  }, [])
  const handleDimChange = useCallback<NonNullable<SliderProps['onSlidingComplete']>>(value => {
    setDim(value)
    updateSetting({ 'car.bgDim': value })
  }, [])
  const handleScrimChange = useCallback<NonNullable<SliderProps['onSlidingComplete']>>(value => {
    setScrimValue(value)
    updateSetting({ 'car.contentScrim': value })
  }, [])
  // 用路径选择器选择目录（不再是纯手填）
  const handleChooseCacheDir = useCallback(() => {
    choosePathRef.current?.show({ title: '选择试听缓存目录', dirOnly: true })
  }, [])
  const handleCacheDirConfirm = useCallback((path: string) => {
    updateSetting({ 'car.auditionCacheDir': path })
    resetAuditionCacheDir()
    void initAuditionCache()
  }, [])
  const handleImgCacheDaysChange = useCallback<NonNullable<SliderProps['onSlidingComplete']>>(value => {
    setImgCacheDaysValue(value)
    updateSetting({ 'car.imgCacheDays': value })
    void initOnlineImgCache(value)
  }, [])
  const handleFontScaleChange = useCallback<NonNullable<SliderProps['onSlidingComplete']>>(value => {
    setFontScaleValue(value)
    updateSetting({ 'car.fontScale': value })
  }, [])
  // 在别的入口（基础设置 → 字体大小）改动后同步滑杆显示
  useEffect(() => {
    setUiScaleValue(uiScale)
  }, [uiScale])

  const handleUiScaleChange = useCallback<NonNullable<SliderProps['onSlidingComplete']>>(value => {
    // step 是 0.1，这里做一次收敛，避免浮点误差存出 1.2000000000000002 这种值
    const scale = Math.round(value * 10) / 10
    setUiScaleValue(scale)
    setFontSize(scale)
  }, [])

  return (
    <View style={styles.container}>
      <SubTitle title="背景与模糊">
        <CheckBoxItem
          check={bgBlur}
          label="封面模糊背景"
          onChange={value => { updateSetting({ 'car.bgBlur': value }) }}
        />
        <CheckBoxItem
          check={bgGlass}
          label="背景毛玻璃滤镜（基于主题背景）"
          onChange={value => { updateSetting({ 'car.bgGlass': value }) }}
        />
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel} color={theme['c-font']}>模糊强度 {Math.round(blurRadius)}px</Text>
          <Slider
            minimumValue={0}
            maximumValue={25}
            step={1}
            value={bgBlurRadius}
            onValueChange={setBlurRadius}
            onSlidingComplete={handleBlurChange}
          />
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel} color={theme['c-font']}>背景暗化 {Math.round(dim * 100)}%</Text>
          <Slider
            minimumValue={0}
            maximumValue={0.8}
            step={0.05}
            value={bgDim}
            onValueChange={setDim}
            onSlidingComplete={handleDimChange}
          />
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel} color={theme['c-font']}>内容底纹 {Math.round(scrimValue * 100)}%</Text>
          <Slider
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            value={contentScrim}
            onValueChange={setScrimValue}
            onSlidingComplete={handleScrimChange}
          />
        </View>
        <Text style={styles.tip} color={theme['c-font-label']}>背景图片的亮度无法保证与主题一致。「内容底纹」是在文字所在的那一层再铺一层主题底色，调高更清晰、调低更能看见壁纸。</Text>
        <ToggleGroup<BgSource>
          values={['cover', 'theme', 'color']}
          current={bgSource}
          labels={{ cover: '当前封面', theme: '主题壁纸', color: '纯色' }}
          onChange={value => { updateSetting({ 'car.bgSource': value }) }}
        />
      </SubTitle>

      <SubTitle title="车机">
        <CheckBoxItem
          check={vinyl}
          label="播放页使用黑胶唱片"
          onChange={value => { updateSetting({ 'car.vinyl': value }) }}
        />
        <Text style={styles.tip} color={theme['c-font-label']}>注意：唱片旋转会让整个界面持续重绘，播放页打开时渲染开销明显升高（实测渲染线程约 60%、约 30fps），低端设备可能掉帧或发热。播放页关闭时唱片会停转，播放条上的小唱片始终不转。</Text>
        <View style={styles.row}>
          <Text color={theme['c-font']}>启动落地页</Text>
          <ToggleGroup<StartupView>
            values={['nav_love', 'nav_search', 'nav_songlist', 'nav_cache', 'playDetail']}
            current={(startupView as StartupView) ?? 'nav_love'}
            labels={{ nav_love: '我的列表', nav_search: '搜索', nav_songlist: '歌单', nav_cache: '本地缓存', playDetail: '播放器' }}
            onChange={value => { updateSetting({ 'car.startupView': value }) }}
          />
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel} color={theme['c-font']}>界面缩放 {Math.round(uiScaleValue * 100)}%</Text>
          <Slider
            minimumValue={UI_SCALE_MIN}
            maximumValue={UI_SCALE_MAX}
            step={UI_SCALE_STEP}
            value={uiScaleValue}
            onValueChange={setUiScaleValue}
            onSlidingComplete={handleUiScaleChange}
          />
        </View>
        <Text style={styles.tip} color={theme['c-font-label']}>数值越小，一屏显示的内容越多（文字与控件尺寸一起缩放）。部分布局需要重启应用后完整生效。</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel} color={theme['c-font']}>字号 {Math.round(fontScaleValue * 100)}%</Text>
          <Slider
            minimumValue={0.9}
            maximumValue={1.4}
            step={0.05}
            value={fontScale}
            onValueChange={setFontScaleValue}
            onSlidingComplete={handleFontScaleChange}
          />
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel} color={theme['c-font']}>在线封面缓存 {Math.round(imgCacheDaysValue)} 天（0 = 不缓存）</Text>
          <Slider
            minimumValue={0}
            maximumValue={30}
            step={1}
            value={imgCacheDaysValue}
            onValueChange={setImgCacheDaysValue}
            onSlidingComplete={handleImgCacheDaysChange}
          />
        </View>
        <CheckBoxItem
          check={auditionCache}
          label="音乐缓存（在线歌曲先缓存再播放）"
          onChange={value => { updateSetting({ 'car.auditionCache': value }) }}
        />
        <View style={styles.row}>
          <View style={styles.pathInfo}>
            <Text size={13} color={theme['c-font']}>音乐缓存目录</Text>
            <Text style={styles.path} size={12} color={theme['c-font']} numberOfLines={2}>{getAuditionCacheDir()}</Text>
          </View>
          <TouchableOpacity style={styles.pathBtn} activeOpacity={0.6} onPress={handleChooseCacheDir}>
            <Text size={13} color={theme['c-primary-font']}>选择目录</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <Text color={theme['c-font']}>试听额外存入</Text>
          <ToggleGroup<AutoAddList>
            values={['default', 'love', 'none']}
            current={autoAddDefaultList}
            labels={{ default: '仅播放队列', love: '我的收藏', none: '不额外添加' }}
            onChange={value => { updateSetting({ 'car.autoAddDefaultList': value }) }}
          />
        </View>
      </SubTitle>
      <ChoosePath ref={choosePathRef} onConfirm={handleCacheDirConfirm} />
    </View>
  )
})

const styles = createStyle({
  container: {
    paddingTop: 10,
  },
  sliderRow: {
    paddingLeft: 25,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sliderLabel: {
    paddingBottom: 4,
  },
  tip: {
    paddingLeft: 25,
    paddingRight: 25,
    paddingBottom: 6,
    opacity: 0.8,
  },
  row: {
    paddingLeft: 25,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pathInfo: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  path: {
    paddingTop: 4,
    opacity: 0.85,
  },
  pathBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(127, 127, 127, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 8,
  },
  toggle: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(127, 127, 127, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: CAR.hitSize,
  },
  toggleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
})
