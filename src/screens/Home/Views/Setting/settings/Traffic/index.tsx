import { memo, useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import Section from '../../components/Section'
import SubTitle from '../../components/SubTitle'
import Button from '../../components/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle, confirmDialog } from '@/utils/tools'
import { sizeFormate } from '@/utils/common'
import { clearTrafficStat, getTrafficDayList, getTrafficStat, type TrafficDayItem, type TrafficStat } from '@/core/trafficStat'

const emptyStat: TrafficStat = { days: {}, month: '', monthRx: 0, monthTx: 0 }

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const [stat, setStat] = useState<TrafficStat>(emptyStat)

  const load = useCallback(() => {
    void getTrafficStat().then(setStat)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleClear = useCallback(async() => {
    const isConfirm = await confirmDialog({ message: t('setting_traffic_clear_tip') }).catch(() => false)
    if (!isConfirm) return
    void clearTrafficStat().then(load)
  }, [load, t])

  const days = getTrafficDayList(stat.days)
  // 设置页本身就是一个纵向 FlatList，这里不能再嵌一个同方向的 VirtualizedList，
  // 会破坏 windowing 并触发 RN 警告；最多 30 行，直接渲染即可
  const renderDay = (item: TrafficDayItem, index: number) => (
    <View
      key={item.date}
      style={{
        ...styles.row,
        borderTopWidth: index ? 1 : 0,
        borderTopColor: theme['c-border-background'],
      }}
    >
      <Text style={styles.date} size={13} color={theme['c-font']}>{item.date}</Text>
      <Text style={styles.value} size={13} color={theme['c-primary-font']}>↓ {sizeFormate(item.rx)}</Text>
      <Text style={styles.value} size={13} color={theme['c-primary-font']}>↑ {sizeFormate(item.tx)}</Text>
    </View>
  )

  return (
    <Section title={t('setting_traffic')}>
      <SubTitle title={`${t('setting_traffic_month')} · ${stat.month}`}>
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text size={12} color={theme['c-font-label']}>{t('setting_traffic_rx')}</Text>
            <Text size={15} color={theme['c-font']}>{sizeFormate(stat.monthRx)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text size={12} color={theme['c-font-label']}>{t('setting_traffic_tx')}</Text>
            <Text size={15} color={theme['c-font']}>{sizeFormate(stat.monthTx)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text size={12} color={theme['c-font-label']}>{t('setting_traffic_total')}</Text>
            <Text size={15} color={theme['c-font']}>{sizeFormate(stat.monthRx + stat.monthTx)}</Text>
          </View>
        </View>
      </SubTitle>
      <SubTitle title={t('setting_traffic_daily')}>
        <View style={styles.listBox}>
          {
            days.length
              ? days.map(renderDay)
              : <Text style={styles.empty} size={13} color={theme['c-font-label']}>{t('setting_traffic_empty')}</Text>
          }
        </View>
        <View style={styles.footer}>
          <Text style={styles.tip} size={12} color={theme['c-font-label']}>{t('setting_traffic_tip')}</Text>
          <Button onPress={() => { void handleClear() }}>{t('setting_traffic_clear')}</Button>
        </View>
      </SubTitle>
    </Section>
  )
})

const styles = createStyle({
  summary: {
    flexDirection: 'row',
    paddingLeft: 8,
  },
  summaryItem: {
    flex: 1,
  },
  listBox: {
    paddingTop: 4,
  },
  row: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  date: {
    width: 110,
  },
  value: {
    flex: 1,
  },
  empty: {
    paddingTop: 20,
    paddingLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingLeft: 8,
  },
  tip: {
    flex: 1,
    flexShrink: 1,
    paddingRight: 10,
  },
})
