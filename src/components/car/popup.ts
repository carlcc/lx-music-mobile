import type { AddMusicPopoverType } from './AddMusicPopover'
import type { QueuePopupType } from './QueuePopup'

// 车机弹层采用"全局单例 + 命令式调用"，避免每行列表都挂一个弹层实例

let addMusicPopover: AddMusicPopoverType | null = null
export const setAddMusicPopover = (instance: AddMusicPopoverType | null) => {
  addMusicPopover = instance
}
export const showAddMusicPopover = (musicInfo: LX.Music.MusicInfo) => {
  addMusicPopover?.show(musicInfo)
}

let queuePopup: QueuePopupType | null = null
export const setQueuePopup = (instance: QueuePopupType | null) => {
  queuePopup = instance
}
export const showQueuePopup = () => {
  queuePopup?.show()
}
