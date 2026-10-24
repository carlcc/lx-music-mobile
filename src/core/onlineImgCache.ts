import { downloadFile, mkdir, readDir, stat, temporaryDirectoryPath, unlink } from '@/utils/fs'
import { getData, saveData } from '@/plugins/storage'
import { toMD5 } from '@/utils/tools'

/**
 * 在线歌单/榜单封面本地缓存：命中缓存直接用本地文件，避免重复下载、节约流量
 * 缓存天数由设置 car.imgCacheDays 控制，0 表示不缓存
 */

const CACHE_DIR = `${temporaryDirectoryPath}/online_img`
const CACHE_KEY = '@online_img_cache_v1'
const DAY = 24 * 60 * 60 * 1000

let meta: Record<string, number> | null = null
let metaLoading: Promise<Record<string, number>> | null = null

const loadMeta = async(): Promise<Record<string, number>> => {
  if (meta) return meta
  if (!metaLoading) {
    metaLoading = getData<Record<string, number>>(CACHE_KEY).then(data => {
      meta = data ?? {}
      return meta
    })
  }
  return metaLoading
}

const filePath = (url: string) => `${CACHE_DIR}/${toMD5(url)}`

/** 启动时清理过期缓存 */
export const initOnlineImgCache = async(days: number) => {
  const data = await loadMeta()
  if (days <= 0) return
  const now = Date.now()
  let changed = false
  for (const url of Object.keys(data)) {
    const time = data[url]
    if (now - time > days * DAY) {
      void unlink(filePath(url)).catch(() => {})
      delete data[url]
      changed = true
    }
  }
  if (changed) void saveData(CACHE_KEY, data)
}

/** 获取未过期的本地缓存路径，没有则返回 null；命中会刷新该条目的过期时间（滑动 TTL） */
export const getCachedImage = async(url: string, days: number): Promise<string | null> => {
  if (!url || days <= 0) return null
  const data = await loadMeta()
  const time: number | undefined = data[url]
  if (time == null) return null
  if (Date.now() - time > days * DAY) return null
  const path = filePath(url)
  try {
    const result = await stat(path)
    if (result.size > 0) {
      // 被访问即续期：以最后一次访问时间起算
      data[url] = Date.now()
      void saveData(CACHE_KEY, data)
      return path
    }
  } catch {}
  return null
}

/** 封面缓存当前占用的磁盘大小（字节） */
export const getOnlineImgCacheSize = async(): Promise<number> => {
  try {
    const files = await readDir(CACHE_DIR).catch(() => [] as string[])
    let total = 0
    for (const file of files) {
      const name = typeof file == 'string' ? file : String(file)
      if (name.startsWith('.')) continue
      const path = name.startsWith('/') ? name : `${CACHE_DIR}/${name}`
      const result = await stat(path).catch(() => null)
      if (result?.size) total += result.size
    }
    return total
  } catch {
    return 0
  }
}

/** 下载并登记缓存，返回本地路径 */
export const cacheImage = async(url: string): Promise<string | null> => {
  if (!url) return null
  try {
    await mkdir(CACHE_DIR)
    const path = filePath(url)
    await downloadFile(url, path).promise
    const data = await loadMeta()
    data[url] = Date.now()
    void saveData(CACHE_KEY, data)
    return path
  } catch {
    return null
  }
}
