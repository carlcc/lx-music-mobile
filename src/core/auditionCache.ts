import { downloadFile, existsFile, extname, externalStorageDirectoryPath, mkdir, readDir, readFile, stat, temporaryDirectoryPath, unlink, writeFile } from '@/utils/fs'
import { getData, saveData } from '@/plugins/storage'
import { readMetadata } from '@/utils/localMediaMetadata'
import { formatPlayTime2 } from '@/utils/common'
import settingState from '@/store/setting/state'
import { getPlayQuality } from '@/core/music/utils'
import { requestStoragePermission, toast } from '@/utils/tools'
import { log } from '@/utils/log'

/**
 * 音乐缓存（在线歌曲音频文件）
 * - 缓存到外部存储指定目录（默认 Music/lxcache）
 * - 文件名：歌名-歌手-平台-音质.后缀，切换音质会落到不同的文件
 * - 不按时间过期：只有当"所有歌单都不再引用这首歌曲"时才清理
 * - 有记录但文件不存在 / 大小不匹配（损坏）→ 视为未命中，重新下载
 */

const META_KEY = '@audition_cache_v1'
const DEFAULT_DIR = 'Music/lxcache'
/** meta key 中「歌曲 id」与「音质」的分隔符 */
const QUALITY_SPLIT = '__q__'

/** 索引里存的歌曲信息：来自音频文件的 tag（与在线无关），读不到时留空由文件名兜底 */
export interface CacheTag {
  name: string
  singer: string
  albumName: string
  /** 秒；展示时用 formatPlayTime2 转成 "03:55" */
  interval?: number
  ext?: string
}

/** 一条缓存歌曲（按 歌名+歌手+专辑 合并后的展示单元） */
export interface CachedMusicItem {
  /** 合并键：name + '\u0000' + singer + '\u0000' + albumName */
  songKey: string
  name: string
  singer: string
  albumName: string
  /** 秒；来自文件 tag，缺失时为 undefined */
  interval?: number
  /** 该歌曲已缓存的音质，如 ['flac', '128k'] */
  qualities: string[]
  /** 播放实际使用的那份：优先当前设置音质 → 最高音质 → 最近缓存 */
  path: string
  size: number
  time: number
  /** 是否由文件名解析兜底（文件 tag 缺失） */
  fromFileName: boolean
}

/** 可扩展的过滤维度：本期只落地 singer */
export type CacheFilterKey = 'singer' | 'album' | 'quality'
export interface CacheFilterOption { value: string, count: number }

interface MetaItem { path: string, size: number, time: number, quality?: string, tag?: CacheTag }
type Meta = Record<string, MetaItem>

let meta: Meta | null = null
let metaLoading: Promise<Meta> | null = null
let cacheDirCache: string | null = null

const loadMeta = async(): Promise<Meta> => {
  if (meta) return meta
  if (!metaLoading) {
    metaLoading = getData<Meta>(META_KEY).then(data => {
      meta = data ?? {}
      return meta
    })
  }
  return metaLoading
}

/** 默认缓存目录：外部存储根目录下的 Music/lxcache（绝对路径） */
export const getDefaultAuditionCacheDir = (): string => `${externalStorageDirectoryPath}/${DEFAULT_DIR}`.replace(/\/+/g, '/')

/** 外部存储不可写时的回退目录（应用私有目录，无需权限） */
const getFallbackDir = (): string => `${temporaryDirectoryPath}/${DEFAULT_DIR}`.replace(/\/+/g, '/')

let fallbackDir: string | null = null

/** 缓存目录：设置为空则回退到默认绝对路径；相对路径会拼到外部存储根目录 */
export const getAuditionCacheDir = (): string => {
  if (fallbackDir) return fallbackDir
  if (cacheDirCache) return cacheDirCache
  const dir = settingState.setting['car.auditionCacheDir']
  if (!dir) {
    cacheDirCache = getDefaultAuditionCacheDir()
    return cacheDirCache
  }
  cacheDirCache = dir.startsWith('/') ? dir : `${externalStorageDirectoryPath}/${dir}`.replace(/\/+/g, '/')
  return cacheDirCache
}

/** 写入探测：能 mkdir 且能写文件才算可用 */
const testWritable = async(dir: string): Promise<boolean> => {
  try {
    await mkdir(dir)
    const probe = `${dir}/.lx_probe`
    await writeFile(probe, '1')
    await unlink(probe).catch(() => {})
    return true
  } catch {
    return false
  }
}

