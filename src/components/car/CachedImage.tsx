import { memo, useEffect, useState } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import Image, { type ImageProps } from '@/components/common/Image'
import { cacheImage, getCachedImage } from '@/core/onlineImgCache'

/**
 * 在线图片（歌单封面等）：本地缓存优先，未命中时先下载到本地再显示（只下载一次）
 * - 命中缓存（映射存在 + 文件存在 + 未过期）→ 直接读本地文件，0 流量
 * - 未命中 / 映射存在但文件丢失 / 已过期 → 重新下载并刷新映射
 * - car.imgCacheDays = 0 → 关闭缓存，直接使用远程地址
 */
export default memo(({ url, style, nativeID }: {
  url?: string | null
  style: ImageProps['style']
  /** 需透传给共享元素动画（英雄动画）使用 */
  nativeID?: string
}) => {
  const days = useSettingValue('car.imgCacheDays')
  const theme = useTheme()
  const [uri, setUri] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    setUri(null)
    if (!url) return () => { ignore = true }
    if (days <= 0) {
      setUri(url)
      return () => { ignore = true }
    }
    void (async() => {
      const cached = await getCachedImage(url, days)
      if (ignore) return
      if (cached) {
        setUri(cached)
        return
      }
      // 未命中：先下载到本地，再显示本地文件（下载失败才回退远程）
      const path = await cacheImage(url)
      if (ignore) return
      setUri(path ?? url)
    })()
    return () => { ignore = true }
  }, [url, days])

  // 未就绪时显示占位块，避免空白闪烁
  const placeholderStyle: ImageProps['style'] = [style, { backgroundColor: theme['c-primary-background'] }]

  return uri
    ? <Image url={uri} style={style} nativeID={nativeID} />
    : <View style={placeholderStyle} nativeID={nativeID} />
})
