import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import settingState from '@/store/setting/state'
import MusicList from './MusicList'
import MyList from './MyList'
import { useTheme } from '@/store/theme/hook'
import { useHorizontalMode } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { CAR } from '@/components/car/constants'
import CarCard from '@/components/car/CarCard'
import DrawerLayoutFixed, { type DrawerLayoutFixedType } from '@/components/common/DrawerLayoutFixed'
import { COMPONENT_IDS } from '@/config/constant'
import { scaleSizeW } from '@/utils/pixelRatio'
import type { InitState as CommonState } from '@/store/common/state'

const MAX_WIDTH = scaleSizeW(400)
/**
 * 左列（我的歌单）宽度按界面缩放比例走：
 * 固定 px 时，界面缩放变大后左列装不下内容会挤压右侧歌曲列表
 */
const LEFT_WIDTH_PERCENT = Math.min(44, Math.round(30 * (global.lx.fontSize || 1)))

export default () => {
  const drawer = useRef<DrawerLayoutFixedType>(null)
  const theme = useTheme()
  const isHorizontalMode = useHorizontalMode()
  // const [width, setWidth] = useState(0)

  useEffect(() => {
    const handleFixDrawer = (id: CommonState['navActiveId']) => {
      if (id == 'nav_love') drawer.current?.fixWidth()
    }
    const changeVisible = (visible: boolean) => {
      if (visible) {
        requestAnimationFrame(() => {
          drawer.current?.openDrawer()
        })
      } else {
        drawer.current?.closeDrawer()
      }
    }

    // setWidth(getWindowSise().width * 0.82)

    global.state_event.on('navActiveIdUpdated', handleFixDrawer)
    global.app_event.on('changeLoveListVisible', changeVisible)

    // 就放旋转屏幕后的宽度没有更新的问题
    // const changeEvent = onDimensionChange(({ window }) => {
    //   setWidth(window.width * 0.82)
    //   drawer.current?.setNativeProps({
    //     width: window.width,
    //   })
    // })

    return () => {
      global.state_event.off('navActiveIdUpdated', handleFixDrawer)
      global.app_event.off('changeLoveListVisible', changeVisible)
    // changeEvent.remove()
    }
  }, [])

  const navigationView = () => <MyList />
  // console.log('render drawer content')

  // 车机横屏：左"我的歌单"卡片 + 右"歌曲列表"卡片，不使用抽屉与分割线
  if (isHorizontalMode) {
    return (
      <View style={styles.carContainer}>
        <CarCard style={styles.carLeft}>
          <MyList />
        </CarCard>
        <CarCard style={styles.carRight}>
          <MusicList />
        </CarCard>
      </View>
    )
  }

  return (
    <DrawerLayoutFixed
      ref={drawer}
      visibleNavNames={[COMPONENT_IDS.home]}
      // drawerWidth={width}
      widthPercentage={0.82}
      widthPercentageMax={MAX_WIDTH}
      drawerPosition={settingState.setting['common.drawerLayoutPosition']}
      renderNavigationView={navigationView}
      drawerBackgroundColor={theme['c-content-background']}
      style={{ elevation: 1 }}
    >
      <MusicList />
    </DrawerLayoutFixed>
  )
}

const styles = createStyle({
  carContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: CAR.gap,
    paddingTop: CAR.padding,
    paddingLeft: CAR.padding,
    paddingRight: CAR.padding,
    paddingBottom: CAR.padding,
  },
  carLeft: {
    width: `${LEFT_WIDTH_PERCENT}%`,
    flexGrow: 0,
    flexShrink: 1,
  },
  carRight: {
    flex: 1,
    flexShrink: 1,
  },
})