/** 从 url 推断音频后缀，推断不出来返回 null */
const extnameFromUrl = (url: string): string | null => {
  const match = url.match(/\.(mp3|flac|wav|m4a|ogg|aac|ape)(\?|#|$)/i)
  return match ? match[1].toLowerCase() : null
}

/** 音质对应的默认后缀 */
const QUALITY_EXTS: Record<string, string> = {
  flac24bit: 'flac',
  flac: 'flac',
  ape: 'ape',
  wav: 'wav',
  '320k': 'mp3',
  '192k': 'mp3',
  '128k': 'mp3',
}

/**
 * 当前这首歌实际会使用的音质（与 getMusicUrl 的取法保持一致）
 * 取不到时按 128k 处理，保证同一次播放里"取缓存"和"写缓存"算出同一个文件名
 */
const getCacheQuality = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): string => {
  try {
    return getPlayQuality(settingState.setting['player.playQuality'], musicInfo as LX.Music.MusicInfoOnline)
  } catch {
    return '128k'
  }
}

/**
 * 字段净化：文件系统非法字符**以及下划线**都换成中划线，并限长
 *
 * 分隔符是 '_'，所以字段里绝不能出现 '_' —— 这样文件名里的 '_' 只可能是分隔符：
 * - 解析无歧义（按 '_' 切分即得各字段）
 * - 编码是单射：不会出现两首不同的歌映射到同一个文件名（否则会互相覆盖、播放到错误的音频）
 * 中划线保留在字段内，因为它更像自然语言里的语义符号
 */
const safeField = (text?: string) => (text ?? '').replace(/[\\/:*?"<>|\n\r\t_]/g, '-').trim().slice(0, 40) || 'unknown'

/** 文件名规则：歌名_歌手_平台_音质.后缀 */
const buildFileName = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, url: string, quality: string) => {
  const info = musicInfo as unknown as { name?: string, singer?: string, source?: string }
  const ext = extnameFromUrl(url) ?? QUALITY_EXTS[quality] ?? 'mp3'
  return `${safeField(info.name)}_${safeField(info.singer)}_${safeField(info.source)}_${safeField(quality)}.${ext}`
}

/**
 * 基名：歌名_歌手_平台（即音频文件名去掉音质部分）
 * 歌词与封面都用这个基名 → 同一首歌换音质不会重复下载，只存一份
 */
export const buildBaseName = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const info = musicInfo as unknown as { name?: string, singer?: string, source?: string }
  return `${safeField(info.name)}_${safeField(info.singer)}_${safeField(info.source)}`
}

/** 歌词 sidecar 路径：基名.lrc */
export const getCacheLyricPath = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) =>
  `${getAuditionCacheDir()}/${buildBaseName(musicInfo)}.lrc`

/**
 * 由音频文件路径推导基名（去掉扩展名与音质段）
 * 离线播放时 MusicInfoLocal.source 是 'local'，与缓存时用的平台值（kw/kg…）不同，
 * 所以读取侧一律用音频路径推导，保证与写入时的基名一致
 */
const baseFromAudioPath = (audioPath: string): string => {
  const fileName = audioPath.split('/').pop() ?? ''
  const base = fileName.replace(/\.[^.]+$/, '')
  const index = base.lastIndexOf('_')
  return index > 0 ? base.slice(0, index) : base
}

/** 按音频文件路径取歌词 sidecar 路径 */
export const getCacheLyricPathByAudio = (audioPath: string) =>
  `${getAuditionCacheDir()}/${baseFromAudioPath(audioPath)}.lrc`

/** 按音频文件路径查找已缓存的封面 */
export const findCachePicPathByAudio = async(audioPath: string): Promise<string | null> => {
  const base = `${getAuditionCacheDir()}/${baseFromAudioPath(audioPath)}`
  for (const ext of PIC_EXTS) {
    const path = `${base}.${ext}`
    if (await existsFile(path).catch(() => false)) return path
  }
  return null
}

/** 按音频文件路径读歌词 sidecar */
export const readCacheLyricByAudio = async(audioPath: string): Promise<string | null> => {
  const path = getCacheLyricPathByAudio(audioPath)
  if (!await existsFile(path).catch(() => false)) return null
  return readFile(path).catch(() => null)
}

