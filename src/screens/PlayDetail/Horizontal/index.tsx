import { memo, useEffect } from 'react'
import { View, AppState } from 'react-native'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import StatusBar from '@/components/common/StatusBar'
import MoreBtn from './MoreBtn'

import Header from './components/Header'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import PageContent from '@/components/PageContent'
import commonState, { type InitState as CommonState } from '@/store/common/state'

import Pic from './Pic'
// import ControlBtn from './ControlBtn'
import RightPanel from './RightPanel'
import Player from './Player'
import { createStyle } from '@/utils/tools'
import { useStatusbarHeight } from '@/store/common/hook'
import { CAR, useCarMetrics } from '@/components/car/constants'
// import MoreBtn from './MoreBtn2'

export default memo(({ componentId }: { componentId: string }) => {
  const statusBarHeight = useStatusbarHeight()
  const { playerGap } = useCarMetrics()

  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
    screenkeepAwake()
    let appstateListener = AppState.addEventListener('change', (state) => {
      switch (state) {
        case 'active':
          if (!commonState.componentIds.comment) screenkeepAwake()
          break
        case 'background':
          screenUnkeepAwake()
          break
      }
    })

    const handleComponentIdsChange = (ids: CommonState['componentIds']) => {
      if (ids.comment) screenUnkeepAwake()
      else if (AppState.currentState == 'active') screenkeepAwake()
    }

    global.state_event.on('componentIdsUpdated', handleComponentIdsChange)

    return () => {
      global.state_event.off('componentIdsUpdated', handleComponentIdsChange)
      appstateListener.remove()
      screenUnkeepAwake()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 进出场动画交给导航层处理：整页从右侧滑入 / 滑出（见 navigation.ts 的 pushPlayDetailScreen）
  return (
    <PageContent>
      <StatusBar />
      <View style={{
        ...styles.container,
        paddingTop: statusBarHeight,
      }}>
        <View style={styles.left}>
          <Header />
          {/* 海报区：占满剩余空间，底部留出与播放器之间的空白 */}
          <View style={{ ...styles.leftContent, paddingBottom: playerGap }}>
            <MoreBtn />
            <Pic />
          </View>
          <Player />
          {/* <View style={styles.controlBtn} nativeID="pageIndicator">
            <MoreBtn />
            <ControlBtn />
          </View> */}
        </View>
        <View style={styles.right}>
          <RightPanel />
        </View>
      </View>
    </PageContent>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  left: {
    flex: 1,
    width: '45%',
    paddingBottom: 10,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  // 海报区：基准占左栏 50%，播放器不够高时才被压缩（flexShrink: 1），
  // 播放器自身不压缩（flexShrink: 0），保证控件永远完整显示
  leftContent: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '50%',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  right: {
    width: '55%',
    flexGrow: 0,
    flexShrink: 0,
    // 两侧留白：与左侧播放器、与屏幕右边缘都隔开
    paddingLeft: CAR.padding,
    paddingRight: CAR.padding,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // backgroundColor: '#eee',
  },
})
