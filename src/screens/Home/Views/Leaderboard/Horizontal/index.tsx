import { useEffect, useRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useSourceNames } from '@/store/common/hook'

import LeftBar, { type LeftBarType, type LeftBarProps } from './LeftBar'
import MusicList, { type MusicListType } from '../MusicList'
import { getLeaderboardSetting, saveLeaderboardSetting } from '@/utils/data'
import { getBoardsList } from '@/core/leaderboard'
import { handlePlay } from '../listAction'
import boardState from '@/store/leaderboard/state'
import { CAR, carFontSize, useCarFontScale } from '@/components/car/constants'
import CarCard from '@/components/car/CarCard'

/**
 * 左列（榜单列表）宽度按界面缩放比例走：
 * 固定 px 时，界面缩放变大后左列装不下内容会挤压右侧歌曲列表
 */
const LEFT_WIDTH_PERCENT = Math.min(44, Math.round(30 * (global.lx.fontSize || 1)))


export default () => {
  const leftBarRef = useRef<LeftBarType>(null)
  const musicListRef = useRef<MusicListType>(null)
  const isUnmountedRef = useRef(false)
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const sourceNames = useSourceNames()
  const [board, setBoard] = useState<{ source: LX.OnlineSource, id: string, name: string }>({ source: 'kw', id: '', name: '' })

  const handleChangeBound: LeftBarProps['onChangeList'] = (source, id, name) => {
    setBoard({ source, id, name: name ?? '' })
    musicListRef.current?.loadList(source, id)
    void saveLeaderboardSetting({
      source,
      boardId: id,
    })
  }

  useEffect(() => {
    isUnmountedRef.current = false
    void getLeaderboardSetting().then(({ source, boardId }) => {
      leftBarRef.current?.setBound(source, boardId)
      musicListRef.current?.loadList(source, boardId)
      void getBoardsList(source).then(list => {
        if (isUnmountedRef.current) return
        const item = list.find(b => b.id == boardId)
        setBoard({ source, id: boardId, name: item?.name ?? '' })
      }).catch(() => {})
    })

    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  const handlePlayAll = () => {
    void handlePlay(board.id, boardState.listDetailInfo.list)
  }

  return (
    <View style={styles.container}>
      <CarCard style={styles.left}>
        <LeftBar
          ref={leftBarRef}
          onChangeList={handleChangeBound}
        />
      </CarCard>
      <CarCard style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text size={carFontSize(18, fontScale)} color={theme['c-font']} numberOfLines={1}>{board.name || '排行榜'}</Text>
            <Text style={styles.sub} size={carFontSize(12, fontScale)} color={theme['c-font']} numberOfLines={1}>
              {`${sourceNames[board.source] ?? board.source} · ${boardState.listDetailInfo.total} 首`}
            </Text>
          </View>
          <TouchableOpacity style={{ ...styles.playBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={handlePlayAll}>
            <Text size={carFontSize(13, fontScale)} color={theme['c-font']}>播放全部</Text>
          </TouchableOpacity>
        </View>
        <MusicList
          ref={musicListRef}
        />
      </CarCard>
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    gap: CAR.gap,
    paddingTop: CAR.padding,
    paddingLeft: CAR.padding,
    paddingRight: CAR.padding,
    paddingBottom: CAR.padding,
  },
  left: {
    width: `${LEFT_WIDTH_PERCENT}%`,
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    flex: 1,
    flexShrink: 1,
  },
  // 卡片头：矮屏上收薄一点，把高度让给列表
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  sub: {
    paddingTop: 2,
  },
  playBtn: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,


    alignItems: 'center',
    justifyContent: 'center',
  },
})