/** 封面可能的后缀，查找时按这个顺序试 */
const PIC_EXTS: string[] = ['jpg', 'jpeg', 'png', 'webp']

/** 从图片 url 推断后缀，推断不出来用 jpg */
const picExtFromUrl = (url: string): string => {
  const match = url.match(/\.(jpe?g|png|webp)(?:\?|#|$)/i)
  return match ? match[1].toLowerCase() : 'jpg'
}

/** 按 url 推断后缀拼出封面应写入的路径 */
const buildCachePicPath = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, url: string) =>
  `${getAuditionCacheDir()}/${buildBaseName(musicInfo)}.${picExtFromUrl(url)}`

/**
 * 已存在的封面文件路径（后缀可能是任意一种，逐个试）
 * 没有则返回 null
 */
export const findCachePicPath = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): Promise<string | null> => {
  const base = `${getAuditionCacheDir()}/${buildBaseName(musicInfo)}`
  for (const ext of PIC_EXTS) {
    const path = `${base}.${ext}`
    if (await existsFile(path).catch(() => false)) return path
  }
  return null
}

/** 歌词是否已缓存 */
export const hasCacheLyric = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): Promise<boolean> =>
  await existsFile(getCacheLyricPath(musicInfo)).catch(() => false)

/** 写歌词 sidecar（已存在则跳过，避免重复写）；只针对在线歌曲，本地歌曲本来就有本地歌词 */
export const saveCacheLyric = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, lrcText: string): Promise<boolean> => {
  try {
    if (!settingState.setting['car.auditionCache']) return false
    if ('progress' in musicInfo || musicInfo.source == 'local') return false
    if (!lrcText) return false
    const path = getCacheLyricPath(musicInfo)
    if (await existsFile(path).catch(() => false)) return true
    await mkdir(getAuditionCacheDir())
    await writeFile(path, lrcText)
    return true
  } catch (err) {
    log.warn('save cache lyric failed: ' + (err as Error).message)
    return false
  }
}

/** 读歌词 sidecar，没有返回 null */
export const readCacheLyric = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): Promise<string | null> => {
  const path = getCacheLyricPath(musicInfo)
  if (!await existsFile(path).catch(() => false)) return null
  return readFile(path).catch(() => null)
}

/**
 * 下载并缓存封面（已存在则跳过）
 * url 为空或已是本地文件时直接返回 false
 */
export const saveCachePic = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, url: string): Promise<boolean> => {
  try {
    if (!settingState.setting['car.auditionCache']) return false
    if ('progress' in musicInfo || musicInfo.source == 'local') return false
    if (!url) return false
    if (await findCachePicPath(musicInfo)) return true
    await mkdir(getAuditionCacheDir())
    const path = buildCachePicPath(musicInfo, url)
    // 已经是本地文件（例如走了别的图片缓存）→ 直接复制，不必再下载一次
    if (url.startsWith('file://') || url.startsWith('/')) {
      const src = url.startsWith('file://') ? url.slice(7) : url
      const data = await readFile(src, 'base64').catch(() => null)
      if (!data) return false
      await writeFile(path, data, 'base64')
    } else {
      await downloadFile(url, path).promise
    }
    const result = await stat(path).catch(() => null)
    if (!result?.size) {
      void unlink(path).catch(() => {})
      return false
    }
    log.info('cache pic saved: ' + path)
    return true
  } catch (err) {
    log.warn('save cache pic failed: ' + (err as Error).message + ' url=' + url)
    return false
  }
}

/**
 * 缓存文件信息：路径 + 映射 key（同一首歌不同音质各存一份）
 * quality 传实际音质（接口可能回退到低音质）；不传时按当前设置的音质推算
 */
const getCacheFileInfo = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, url: string, quality?: LX.Quality | null) => {
  const targetQuality = quality ?? getCacheQuality(musicInfo)
  return { key: `${musicInfo.id}${QUALITY_SPLIT}${targetQuality}`, quality: targetQuality, path: `${getAuditionCacheDir()}/${buildFileName(musicInfo, url, targetQuality)}` }
}

const isDownloadItem = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): boolean => 'progress' in musicInfo

/**
 * 获取可用的本地缓存路径，没有则返回 null（调用方会用远程地址播放，并触发后台缓存）
 */
