import { getData, saveData } from '@/plugins/storage'
import { dateFormat, throttle } from '@/utils/common'
import { storageDataPrefix } from '@/config/constant'

/**
 * 网络流量统计
 * - 按天聚合（仅保留最近 30 天）
 * - 另外记录当前自然月的累计流量（跨月自动归零）
 * - 只统计能拿到字节数的部分：HTTP 请求 / 响应体、本地文件下载
 */

/** 单日流量 */
export interface TrafficDay {
  /** 下行（接收） */
  rx: number
  /** 上行（发送） */
  tx: number
}

export interface TrafficStat {
  /** 日期 key 为 Y-M-D */
  days: Record<string, TrafficDay>
  /** 当前统计所属自然月，Y-M */
  month: string
  monthRx: number
  monthTx: number
}

export interface TrafficDayItem extends TrafficDay {
  date: string
}

const MAX_DAYS = 30
const STORAGE_KEY = storageDataPrefix.traffic

const dayKeyOf = (time: number) => dateFormat(time, 'Y-M-D')
const monthKeyOf = (time: number) => dateFormat(time, 'Y-M')

let stat: TrafficStat | null = null
let loading: Promise<TrafficStat> | null = null

/** 超过 30 天的记录直接丢掉 */
const pruneDays = (days: Record<string, TrafficDay>) => {
  const keys = Object.keys(days).sort()
  if (keys.length <= MAX_DAYS) return
  for (const key of keys.slice(0, keys.length - MAX_DAYS)) delete days[key]
}

const createEmptyStat = (): TrafficStat => {
  const now = Date.now()
  return { days: {}, month: monthKeyOf(now), monthRx: 0, monthTx: 0 }
}

const loadStat = async(): Promise<TrafficStat> => {
  if (stat) return stat
  if (!loading) {
    loading = getData<TrafficStat>(STORAGE_KEY).then(data => {
      const current = data ?? createEmptyStat()
      current.days ??= {}
      current.monthRx ??= 0
      current.monthTx ??= 0
      // 跨月：本月累计归零
      const month = monthKeyOf(Date.now())
      if (current.month != month) {
        current.month = month
        current.monthRx = 0
        current.monthTx = 0
      }
      pruneDays(current.days)
      stat = current
      return stat
    })
  }
  return loading
}

const saveStatThrottled = throttle(() => {
  if (stat) void saveData(STORAGE_KEY, stat)
}, 2000)

/**
 * 累加流量
 * @param rx 下行（接收）字节数
 * @param tx 上行（发送）字节数
 */
export const addTraffic = (rx = 0, tx = 0) => {
  if (!rx && !tx) return
  void loadStat().then(current => {
    const now = Date.now()
    const dayKey = dayKeyOf(now)
    const month = monthKeyOf(now)
    if (current.month != month) {
      current.month = month
      current.monthRx = 0
      current.monthTx = 0
    }
    const day = current.days[dayKey] ?? { rx: 0, tx: 0 }
    day.rx += rx
    day.tx += tx
    current.days[dayKey] = day
    current.monthRx += rx
    current.monthTx += tx
    pruneDays(current.days)
    saveStatThrottled()
  }).catch(() => {})
}

/** 读取统计（返回副本，避免外部直接改内存对象） */
export const getTrafficStat = async(): Promise<TrafficStat> => {
  const current = await loadStat()
  return {
    days: { ...current.days },
    month: current.month,
    monthRx: current.monthRx,
    monthTx: current.monthTx,
  }
}

/** 按日期倒序（新的在前）展开成列表 */
export const getTrafficDayList = (days: Record<string, TrafficDay>): TrafficDayItem[] => {
  return Object.keys(days).sort().reverse().map(date => ({ date, rx: days[date].rx, tx: days[date].tx }))
}

export const clearTrafficStat = async(): Promise<void> => {
  const current = await loadStat()
  current.days = {}
  current.month = monthKeyOf(Date.now())
  current.monthRx = 0
  current.monthTx = 0
  await saveData(STORAGE_KEY, current)
}
