import AsyncStorage from '@react-native-async-storage/async-storage'
import { PermissionsAndroid } from 'react-native'
import { Dirs, FileSystem } from 'react-native-file-system'

/**
 * App 数据存储：直接写到**外部存储**，这样卸载/重装 App 数据不会丢
 * （歌单、歌曲缓存索引、不喜欢列表、设置、播放信息等）
 *
 * 目录：`<外部存储>/lxmusic/data/<key>.json`，一个 key 一个文件。
 * 只有在拿不到存储权限时才回退到应用私有目录（此时卸载会丢，会提示用户）。
 *
 * 说明：本项目的 targetSdkVersion = 29 且声明了 requestLegacyExternalStorage，
 * 因此可以直接按文件路径读写外部存储。
 * （若以后 targetSdk 升到 30+，这里必须改成 SAF/MediaStore。）
 */

const EXTERNAL_DIR = `${Dirs.SDCardDir}/lxmusic/data`
const PRIVATE_DIR = `${Dirs.DocumentDir}/lxmusic_data`
const MIGRATE_FLAG_FILE = '.migrated_from_async_storage'

// 1.4.0 之前 AsyncStorage 里有分片存储的值，迁移时需要还原
const partKeyPrefix = '@___PART___'
const partKeyArrPrefix = '@___PART_A___'

let dataDir = EXTERNAL_DIR
let isInited = false

export const getStorageDir = () => dataDir
/** 当前是否在使用外部存储（false 表示已回退到应用私有目录） */
export const isExternalStorage = () => dataDir == EXTERNAL_DIR

const checkPermission = async() => {
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)
  } catch {
    return false
  }
}

const requestPermission = async() => {
  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)
    return result === PermissionsAndroid.RESULTS.GRANTED
  } catch {
    return false
  }
}

const ensureDir = async(path: string) => {
  try {
    if (await FileSystem.exists(path)) return true
    await FileSystem.mkdir(path)
    return true
  } catch (err) {
    console.warn('storage mkdir failed:', path, err)
    return false
  }
}

// 只转义文件系统不允许的字符（@ 本身是合法的，不需要转义）
const UNSAFE_FILE_CHARS_RE = /[\\/:*?"<>|]/g
const HEX_CODE_RE = /%([0-9A-Fa-f]{2})/g

const encodeKey = (key: string) => key.replace(UNSAFE_FILE_CHARS_RE, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
const decodeKey = (fileName: string) => fileName.replace(HEX_CODE_RE, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)))

const fileNameOf = (key: string) => `${encodeKey(key)}.json`
const filePathOf = (key: string) => `${dataDir}/${fileNameOf(key)}`

/**
 * 早期版本用 encodeURIComponent 做文件名，key 里的 "@" 被转义成 "%40"，
 * 导致所有文件都以 %40 开头。这里把历史文件名统一成新规则，
 * 避免同一份数据同时存在新旧两个文件。
 */
const normalizeFileNames = async() => {
  try {
    const files = await FileSystem.ls(dataDir)
    for (const file of files) {
      const name = typeof file == 'string' ? file : String(file)
      if (!name.endsWith('.json')) continue
      const newName = fileNameOf(decodeKey(name.slice(0, -'.json'.length)))
      if (newName == name) continue
      await FileSystem.mv(`${dataDir}/${name}`, `${dataDir}/${newName}`).catch(() => {})
    }
  } catch (err) {
    console.warn('storage normalize file names failed:', err)
  }
}

// ============ 初始化（必须在任何读写之前调用） ============

/** 申请存储权限并确定数据目录；首次使用还会把 AsyncStorage 里的旧数据迁移过来 */
export const initStorage = async() => {
  if (isInited) return
  isInited = true

  let granted = await checkPermission()
  if (!granted) granted = await requestPermission()
  if (!granted) granted = await checkPermission() // 部分机型首次请求会被系统直接吞掉

  dataDir = granted ? EXTERNAL_DIR : PRIVATE_DIR
  await ensureDir(dataDir)

  await normalizeFileNames()
  await migrateFromAsyncStorage()

  if (!granted) {
    void import('@/utils/tools').then(m => {
      m.toast('未获得存储权限，数据将保存在应用私有目录，卸载 App 会丢失', 'long')
    })
  }
}