export const getAuditionCachePath = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, url: string, quality?: LX.Quality | null): Promise<string | null> => {
  try {
    if (!settingState.setting['car.auditionCache']) return null
    if (isDownloadItem(musicInfo) || !url) return null
    const data = await loadMeta()
    const { key } = getCacheFileInfo(musicInfo, url, quality)
    const item = data[key]
    if (!item) return null
    const result = await stat(item.path)
    // 文件不存在或大小不一致（损坏/未完成）→ 视为未命中
    if (result.size <= 0 || (item.size > 0 && result.size != item.size)) {
      void unlink(item.path).catch(() => {})
      delete data[key]
      void saveData(META_KEY, data)
      return null
    }
    return item.path
  } catch {
    return null
  }
}

/** 这首歌是否已经有一份可用的缓存文件 */
export const isAuditionCached = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): Promise<boolean> => {
  try {
    if (!settingState.setting['car.auditionCache']) return false
    if (isDownloadItem(musicInfo)) return false
    const data = await loadMeta()
    const { key } = getCacheFileInfo(musicInfo, '', null)
    const item = data[key]
    if (!item) return false
    const result = await stat(item.path)
    return result.size > 0 && (item.size <= 0 || result.size == item.size)
  } catch {
    return false
  }
}

/** 下载并登记缓存 */
export const cacheAuditionMusic = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, url: string, quality?: LX.Quality | null): Promise<string | null> => {
  try {
    if (!settingState.setting['car.auditionCache']) return null
    if (isDownloadItem(musicInfo) || !url) return null
    await mkdir(getAuditionCacheDir())
    const { key, quality: targetQuality, path } = getCacheFileInfo(musicInfo, url, quality)
    await downloadFile(url, path).promise
    const result = await stat(path)
    if (result.size <= 0) {
      void unlink(path).catch(() => {})
      return null
    }
    const data = await loadMeta()
    // 缓存时读一次文件 tag 存进索引：列表页打开时只读索引，不必逐文件解析
    let tag: CacheTag | undefined
    try {
      const metadata = await readMetadata(path).catch(() => null)
      if (metadata?.name) {
        tag = {
          name: metadata.name,
          singer: metadata.singer ?? '',
          albumName: metadata.albumName ?? '',
          interval: metadata.interval,
          ext: metadata.ext,
        }
      }
    } catch {}
    data[key] = { path, size: result.size, quality: targetQuality, time: Date.now(), tag }
    await saveData(META_KEY, data)
    global.app_event.auditionCacheChanged()
    return path
  } catch (err) {
    log.warn('audition cache download failed: ' + (err as Error).message)
    return null
  }
}

/** 音质越好权重越高，用于「同一首歌多份缓存时挑哪份」 */
const QUALITY_WEIGHT: Record<string, number> = {
  flac24bit: 6,
  flac: 5,
  ape: 4,
  wav: 3,
  '320k': 2,
  '192k': 1.5,
  '128k': 1,
}

/**
 * 从音频文件名兜底解析 歌名 / 歌手（文件 tag 缺失时用）
 * 文件名规则：歌名_歌手_平台_音质.后缀
 * 字段内不会出现 '_'，所以按 '_' 切分就是准确的（歌名里的中划线不会被破坏）
 */
const parseCacheFileName = (fileName: string): { name: string, singer: string, albumName: string } => {
  const base = fileName.replace(/\.[^.]+$/, '')
  const parts = base.split('_')
  if (parts.length == 4) {
    const [name, singer, source, quality] = parts
    // 平台（source）是已知的几个值之一，才算解析成功
    if (name && singer && /^(kw|kg|tx|wy|mg|local)$/.test(source) && quality) {
      return { name, singer, albumName: '' }
    }
  }
  return { name: base, singer: '', albumName: '' }
}

interface CacheGroup {
  name: string
  singer: string
  albumName: string
  interval?: number
  items: Array<{ path: string, size: number, time: number, quality: string, fromFileName: boolean }>
}

