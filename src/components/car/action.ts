import { LIST_IDS } from '@/config/constant'
import { addListMusics, createList } from '@/core/list'
import { appendQueue, appendQueueAndPlay, replaceQueue } from '@/core/player/queue'
import settingState from '@/store/setting/state'
import { formatDateTimeName } from '@/utils/common'
import { toast } from '@/utils/tools'

/**
 * 车机：试听/搜索播放的歌曲额外存入的列表
 * 歌曲本身一定会进入"试听列表"（播放队列），这里只在设置要求时额外写入收藏
 */
export const autoAddToDefaultList = async(musicInfo: LX.Music.MusicInfo) => {
  const target = settingState.setting['car.autoAddDefaultList']
  if (target != 'love') return
  await addListMusics(LIST_IDS.LOVE, [musicInfo], settingState.setting['list.addMusicLocationType'])
}

/**
 * 车机：播放一个列表（歌曲会被写入临时列表，即"播放队列"）
 * 列表既可以在线歌曲，也可以是本地缓存歌曲，所以类型放宽为 MusicInfo
 * @param listId 列表id（用于临时列表标识）
 * @param list 歌曲列表
 * @param index 起始播放位置
 */
export const carPlayList = async(listId: string, list: LX.Music.MusicInfo[], index: number) => {
  if (!list.length) return
  // 队列是一个始终存在的匿名歌单：播放整张列表 = 复制覆盖队列，再起播
  await replaceQueue(list, index, listId)
  if (list[index]) void autoAddToDefaultList(list[index])
}

/**
 * 车机：播放单曲
 * 规则：播放一首新的在线歌曲 = 加入"试听列表"（播放历史）**并且**加入播放队列，
 * 然后从队列里播放它。
 * 不会把曲目所在的歌单整张塞进队列（那是"播放歌单 / 播放全部"才做的事）。
 * 显式把歌曲加入指定歌单，由列表行内的「＋」按钮完成。
 */
export const carPlayMusic = async(musicInfo: LX.Music.MusicInfoOnline) => {
  // ① 试听列表：播放历史，保留原有行为
  await addListMusics(LIST_IDS.DEFAULT, [musicInfo], settingState.setting['list.addMusicLocationType'])
  // ② 播放队列：追加到匿名队列末尾并播放它（已在队列里则不重复添加）
  await appendQueueAndPlay(musicInfo)
  void autoAddToDefaultList(musicInfo)
}

/**
 * 车机：把歌曲追加到当前播放队列末尾
 * @param musicInfos 要追加的歌曲
 */
export const appendToQueue = async(musicInfos: LX.Music.MusicInfo[]) => {
  if (!musicInfos.length) return
  // 一律追加到队列（匿名歌单），不再跟随"当前播放列表"，避免把歌加进真实歌单
  await appendQueue(musicInfos)
  toast(`已追加 ${musicInfos.length} 首到播放队列`)
}

/**
 * 车机：把播放队列保存为我的歌单
 */
export const saveQueueToList = async(musics: LX.Music.MusicInfo[]) => {
  if (!musics.length) {
    toast('播放队列是空的')
    return
  }
  // 精确到秒，同一天多次保存也不会重名
  const name = `队列 ${formatDateTimeName()}`
  await createList({ name, list: musics })
  toast(`已保存为歌单「${name}」`)
}
