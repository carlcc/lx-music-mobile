import { LIST_IDS } from '@/config/constant'
import { addListMusics, getListMusics, removeListMusics, setTempList } from '@/core/list'
import { playList } from './player'

/**
 * 播放队列
 *
 * 模型：队列是一个**特殊的匿名歌单** —— 始终存在、不显示在「我的歌单」里。
 * 播放永远发生在这个歌单上，其它操作全都是对它的修改：
 * - 复制覆盖：播放整张列表时，把内容复制进来替换掉原有内容，再从指定位置起播
 * - 追加：加入队列时加到末尾
 * - 删除：从队列移除
 *
 * 这样队列的增删永远不会反过来改动生成它的歌单。
 */
export const QUEUE_ID = LIST_IDS.TEMP

/** 队列当前内容 */
export const getQueue = async(): Promise<LX.Music.MusicInfo[]> =>
  await getListMusics(QUEUE_ID).catch(() => [] as LX.Music.MusicInfo[])

/**
 * 复制覆盖：用 musics 整体替换队列，并从 index 起播
 * @param musics 新的队列内容（调用方负责传入副本，这里会再复制一层）
 * @param index 起播位置
 * @param fromListId 来源歌单 id，仅用于标记队列来源，不影响歌单本身
 */
export const replaceQueue = async(musics: LX.Music.MusicInfo[], index: number, fromListId = '') => {
  if (!musics.length) return
  await setTempList(fromListId, [...musics])
  await playList(QUEUE_ID, index)
}

/** 复制覆盖：把某个歌单的内容复制进队列并起播 */
export const replaceQueueWithList = async(listId: string, index: number) => {
  const list = await getListMusics(listId).catch(() => [] as LX.Music.MusicInfo[])
  if (!list.length) return
  await replaceQueue(list, index, listId)
}

/** 追加：把歌曲加到队列末尾 */
export const appendQueue = async(musics: LX.Music.MusicInfo[]) => {
  if (!musics.length) return
  await addListMusics(QUEUE_ID, musics, 'bottom')
}

/** 删除：从队列移除指定歌曲 */
export const removeFromQueue = async(ids: string[]) => {
  if (!ids.length) return
  await removeListMusics(QUEUE_ID, ids)
}

/**
 * 追加一首到队列末尾并播放它；已经在队列里就直接播（不重复添加）
 * 用于"播放单曲"：歌曲同时进试听列表（历史）和队列（当前播放序列）
 */
export const appendQueueAndPlay = async(musicInfo: LX.Music.MusicInfo) => {
  let list = await getQueue()
  let index = list.findIndex(item => item.id == musicInfo.id)
  if (index < 0) {
    await appendQueue([musicInfo])
    list = await getQueue()
    index = list.findIndex(item => item.id == musicInfo.id)
  }
  await playList(QUEUE_ID, index < 0 ? 0 : index)
}
