import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useSourceNames } from '@/store/common/hook'
import { createStyle } from '@/utils/tools'
import { getTags } from '@/core/songlist'
import songlistState, { type Source } from '@/store/songlist/state'
import { CAR, carFontSize, useCarFontScale } from './constants'
import CarBg from './CarBg'

export interface CarFilterPopupInfo {
  source: Source
  sortId: string
  tagId: string
  tagName: string
}
export interface CarFilterPopupType {
  show: () => void
}

interface Props {
  info: CarFilterPopupInfo
  onSortChange: (sortId: string) => void
  onTagChange: (tagName: string, tagId: string) => void
  onSourceChange: (source: Source) => void
  onReset: () => void
}

/**
 * 车机歌单筛选弹窗：排序 / 分类 / 音源平台
 * 受数据 model 限制，三者都是单值，改动即时生效
 */
export default forwardRef<CarFilterPopupType, Props>(({
  info, onSortChange, onTagChange, onSourceChange, onReset,
}, ref) => {
  const modalRef = useRef<ModalType>(null)
  const theme = useTheme()
  const fontScale = useCarFontScale()
  const sourceNames = useSourceNames()
  const [tags, setTags] = useState<Array<{ name: string, id: string }>>([])

  useImperativeHandle(ref, () => ({
    show() {
      modalRef.current?.setVisible(true)
    },
  }))

  useEffect(() => {
    let ignore = false
    void getTags(info.source).then(tagInfo => {
      if (ignore || !tagInfo) return
      const list: Array<{ name: string, id: string }> = []
      for (const type of tagInfo.hotTag) list.push({ name: type.name, id: type.id })
      for (const type of tagInfo.tags) {
        for (const tag of type.list) {
          if (list.some(t => t.id == tag.id)) continue
          list.push({ name: tag.name, id: tag.id })
        }
      }
      setTags(list)
    }).catch(() => {})
    return () => { ignore = true }
  }, [info.source])

  const sorts = songlistState.sortList[info.source] ?? []
  const sources = songlistState.sources

  return (
    <Modal ref={modalRef} bgColor="rgba(0, 0, 0, 0.5)">
      <View style={styles.center}>
        <CarBg style={{ ...styles.card, borderColor: theme['c-border-background'] }}>
          <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
            <Text size={carFontSize(16, fontScale)} color={theme['c-font']}>筛选</Text>
            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.6} onPress={() => { modalRef.current?.setVisible(false) }}>
              <Icon name="close" size={18} color={theme['c-font']} rawSize={18} />
            </TouchableOpacity>
          </View>

          {/* 内容较多时可滚动（分类按钮可能有几十个） */}
          <ScrollView style={styles.body} nestedScrollEnabled>
          <View style={styles.group}>
            <Text style={styles.groupTitle} size={carFontSize(13, fontScale)} color={theme['c-font']}>排序</Text>
            <View style={styles.flow}>
              {sorts.map(sort => (
                <TouchableOpacity
                  key={sort.id}
                  style={{ ...styles.toggle, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'], ...(sort.id == info.sortId ? { ...styles.toggleActive, borderColor: theme['c-primary-font'] } : null) }}
                  activeOpacity={0.6}
                  onPress={() => { onSortChange(sort.id) }}
                >
                  <Text size={carFontSize(13, fontScale)} color={sort.id == info.sortId ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>{sort.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.groupTitle} size={carFontSize(13, fontScale)} color={theme['c-font']}>音源平台</Text>
            <View style={styles.flow}>
              {sources.map(source => (
                <TouchableOpacity
                  key={source}
                  style={{ ...styles.toggle, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'], ...(source == info.source ? { ...styles.toggleActive, borderColor: theme['c-primary-font'] } : null) }}
                  activeOpacity={0.6}
                  onPress={() => { onSourceChange(source) }}
                >
                  <Text size={carFontSize(13, fontScale)} color={source == info.source ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>{sourceNames[source] ?? source}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.groupTitle} size={carFontSize(13, fontScale)} color={theme['c-font']}>分类</Text>
            <View style={styles.flow}>
              <TouchableOpacity
                style={{ ...styles.toggle, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'], ...(!info.tagId ? { ...styles.toggleActive, borderColor: theme['c-primary-font'] } : null) }}
                activeOpacity={0.6}
                onPress={() => { onTagChange('', '') }}
              >
                <Text size={carFontSize(13, fontScale)} color={!info.tagId ? theme['c-primary-font'] : theme['c-font']}>不限</Text>
              </TouchableOpacity>
              {tags.map(tag => (
                <TouchableOpacity
                  key={tag.id}
                  style={{ ...styles.toggle, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'], ...(tag.id == info.tagId ? { ...styles.toggleActive, borderColor: theme['c-primary-font'] } : null) }}
                  activeOpacity={0.6}
                  onPress={() => { onTagChange(tag.name, tag.id) }}
                >
                  <Text size={carFontSize(13, fontScale)} color={tag.id == info.tagId ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={{ ...styles.footerBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={onReset}>
              <Text size={carFontSize(13, fontScale)} color={theme['c-font']}>重置</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ ...styles.footerBtn, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-background'] }} activeOpacity={0.6} onPress={() => { modalRef.current?.setVisible(false) }}>
              <Text size={carFontSize(13, fontScale)} color={theme['c-font']}>完成</Text>
            </TouchableOpacity>
          </View>
        </CarBg>
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
    width: 780,
    maxHeight: '84%',
    borderRadius: CAR.radius + 4,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,

  },
  closeBtn: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  group: {
    paddingTop: 14,
  },
  groupTitle: {
    paddingBottom: 8,
  },
  // 流式布局：按钮宽度随内容，不撑满
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  toggle: {
    height: 42,
    paddingHorizontal: 15,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {

    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    marginTop: 6,
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
})
