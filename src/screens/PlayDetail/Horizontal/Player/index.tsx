import { memo } from 'react'
import { View } from 'react-native'

// import Title from './components/Title'
import { createStyle } from '@/utils/tools'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import PlayInfo from './PlayInfo'
import ControlBtn from './ControlBtn'
import Title from './Title'
import { marginLeftRaw } from '../constant'


export default memo(() => {
  return (
    <View style={styles.container} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_player}>
      <Title />
      <PlayInfo />
      <ControlBtn />
    </View>
  )
})

const styles = createStyle({
  container: {
    // 播放器按内容高度显示，剩下的空间全部给上方海报区（flex: 1）
    flexShrink: 0,
    flexGrow: 0,
    marginLeft: marginLeftRaw,
    // paddingRight: 15,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
})
