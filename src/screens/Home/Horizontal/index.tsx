import { useEffect } from 'react'
import { View, BackHandler } from 'react-native'
import Aside from './Aside'
import PlayerBar from '@/components/player/PlayerBar'
import StatusBar from '@/components/common/StatusBar'
import Header from './Header'
import Main from './Main'
import { createStyle } from '@/utils/tools'
import { setNavActiveId } from '@/core/common'
import commonState from '@/store/common/state'
import settingState from '@/store/setting/state'
import { NAV_MENUS } from '@/config/constant'
import type { NAV_ID_Type } from '@/config/constant'
import AddMusicPopover, { type AddMusicPopoverType } from '@/components/car/AddMusicPopover'
import { getCarSonglistDetail, setCarSonglistDetail } from '@/components/car/carDetailState'
import CarPlayDetail from '@/components/car/CarPlayDetail'
import { getPlayDetailVisible, setPlayDetailVisible } from '@/components/car/playDetailState'
import QueuePopup, { type QueuePopupType } from '@/components/car/QueuePopup'
import { setAddMusicPopover, setQueuePopup } from '@/components/car/popup'

// 每次启动只应用一次车机默认落地页，避免旋转/返回时被反复重置
let carStartupViewApplied = false

export default () => {
  useEffect(() => {
    if (carStartupViewApplied) return
    carStartupViewApplied = true
    const startupView = settingState.setting['car.startupView'] as NAV_ID_Type | 'playDetail' | ''
    if (!startupView) return
    // 落地页 = 播放器：直接打开常驻的播放页浮层，导航 tab 保持默认
    if (startupView == 'playDetail') {
      setPlayDetailVisible(true)
      return
    }
    if (!NAV_MENUS.some(menu => menu.id == startupView)) return
    if (commonState.navActiveId == startupView) return
    setNavActiveId(startupView)
  }, [])

  // 车机：物理/系统返回键优先退出歌单详情子页面
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // 播放页是常驻浮层，返回键先收起它
      if (getPlayDetailVisible()) {
        setPlayDetailVisible(false)
        return true
      }
      if (getCarSonglistDetail()) {
        setCarSonglistDetail(null)
        return true
      }
      return false
    })
    return () => {
      subscription.remove()
    }
  }, [])

  return (
    <>
      <StatusBar />
      <View style={styles.container}>
        <Aside />
        <View style={styles.content}>
          <Header />
          <Main />
          <PlayerBar isHome />
        </View>
      </View>
      <AddMusicPopover ref={(instance: AddMusicPopoverType | null) => { setAddMusicPopover(instance) }} />
      <QueuePopup ref={(instance: QueuePopupType | null) => { setQueuePopup(instance) }} />
      {/* 车机播放页：常驻浮层，覆盖整个窗口 */}
      <CarPlayDetail />
    </>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
})
