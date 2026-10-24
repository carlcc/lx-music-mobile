import { forwardRef, useImperativeHandle, useRef } from 'react'
import { ScrollView, TouchableOpacity, View, type GestureResponderEvent } from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useMyList } from '@/store/list/hook'
import { getListMusics, addListMusics, removeListMusics } from '@/core/list'
import { LIST_IDS } from '@/config/constant'
import playerState from '@/store/player/state'
import { createStyle, toast } from '@/utils/tools'
import { carPlayList, saveQueueToList } from './action'
import QueueList, { useQueueList } from './QueueList'
import { CAR, carFontSize, useCarFontScale } from './constants'
import CarBg from './CarBg'

export interface QueuePopupType {
  show: () => void
}

/**
 * 播放队列 = 匿名列表（临时列表）：
 * 可清空、添加歌曲、删除歌曲、保存为歌单；不显示来源歌单、不支持回跳。
 */
export default forwardRef<QueuePopupType>((_props, ref) => {
  const modalRef = useRef<ModalType>(null)
  const addModalRef = useRef<ModalType>(null)
  const cardLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const addCardLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const makeMaskHandler = (close: () => void, layoutRef: { current: { x: number, y: number, width: number, height: number } }) => (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent
    const l = layoutRef.current
    const inside = locationX >= l.x && locationX <= l.x + l.width && locationY >= l.y && locationY <= l.y + l.height
    if (!inside) close()
  }
  const handleMaskRelease = makeMaskHandler(() => { modalRef.current?.setVisible(false) }, cardLayoutRef)
  const handleAddMaskRelease = makeMaskHandler(() => { addModalRef.current?.setVisible(false) }, addCardLayoutRef)
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const myList = useMyList()

  // 与播放页队列复用同一套数据逻辑（当前播放列表）
  const { musics, refresh, remove, count } = useQueueList()

  useImperativeHandle(ref, () => ({
    show() {
      refresh()
      modalRef.current?.setVisible(true)
    },
  }))

  const handleClear = () => {
    if (!musics.length) {
      toast('播放队列已经是空的')
      return
    }
    const playingId = playerState.playMusicInfo.musicInfo?.id
    const ids = musics.filter(m => m.id != playingId).map(m => m.id)
    if (!ids.length) return
    void removeListMusics(playerState.playMusicInfo.listId ?? LIST_IDS.TEMP, ids).then(() => {
      toast('播放队列已清空')
      refresh()
    })
  }

  const handleSave = () => {
    void saveQueueToList(musics)
  }

  const handleSetAsQueue = (listId: string, name: string) => {
    void getListMusics(listId).then(list => {
      void carPlayList(`car_${listId}`, list as LX.Music.MusicInfoOnline[], 0).then(() => {
        toast(`「${name}」已设为播放队列`)
      })
      addModalRef.current?.setVisible(false)
    })
  }

  const handleAppend = (listId: string, name: string) => {
    void getListMusics(listId).then(list => {
      void addListMusics(playerState.playMusicInfo.listId ?? LIST_IDS.TEMP, list, 'bottom').then(() => {
        toast(`「${name}」已追加到队列末尾`)
        refresh()
      })
      addModalRef.current?.setVisible(false)
    })
  }

  return (
    <>
      <Modal ref={modalRef} bgColor="rgba(0, 0, 0, 0.6)">
        <View
          style={styles.center}
          onStartShouldSetResponder={() => true}
          onResponderRelease={handleMaskRelease}
        >
          <CarBg onLayout={({ nativeEvent }) => { cardLayoutRef.current = nativeEvent.layout }} style={{ ...styles.card, borderColor: theme['c-border-background'] }}>
            <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
              <Text size={carFontSize(16, fontScale)} color={theme['c-font']}>播放队列</Text>
              <Text style={styles.count} size={carFontSize(12, fontScale)} color={theme['c-font']}>{count} 首</Text>
            </View>
            <QueueList musics={musics} onRemove={remove} />
            <View style={{ ...styles.footer, borderTopColor: theme['c-border-background'] }}>
              <TouchableOpacity style={{ ...styles.footerBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={() => { addModalRef.current?.setVisible(true) }}>
                <Text size={carFontSize(13, fontScale)} color={theme['c-font']}>添加歌曲</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ ...styles.footerBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={handleSave}>
                <Text size={carFontSize(13, fontScale)} color={theme['c-font']}>保存为歌单</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ ...styles.footerBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={handleClear}>
                <Text size={carFontSize(13, fontScale)} color={theme['c-font']}>清空</Text>
              </TouchableOpacity>
            </View>
          </CarBg>
        </View>
      </Modal>

      <Modal ref={addModalRef} bgColor="rgba(0, 0, 0, 0.6)">
        <View
          style={styles.center}
          onStartShouldSetResponder={() => true}
          onResponderRelease={handleAddMaskRelease}
        >
          <CarBg onLayout={({ nativeEvent }) => { addCardLayoutRef.current = nativeEvent.layout }} style={{ ...styles.card, ...styles.addCard, borderColor: theme['c-border-background'] }}>
            <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
              <Text size={carFontSize(15, fontScale)} color={theme['c-font']}>从歌单添加到队列</Text>
            </View>
            <ScrollView style={styles.addBody} nestedScrollEnabled>
            {myList.map(item => (
              <View key={item.id} style={styles.addRow}>
                <Text style={styles.addName} size={carFontSize(14, fontScale)} color={theme['c-font']} numberOfLines={1}>{item.name}</Text>
                <TouchableOpacity style={{ ...styles.addBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={() => { handleSetAsQueue(item.id, item.name) }}>
                  <Text size={carFontSize(12.5, fontScale)} color={theme['c-primary-font']}>设为队列</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ ...styles.addBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={() => { handleAppend(item.id, item.name) }}>
                  <Text size={carFontSize(12.5, fontScale)} color={theme['c-font']}>追加</Text>
                </TouchableOpacity>
              </View>
            ))}
            <Text style={styles.tip} size={carFontSize(11.5, fontScale)} color={theme['c-font']}>也可以在任何列表点「＋」把单曲加入歌单。</Text>
            </ScrollView>
          </CarBg>
        </View>
      </Modal>
    </>
  )
})

const styles = createStyle({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 720,
    // 固定高度：保证内部列表一定溢出、可滚动
    height: '78%',
    borderRadius: CAR.radius + 4,
    borderWidth: 1,
    // 阴影让弹窗浮起，避免与后方 UI 混在一起
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  addCard: {
    width: 620,
    height: '66%',
  },
  addBody: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,

  },
  count: {
    marginLeft: 'auto',
  },
  list: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sn: {
    width: 40,
    textAlign: 'center',
  },
  rowInfo: {
    flex: 1,
    paddingRight: 8,
  },
  removeBtn: {
    width: CAR.actionBtnSize,
    height: CAR.actionBtnSize,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  empty: {
    paddingVertical: 40,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,

  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addRow: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addName: {
    flex: 1,
  },
  addBtn: {
    height: 42,
    paddingHorizontal: 16,
    marginLeft: 10,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tip: {
    paddingTop: 10,
  },
})
