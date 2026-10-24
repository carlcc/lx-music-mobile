import { StyleSheet, TouchableOpacity } from 'react-native'
import { navigations } from '@/navigation'
import { usePlayerMusicInfo, useIsPlay } from '@/store/player/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { useCallback } from 'react'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'
import { useHorizontalMode } from '@/utils/hooks'
import { useSettingValue } from '@/store/setting/hook'
import VinylDisc from '@/components/car/VinylDisc'
import { useCarMetrics } from '@/components/car/constants'

const PIC_HEIGHT = scaleSizeH(46)

const styles = StyleSheet.create({
  image: {
    width: PIC_HEIGHT,
    height: PIC_HEIGHT,
    borderRadius: 2,
  },
})

export default ({ isHome }: { isHome: boolean }) => {
  const musicInfo = usePlayerMusicInfo()
  const isHorizontalMode = useHorizontalMode()
  const useVinyl = useSettingValue('car.vinyl')
  const isPlay = useIsPlay()
  const { playerBarPicSize } = useCarMetrics()
  const handlePress = () => {
    // console.log('')
    // console.log(playMusicInfo)
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)

    // toast(global.i18n.t('play_detail_todo_tip'), 'long')
  }

  const handleLongPress = () => {
    if (!isHome) return
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const handleError = useCallback((url: string | number) => {
    setLoadErrorPicUrl(url as string)
    setMusicInfo({
      pic: null,
    })
  }, [])

  return (
    <TouchableOpacity onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7} >
      {
        isHorizontalMode && useVinyl
          ? <VinylDisc
              size={playerBarPicSize}
              pic={musicInfo.pic}
              isPlay={isPlay}
              nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic}
            />
          : <Image
              url={musicInfo.pic}
              nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic}
              style={{
                ...styles.image,
                // 车机：跟随播放条高度，避免播放条变薄后封面溢出
                width: isHorizontalMode ? playerBarPicSize : undefined,
                height: isHorizontalMode ? playerBarPicSize : undefined,
              }}
              onError={handleError}
            />
      }
    </TouchableOpacity>
  )
}


// const styles = StyleSheet.create({
//   playInfoImg: {

//   },
// })
