import { useRef } from 'react'
import Btn from '../components/Btn'
import SettingPopup, { type SettingPopupType } from '../../components/SettingPopup'

/**
 * 设置按钮（从顶栏移到左侧按钮列，与其他按钮统一）
 */
export default () => {
  const popupRef = useRef<SettingPopupType>(null)
  return (
    <>
      <Btn icon="slider" onPress={() => { popupRef.current?.show() }} />
      <SettingPopup ref={popupRef} position="left" direction="horizontal" />
    </>
  )
}
