import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { TouchableOpacity, View, type GestureResponderEvent } from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useMyList } from '@/store/list/hook'
import { useSettingValue } from '@/store/setting/hook'
import { LIST_IDS } from '@/config/constant'
import { addListMusics, createList } from '@/core/list'
import settingState from '@/store/setting/state'
import { formatDateTimeName } from '@/utils/common'
import { createStyle, toast } from '@/utils/tools'
import { CAR, carFontSize, useCarFontScale } from './constants'

export interface AddMusicPopoverType {
  show: (musicInfo: LX.Music.MusicInfo) => void
}

/**
 * 一级"加入歌单"浮层：点开即可选歌单，不需要先点出二级菜单
 */
export default forwardRef<AddMusicPopoverType>((_props, ref) => {
  const modalRef = useRef<ModalType>(null)
  const [musicInfo, setMusicInfo] = useState<LX.Music.MusicInfo | null>(null)
  const cardLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const handleMaskRelease = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent
    const l = cardLayoutRef.current
    const inside = locationX >= l.x && locationX <= l.x + l.width && locationY >= l.y && locationY <= l.y + l.height
    if (!inside) modalRef.current?.setVisible(false)
  }
  const myList = useMyList()
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const autoAddList = useSettingValue('car.autoAddDefaultList')
  const defaultListId = autoAddList == 'love' ? LIST_IDS.LOVE : LIST_IDS.DEFAULT

  useImperativeHandle(ref, () => ({
    show(info) {
      setMusicInfo(info)
      modalRef.current?.setVisible(true)
    },
  }))

  const handleAdd = (listId: string, name: string) => {
    if (!musicInfo) return
    void addListMusics(listId, [musicInfo], settingState.setting['list.addMusicLocationType']).then(() => {
      toast(`已加入「${name}」`)
    })
    modalRef.current?.setVisible(false)
  }

  const handleCreate = () => {
    if (!musicInfo) return
    // 精确到秒，同一天多次新建也不会重名
    const name = formatDateTimeName()
    // createList 的 id 默认是 `userlist_${Date.now()}`，不能拿名字去拼；
    // 直接把歌曲通过 list 参数传进去，由 createList 在建完之后写入
    void createList({ name, list: [musicInfo] }).then(() => {
      toast(`已新建歌单「${name}」并添加`)
    })
    modalRef.current?.setVisible(false)
  }

  return (
    <Modal ref={modalRef} bgColor="rgba(0, 0, 0, 0.6)">
      <View
          style={styles.center}
          onStartShouldSetResponder={() => true}
          onResponderRelease={handleMaskRelease}
        >
        <View style={{ ...styles.card, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'] }}>
          <View style={styles.header}>
            <Text size={carFontSize(15, fontScale)} color={theme['c-font']} numberOfLines={1}>
              {musicInfo ? `添加「${musicInfo.name}」到` : '添加到'}
            </Text>
          </View>
          {myList.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.item}
              activeOpacity={0.6}
              onPress={() => { handleAdd(item.id, item.name) }}
            >
              <Text size={carFontSize(14, fontScale)} color={item.id == defaultListId ? theme['c-primary-font'] : theme['c-font-label']} numberOfLines={1}>{item.name}</Text>
              {item.id == defaultListId ? <Text style={styles.defaultTag} size={carFontSize(11, fontScale)} color={theme['c-primary-font']}>默认</Text> : null}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.item} activeOpacity={0.6} onPress={handleCreate}>
            <Icon name="add-music" size={18} color={theme['c-font-label']} rawSize={18} />
            <Text style={styles.newText} size={carFontSize(14, fontScale)} color={theme['c-font-label']}>新建歌单并添加</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
})

const styles = createStyle({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 360,
    borderRadius: CAR.radius,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  header: {
    paddingBottom: 8,
  },
  item: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  defaultTag: {
    marginLeft: 'auto',
  },
  newText: {
    paddingLeft: 8,
  },
})
