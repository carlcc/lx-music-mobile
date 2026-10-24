// import { useLrcPlay } from '@/plugins/lyric'
import { useStatusText } from '@/store/player/hook'
// import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'


export default () => {
  // const { text } = useLrcPlay()
  const statusText = useStatusText()
  // console.log('render status')

  // const status = playerStatus.isPlay ? text : playerStatus.statusText

  // 没有提示时返回 null，避免占掉一行（矮屏上这一行要留给海报）
  if (!statusText) return null

  return <Text numberOfLines={1} size={13}>{statusText}</Text>
}

// const styles = createStyle({
//   text: {
//     fontSize: 10,
//   },
// })