const parseAsyncValue = async(value: string): Promise<unknown> => {
  if (value.startsWith(partKeyPrefix)) {
    const keys = value.replace(partKeyPrefix, '').split(',')
    const datas = await AsyncStorage.multiGet(keys)
    return JSON.parse(datas.map(data => data[1] ?? '').join(''))
  }
  if (value.startsWith(partKeyArrPrefix)) {
    const keys = JSON.parse(value.replace(partKeyArrPrefix, '')) as string[]
    const datas = await AsyncStorage.multiGet(keys)
    return JSON.parse(datas.map(data => data[1] ?? '').join(''))
  }
  return JSON.parse(value)
}

/** 一次性迁移：把 AsyncStorage 里已有的数据搬到新的文件存储 */
const migrateFromAsyncStorage = async() => {
  try {
    if (await FileSystem.exists(`${dataDir}/${MIGRATE_FLAG_FILE}`)) return
    const keys = await AsyncStorage.getAllKeys()
    if (keys.length) {
      const datas = await AsyncStorage.multiGet(keys)
      for (const [key, value] of datas) {
        if (value == null) continue
        try {
          const parsed = await parseAsyncValue(value)
          if (parsed == null) continue
          await saveData(key, parsed)
        } catch (err) {
          console.warn('storage migrate failed:', key, err)
        }
      }
    }
    await FileSystem.writeFile(`${dataDir}/${MIGRATE_FLAG_FILE}`, String(Date.now()))
  } catch (err) {
    console.warn('storage migrate failed:', err)
  }
}

// ============ 读写接口（与原 AsyncStorage 版本保持一致） ============

export const saveData = async(key: string, value: any) => {
  await ensureDir(dataDir)
  try {
    await FileSystem.writeFile(filePathOf(key), JSON.stringify(value))
  } catch (err) {
    console.error('storage error[saveData]:', key, err)
    throw err
  }
}

export const getData = async<T = unknown>(key: string): Promise<T | null> => {
  const path = filePathOf(key)
  try {
    if (!(await FileSystem.exists(path))) return null
    const value = await FileSystem.readFile(path)
    if (!value) return null
    return JSON.parse(value) as T
  } catch (err) {
    // 文件损坏时按"没有数据"处理，避免整个初始化挂掉
    console.warn('storage error[getData]:', key, err)
    return null
  }
}

export const removeData = async(key: string) => {
  try {
    if (!(await FileSystem.exists(filePathOf(key)))) return
    await FileSystem.unlink(filePathOf(key))
  } catch (err) {
    console.warn('storage error[removeData]:', key, err)
  }
}

export const getAllKeys = async() => {
  try {
    const files = await FileSystem.ls(dataDir)
    const keys: string[] = []
    for (const file of files) {
      const name = typeof file == 'string' ? file : String(file)
      if (!name.endsWith('.json')) continue
      const key = decodeKey(name.slice(0, -'.json'.length))
      if (key) keys.push(key)
    }
    return keys
  } catch (err) {
    console.warn('storage error[getAllKeys]:', err)
    return []
  }
}

export const getDataMultiple = async<T extends readonly string[]>(keys: T) => {
  const values = await Promise.all(keys.map(async key => await getData(key)))
  return keys.map((key, index) => ([key, values[index]])) as { [K in keyof T]: [T[K], unknown] }
}

export const saveDataMultiple = async(datas: Array<[string, any]>) => {
  await ensureDir(dataDir)
  await Promise.all(datas.map(async([key, value]) => {
    await saveData(key, value)
  }))
}

export const removeDataMultiple = async(keys: string[]) => {
  if (!keys.length) return
  await Promise.all(keys.map(async key => {
    await removeData(key)
  }))
}

export const clearAll = async() => {
  const keys = await getAllKeys()
  await removeDataMultiple(keys)
}
