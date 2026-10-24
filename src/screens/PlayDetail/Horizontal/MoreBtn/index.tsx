import { createStyle } from '@/utils/tools'
import { View } from 'react-native'
import MusicAddBtn from './MusicAddBtn'
import SettingBtn from './SettingBtn'
import CommentBtn from '../components/CommentBtn'
import { useCarMetrics } from '@/components/car/constants'

/**
 * 播放页海报左侧按钮列：加入歌单 / 评论 / 设置
 * （桌面歌词按钮已移到播放控制按钮行）
 *
 * 绝对定位在海报区左侧，高度跟随海报区；按钮尺寸与间距随屏幕自适应，
 * 保证矮屏上也不会溢出到上方返回按钮区域。
 */
export default () => {
  const { moreBtnSize, playerGap } = useCarMetrics()

  return (
    <View style={{
      ...styles.container,
      gap: Math.max(8, Math.round(16 * (moreBtnSize / 48))),
      paddingVertical: playerGap,
      // 与左侧边缘留一点空白，不要贴边
      paddingHorizontal: 6,
    }}>
      <MusicAddBtn />
      <CommentBtn />
      <SettingBtn />
    </View>
  )
}


const styles = createStyle({
  container: {
    flexShrink: 1,
    flexGrow: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    height: '100%',
    left: 0,
    zIndex: 1,
  },
})
