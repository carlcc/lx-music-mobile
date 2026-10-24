import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { NAV_MENUS } from '@/config/constant'
import type { InitState } from '@/store/common/state'
import { exitApp, setNavActiveId } from '@/core/common'
import { confirmDialog, createStyle } from '@/utils/tools'
import { carFontSize, useCarFontScale, useCarMetrics } from './constants'
import { setCarSonglistDetail } from './carDetailState'
import { useWindowSize } from '@/utils/hooks'

type IdType = InitState['navActiveId'] | 'nav_exit' | 'back_home'

/** 菜单图标尺寸：明显小于按钮（asideBtnSize），按钮大小不变，内部留白更多 */
const MENU_ICON_SIZE = 20

const MenuItem = ({ id, icon, itemGap, onPress }: {
  id: IdType
  icon: string
  itemGap: number
  onPress: (id: IdType) => void
}) => {
  const activeId = useNavActiveId()
  const theme = useTheme()
  const t = useI18n()
  const fontScale = useCarFontScale()
  const { asideBtnSize } = useCarMetrics()
  const active = activeId == id

  return (
    <TouchableOpacity
      style={{ ...styles.menuItemWrap, paddingVertical: itemGap }}
      activeOpacity={0.6}
      onPress={() => { onPress(id) }}
    >
      <View
        style={{
          ...styles.menuItem,
          width: asideBtnSize,
          height: asideBtnSize,
          backgroundColor: active ? theme['c-primary-light-300-alpha-400'] : 'transparent',
        }}
      >
        {/* 图标比按钮小一圈，按钮尺寸不变 —— 留白更多，界面更松散 */}
        <Icon name={icon} size={MENU_ICON_SIZE} color={active ? theme['c-primary-font-active'] : theme['c-primary-font']} rawSize={MENU_ICON_SIZE} />
        <Text size={carFontSize(11, fontScale)} color={active ? theme['c-primary-font-active'] : theme['c-primary-font']} numberOfLines={1}>{t(id as never)}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default memo(() => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  const showExitBtn = useSettingValue('common.showExitBtn')
  const { asideWidth, asideLogoHeight, asideItemGap, asideBtnSize } = useCarMetrics()
  const { height: winHeight } = useWindowSize()
  // 菜单项较多（开了退出按钮共 6 个）时，按可用高度收窄间距，避免挤出去
  const itemCount = NAV_MENUS.length + (showExitBtn ? 1 : 0)
  const availableHeight = winHeight - statusBarHeight - asideLogoHeight - 12
  const itemGap = Math.max(0, Math.min(asideItemGap, Math.floor((availableHeight / itemCount - asideBtnSize) / 2)))

  const handlePress = (id: IdType) => {
    switch (id) {
      case 'nav_exit':
        void confirmDialog({
          message: global.i18n.t('exit_app_tip'),
          confirmButtonText: global.i18n.t('list_remove_tip_button'),
        }).then(isExit => {
          if (!isExit) return
          exitApp('Exit Btn')
        })
        return
      case 'back_home':
        return
    }

    global.app_event.changeMenuVisible(false)
    // 切换一级导航时退出歌单详情子页面
    setCarSonglistDetail(null)
    setNavActiveId(id)
  }

  return (
    <View style={{
      ...styles.container,
      width: asideWidth,
      borderRightColor: theme['c-border-background'],
      paddingTop: statusBarHeight,
    }}>
      <TouchableOpacity
        style={{ ...styles.logo, height: asideLogoHeight }}
        activeOpacity={0.6}
        onPress={() => {
          setCarSonglistDetail(null)
          setNavActiveId('nav_love')
        }}
      >
        <Icon name="logo" color={theme['c-primary-dark-100-alpha-300']} size={22} rawSize={22} />
      </TouchableOpacity>
      <View style={styles.menus}>
        {NAV_MENUS.map(menu => <MenuItem key={menu.id} id={menu.id} icon={menu.icon} itemGap={itemGap} onPress={handlePress} />)}
      </View>
      {
        showExitBtn ? <MenuItem id="nav_exit" icon="exit2" itemGap={itemGap} onPress={handlePress} /> : null
      }
    </View>
  )
})

const styles = createStyle({
  container: {
    flexGrow: 0,
    flexShrink: 0,
    // 玻璃拟态侧栏
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRightWidth: 1,
    paddingBottom: 12,
    alignItems: 'center',
  },
  logo: {
    height: 60,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menus: {
    flexGrow: 1,
    flexShrink: 1,
    width: '100%',
  },
  // 外层撑满宽度保证点击热区，内层正方形高亮（不占满导航栏宽度）
  menuItemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  menuItem: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    gap: 4,
  },
})
