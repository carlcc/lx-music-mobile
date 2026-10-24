import { useContext, useEffect, useState } from 'react'
import { ThemeContext } from './state'
import settingState from '@/store/setting/state'
import { useBgImageActive } from '@/components/common/BgImageContext'

// export const useSetting = () => {
//   const [setting, updateSetting] = useState(state.setting)

//   useEffect(() => {
//     const handleUpdate = () => {
//       updateSetting(state.setting)
//     }
//     global.state_event.on('configUpdated', handleUpdate)
//     return () => {
//       global.state_event.off('configUpdated', handleUpdate)
//     }
//   }, [])

//   return setting
// }

// export const useSettingValue = <T extends keyof LX.AppSetting>(key: T): LX.AppSetting[T] => {
//   const [value, update] = useState(state.setting[key])

//   useEffect(() => {
//     const handleUpdate = (keys: Array<keyof LX.AppSetting>) => {
//       if (!keys.includes(key)) return
//       update(state.setting[key])
//     }
//     global.state_event.on('configUpdated', handleUpdate)
//     return () => {
//       global.state_event.off('configUpdated', handleUpdate)
//     }
//   }, [key])

//   return value
// }

export const useTheme = () => useContext(ThemeContext)

export const useTextShadow = () => {
  const [value, update] = useState(settingState.setting['theme.fontShadow'])
  // 界面正显示在背景图片之上时，文字可能落在任意亮度的画面上，
  // 这时即使有内容底纹也可能遇到局部突变，自动给文字加阴影兜底
  const hasBgImage = useBgImageActive()

  useEffect(() => {
    const handleUpdate = (keys: Array<keyof LX.AppSetting>, setting: Partial<LX.AppSetting>) => {
      if (!keys.includes('theme.fontShadow')) return
      requestAnimationFrame(() => {
        update(setting['theme.fontShadow']!)
      })
    }
    global.state_event.on('configUpdated', handleUpdate)
    return () => {
      global.state_event.off('configUpdated', handleUpdate)
    }
  }, [])

  return value || hasBgImage
}
