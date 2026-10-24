import { memo, useMemo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useHorizontalMode, useKeyboard } from '@/utils/hooks'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { showQueuePopup } from '@/components/car/popup'
import { CAR, useCarMetrics } from '@/components/car/constants'

import Pic from './components/Pic'
import Title from './components/Title'
import PlayInfo from './components/PlayInfo'
import ControlBtn from './components/ControlBtn'
import { createStyle } from '@/utils/tools'
// import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'


export default memo(({ isHome = false }: { isHome?: boolean }) => {
  // const { onLayout, ...layout } = useLayout()
  const { keyboardShown } = useKeyboard()
  const theme = useTheme()
  const isHorizontalMode = useHorizontalMode()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')
  const { playerBarHeight, playerBarActionBtnHeight } = useCarMetrics()

  const playerComponent = useMemo(() => (
    <View style={{
      ...styles.container,
      // 车机：底部整条平铺（无圆角、无阴影），主题面板色 + 顶部一条分隔线；竖屏保持原有背景
      backgroundColor: isHorizontalMode ? theme['c-primary-background'] : theme['c-content-background'],
      borderTopWidth: isHorizontalMode ? 1 : 0,
      borderTopColor: theme['c-border-background'],
      height: isHorizontalMode ? playerBarHeight : undefined,
      borderRadius: isHorizontalMode ? 0 : undefined,
      borderTopLeftRadius: isHorizontalMode ? 0 : undefined,
      borderTopRightRadius: isHorizontalMode ? 0 : undefined,
      elevation: isHorizontalMode ? 0 : undefined,
      paddingVertical: isHorizontalMode ? 0 : undefined,
      paddingLeft: isHorizontalMode ? CAR.padding : undefined,
      paddingRight: isHorizontalMode ? CAR.padding : undefined,
      gap: isHorizontalMode ? CAR.gap : undefined,
    }}>
      <Pic isHome={isHome} />
      {/* 车机：标题 + 进度条作为整体纵向居中 */}
      <View style={{ ...styles.center, justifyContent: isHorizontalMode ? 'center' : undefined, gap: isHorizontalMode ? 6 : undefined }}>
        <Title isHome={isHome} />
        {/* <View style={{ ...styles.row, justifyContent: 'space-between' }}>
          <PlayTime />
        </View> */}
        <PlayInfo isHome={isHome} />
      </View>
      <View style={styles.right}>
        <ControlBtn />
      </View>
      {
        isHorizontalMode
          ? (
            <View style={styles.carActions}>
              {/* 队列按钮（带图标）；播放页入口保留在侧栏与顶栏，这里不再重复 */}
              <TouchableOpacity style={{
                ...styles.carBtn,
                height: playerBarActionBtnHeight,
                borderRadius: playerBarActionBtnHeight / 2,
                borderColor: theme['c-border-background'],
                backgroundColor: theme['c-primary-background'],
              }} activeOpacity={0.6} onPress={() => { showQueuePopup() }}>
                {/* 三条横线（菜单样式）表示队列 */}
                <Icon name="menu" size={18} color={theme['c-font']} rawSize={18} />
                <Text style={styles.carBtnText} size={13} color={theme['c-font']}>队列</Text>
              </TouchableOpacity>
            </View>
            )
          : null
      }
    </View>
  ), [theme, isHome, isHorizontalMode, playerBarHeight, playerBarActionBtnHeight])

  // console.log('render pb')

  return autoHidePlayBar && keyboardShown ? null : playerComponent
})


const styles = createStyle({
  container: {
    width: '100%',
    // height: 100,
    // paddingTop: progressContentPadding,
    // marginTop: -progressContentPadding,
    // backgroundColor: 'rgba(0, 0, 0, .1)',
    // borderTopWidth: BorderWidths.normal2,
    paddingVertical: 5,
    paddingLeft: 5,
    // backgroundColor: AppColors.primary,
    // backgroundColor: 'red',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
  },
  left: {
    // borderRadius: 3,
    flexGrow: 0,
    flexShrink: 0,
  },
  center: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 5,
    height: '100%',
    // justifyContent: 'space-evenly',
    // height: 48,
    // backgroundColor: 'rgba(0, 0, 0, .1)',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    paddingLeft: 5,
    paddingRight: 5,
  },
  // 车机：常驻"队列 / 播放页"直达按钮
  carActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    gap: 10,
    paddingRight: 10,
    marginLeft: 'auto',
  },
  carBtnText: {
    paddingLeft: 8,
  },
  carBtn: {
    height: 48,
    // 图标与文字横向排列
    flexDirection: 'row',
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // row: {
  //   flexDirection: 'row',
  //   flexGrow: 0,
  //   flexShrink: 0,
  // },
})