/** 按「歌名+歌手+专辑」把 meta 里的缓存文件分组（tag 缺失时用文件名兜底） */
const groupMeta = (data: Meta): Map<string, CacheGroup> => {
  const groups = new Map<string, CacheGroup>()
  for (const item of Object.values(data)) {
    const fileName = item.path.split('/').pop() ?? ''
    const tag = item.tag
    const parsed = parseCacheFileName(fileName)
    // 文件没有内嵌 tag 时，readMetadata 会把文件名原样当成标题返回 —— 这种值不能信
    const tagName = tag?.name?.trim() ?? ''
    const hasRealTag = !!tagName && tagName != fileName.replace(/\.[^.]+$/, '')
    const info = {
      // tag 的歌手经常是空的（在线音频多不带歌手 tag），这时回退用文件名解析
      name: hasRealTag ? tagName : parsed.name,
      // 注意：trim() 后可能是空串，空串也要回退，所以用 || 而不是 ??（已加 eslint 例外说明）
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      singer: tag?.singer?.trim() || parsed.singer,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      albumName: tag?.albumName?.trim() || '',
    }
    const songKey = `${info.name}\u0000${info.singer}\u0000${info.albumName}`
    let group = groups.get(songKey)
    if (!group) {
      group = { ...info, interval: tag?.interval, items: [] }
      groups.set(songKey, group)
    }
    if (tag?.interval && !group.interval) group.interval = tag.interval
    group.items.push({
      path: item.path,
      size: item.size,
      time: item.time,
      quality: item.quality ?? '',
      fromFileName: !hasRealTag,
    })
  }
  return groups
}

/** 多个音质里最高的那个（列表展示用：同一首歌缓存了多份时只显示最高音质） */
export const pickBestQuality = (qualities: string[]): string => {
  if (!qualities.length) return ''
  return [...qualities].sort((a, b) => (QUALITY_WEIGHT[b] ?? 0) - (QUALITY_WEIGHT[a] ?? 0))[0]
}

/** 同一首歌有多份（不同音质）时挑一份用于播放：当前设置音质 → 最高音质 → 最近缓存 */
const pickBest = (items: CacheGroup['items'], currentQuality: string) => {
  const preferred = items.find(item => item.quality == currentQuality)
  if (preferred) return preferred
  return [...items].sort((a, b) => {
    const diff = (QUALITY_WEIGHT[b.quality] ?? 0) - (QUALITY_WEIGHT[a.quality] ?? 0)
    return diff != 0 ? diff : b.time - a.time
  })[0]
}

/** 缓存里的全部歌曲（按 歌名+歌手+专辑 合并），只读索引，不解析文件 */
export const getCachedMusicList = async(): Promise<CachedMusicItem[]> => {
  const data = await loadMeta()
  const currentQuality = settingState.setting['player.playQuality']
  const list: CachedMusicItem[] = []
  for (const [songKey, group] of groupMeta(data)) {
    const best = pickBest(group.items, currentQuality)
    list.push({
      songKey,
      name: group.name,
      singer: group.singer,
      albumName: group.albumName,
      interval: group.interval,
      qualities: [...new Set(group.items.map(item => item.quality).filter(Boolean))],
      path: best.path,
      size: best.size,
      time: best.time,
      fromFileName: best.fromFileName,
    })
  }
  list.sort((a, b) => b.time - a.time)
  return list
}

/** 把一条缓存歌曲构造成可播放的本地歌曲信息（source: local） */
export const buildOfflineMusicInfo = (item: CachedMusicItem): LX.Music.MusicInfoLocal => ({
  id: item.path,
  name: item.name,
  singer: item.singer,
  source: 'local',
  interval: item.interval ? formatPlayTime2(item.interval) : null,
  meta: {
    albumName: item.albumName,
    filePath: item.path,
    songId: item.path,
    picUrl: '',
    ext: extname(item.path),
  },
})

/**
 * 歌手名提取：多个歌手用顿号「、」分隔
 * 没有提取到歌手时返回 ['']，即归入「未知歌手」
 */
export const splitSingers = (singer: string): string[] => {
  const list = (singer ?? '').split('、').map(item => item.trim()).filter(Boolean)
  return list.length ? list : ['']
}

/** 这首歌是否属于某个歌手（'' 表示未知歌手） */
export const matchSinger = (singer: string, target: string) => splitSingers(singer).includes(target)

/** 某个维度的可选项（带歌曲数）：数量降序，同数量按名称 */
export const getCachedFilterOptions = (list: CachedMusicItem[], key: CacheFilterKey): CacheFilterOption[] => {
  const counts = new Map<string, number>()
  for (const item of list) {
    if (key == 'quality') {
      for (const quality of item.qualities) counts.set(quality, (counts.get(quality) ?? 0) + 1)
      continue
    }
    if (key == 'singer') {
      // 一首歌可能有多个歌手，每个歌手都算一项
      for (const singer of splitSingers(item.singer)) counts.set(singer, (counts.get(singer) ?? 0) + 1)
      continue
    }
    counts.set(item.albumName, (counts.get(item.albumName) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

/** 删除某首歌的全部缓存：所有音质的音频 + 共享的歌词与封面 + meta 记录 */
export const deleteAuditionCache = async(songKey: string): Promise<void> => {
  const data = await loadMeta()
  const group = groupMeta(data).get(songKey)
  if (!group) return
  const paths = new Set(group.items.map(item => item.path))
  for (const [key, item] of Object.entries(data)) {
    if (!paths.has(item.path)) continue
    void unlink(item.path).catch(() => {})
    delete data[key]
  }
  // 这首歌已经没有音频了 → 它配套的歌词与封面也没用了
  // 基名一律由音频路径推导（去掉音质段），不用字段反拼，避免任何歧义
  const dir = getAuditionCacheDir()
  for (const base of new Set(group.items.map(item => baseFromAudioPath(item.path)))) {
    void unlink(`${dir}/${base}.lrc`).catch(() => {})
    for (const ext of PIC_EXTS) void unlink(`${dir}/${base}.${ext}`).catch(() => {})
  }
  await saveData(META_KEY, data)
  global.app_event.auditionCacheChanged()
}

/** 重新扫描：逐个读文件 tag 重写索引（限流并发 5），返回刷新后的列表 */
export const rescanAuditionCache = async(): Promise<CachedMusicItem[]> => {
  const data = await loadMeta()
  const entries = Object.entries(data)
  const CONCURRENCY = 5
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(entries.slice(i, i + CONCURRENCY).map(async([, item]) => {
      const metadata = await readMetadata(item.path).catch(() => null)
      if (!metadata?.name) return
      item.tag = {
        name: metadata.name,
        singer: metadata.singer ?? '',
        albumName: metadata.albumName ?? '',
        interval: metadata.interval,
        ext: metadata.ext,
      }
    }))
  }
  await saveData(META_KEY, data)
  global.app_event.auditionCacheChanged()
  return getCachedMusicList()
}

/** 音乐缓存（已下载的歌曲文件）当前占用的磁盘大小（字节） */
/** 音频文件对应的基名（去掉音质段）：歌名-歌手-平台 */
const baseOfPath = (path: string): string => {
  const fileName = path.split('/').pop() ?? ''
  const base = fileName.replace(/\.[^.]+$/, '')
  const index = base.lastIndexOf('_')
  return index > 0 ? base.slice(0, index) : base
}

export const getAuditionCacheSize = async(): Promise<number> => {
  try {
    const data = await loadMeta()
    const dir = getAuditionCacheDir()
    let total = 0
    // 歌词与封面按基名去重：同一首歌的多份音质共用一份，不能重复计
    const counted = new Set<string>()
    for (const item of Object.values(data)) {
      const result = await stat(item.path).catch(() => null)
      if (result?.size) total += result.size
      const base = baseOfPath(item.path)
      if (counted.has(base)) continue
      counted.add(base)
      const lrc = await stat(`${dir}/${base}.lrc`).catch(() => null)
      if (lrc?.size) total += lrc.size
      for (const ext of PIC_EXTS) {
        const pic = await stat(`${dir}/${base}.${ext}`).catch(() => null)
        if (pic?.size) {
          total += pic.size
          break
        }
      }
    }
    return total
  } catch {
    return 0
  }
}

/** 缓存文件的扩展名，兜底清理时只处理这些文件，避免误删用户在缓存目录里放的其它东西 */
const CACHE_FILE_EXTS = ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac', 'ape']

/**
 * 新命名下音频文件名固定是「歌名_歌手_平台_音质」，即恰好 3 个下划线
 * （字段里的下划线已被 safeField 换成中划线，所以 '_' 只可能是分隔符）
 * 不符合的就是旧格式文件
 */
const isNewSchemePath = (path: string) => {
  const fileName = path.split('/').pop() ?? ''
  return (fileName.match(/_/g) ?? []).length == 3
}

/** 删除一份缓存音频，以及它配套的歌词 / 封面 sidecar */
const removeCacheFile = (audioPath: string) => {
  void unlink(audioPath).catch(() => {})
  const dir = getAuditionCacheDir()
  const base = baseFromAudioPath(audioPath)
  void unlink(`${dir}/${base}.lrc`).catch(() => {})
  for (const ext of PIC_EXTS) void unlink(`${dir}/${base}.${ext}`).catch(() => {})
}

/**
 * 清理规则：**已缓存即保留理由** —— 不再因为「不在歌单里」而删除，
 * 只清理三类安全项：
 * ① 记录存在但文件缺失 / 大小不匹配（损坏或未完成）
 * ② 旧格式记录：key 里没有音质后缀，或文件名不是新命名（歌名_歌手_平台_音质）
 * ③ 目录里 meta 无记录的残留文件（音频按后缀判断；歌词/封面按「是否还有对应音频」判断，避免误删）
 */
export const cleanUnreferencedAuditionCache = async(): Promise<void> => {
  try {
    const data = await loadMeta()
    const keys = Object.keys(data)
    // 没有任何缓存记录时不做任何删除，避免 meta 异常变成"清空整个目录"
    if (!keys.length) return

    let changed = false
    for (const key of keys) {
      const item = data[key]
      // ② 旧格式记录：无法判断音质 / 文件名不符合新命名 → 删掉，下次按新命名重新缓存
      if (!key.includes(QUALITY_SPLIT) || !isNewSchemePath(item.path)) {
        removeCacheFile(item.path)
        delete data[key]
        changed = true
        continue
      }
      // ① 文件缺失或大小不匹配 → 视为损坏
      const result = await stat(item.path).catch(() => null)
      if (!result || result.size <= 0 || (item.size > 0 && result.size != item.size)) {
        void unlink(item.path).catch(() => {})
        delete data[key]
        changed = true
      }
    }
    if (changed) await saveData(META_KEY, data)

    // ③ 残留文件清理
    const dir = getAuditionCacheDir()
    const audioBases = new Set(Object.values(data).map(item => baseOfPath(item.path)))
    const mapped = new Set(Object.values(data).map(item => item.path))
    const files = await readDir(dir).catch(() => [] as string[])
    for (const file of files) {
      const name = typeof file == 'string' ? file : String(file)
      if (name.startsWith('.')) continue
      const path = name.startsWith('/') ? name : `${dir}/${name}`
      const ext = extname(name).toLowerCase()
      if (CACHE_FILE_EXTS.includes(ext)) {
        if (mapped.has(path)) continue
        void unlink(path).catch(() => {})
        continue
      }
      // 歌词 / 封面：只有连音频都没有了才是残留（正常删除走 deleteAuditionCache）
      if (ext != 'lrc' && !PIC_EXTS.includes(ext)) continue
      const base = name.replace(/\.[^.]+$/, '')
      if (audioBases.has(base)) continue
      void unlink(path).catch(() => {})
    }
  } catch {}
}

/** 启动时调用一次清理 */
export const initAuditionCache = async(): Promise<void> => {
  await cleanUnreferencedAuditionCache()
}

/**
 * 确保缓存可用：检查权限 → 申请权限 → 自动创建目录
 * @returns 是否可用；false 表示没有权限（此时会走在线播放）
 */
export const ensureAuditionCacheReady = async(): Promise<boolean> => {
  if (!settingState.setting['car.auditionCache']) return false
  const granted = await requestStoragePermission()
  if (granted) {
    if (await testWritable(getAuditionCacheDir())) return true
    log.warn('audition cache dir not writable: ' + getAuditionCacheDir())
  } else {
    log.warn('audition cache: storage permission not granted')
  }
  // 外部存储不可用时回退到应用私有目录，保证缓存功能仍然可用
  const fallback = getFallbackDir()
  if (await testWritable(fallback)) {
    fallbackDir = fallback
    resetAuditionCacheDir()
    toast('外部存储不可用，音乐缓存已切换到应用目录')
    return true
  }
  toast('音乐缓存不可用，已改用在线播放')
  return false
}

/** 缓存目录变化时重置目录缓存 */
export const resetAuditionCacheDir = () => {
  cacheDirCache = null
}
