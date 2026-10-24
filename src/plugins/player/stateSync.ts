import TrackPlayer, { State as TPState } from 'react-native-track-player'
import BackgroundTimer from 'react-native-background-timer'
import playerState from '@/store/player/state'

/** 占位音轨（还没有真实播放地址）的 id 后缀，与 utils.isEmpty 的判断保持一致 */
const emptyIdRxp = /\/\/default$/
/** 当前播放的是不是占位音轨（这里不引用 utils，避免与 utils <-> playList 形成循环依赖） */
const isEmptyTrack = () => {
  const trackId = global.lx.playerTrackId
  return !trackId || emptyIdRxp.test(trackId)
}

/**
 * 用原生播放器的真实状态校正 UI 的播放状态
 *
 * UI 的播放状态（isPlay）完全依赖 volatile 的原生状态事件来维护，
 * 而原生状态事件在「正在取播放链接（gettingUrlId）」「正在播放占位音轨（临时音轨）」
 * 这两段时间里是被 service 丢弃的。这两个窗口正好覆盖整个切歌过程，
 * 一旦 Playing 事件落进去被丢掉，UI 就会一直停在暂停态：
 * 黑胶唱片不转、进度条和播放时间都不走（音频实际却在播放）。
 *
 * 所以在关键节点主动拉一次原生状态，把 UI 纠正过来，作为状态事件的兜底。
 */

/** 这些状态还看不出最终会不会播，需要再等等 */
const WAITING_STATES: TPState[] = [TPState.None, TPState.Buffering, TPState.Connecting]

const RETRY_DELAY = 800
const MAX_RETRY = 5

let timer: number | null = null
let retryNum = 0

const clearTimer = () => {
  if (timer == null) return
  BackgroundTimer.clearTimeout(timer)
  timer = null
}

const retry = () => {
  if (++retryNum > MAX_RETRY) {
    retryNum = 0
    return
  }
  clearTimer()
  timer = BackgroundTimer.setTimeout(() => {
    timer = null
    void sync()
  }, RETRY_DELAY)
}

const sync = async() => {
  if (global.lx.isPlayedStop) return
  // 占位音轨还没有真实播放地址，它的状态不代表最终状态
  if (isEmptyTrack()) {
    retry()
    return
  }

  const state = await TrackPlayer.getState()

  if (WAITING_STATES.includes(state)) {
    retry()
    return
  }
  retryNum = 0

  const isPlaying = state == TPState.Playing
  if (isPlaying == playerState.isPlay) return

  if (isPlaying) {
    global.app_event.playerPlaying()
    global.app_event.play()
  } else {
    global.app_event.playerPause()
    global.app_event.pause()
  }
}

/**
 * 校正一次 UI 的播放状态
 * @param delay 延迟多少毫秒后再校正；原生还在缓冲时会自动重试
 */
export const syncPlayState = (delay = 0) => {
  clearTimer()
  retryNum = 0
  if (delay <= 0) {
    void sync()
    return
  }
  timer = BackgroundTimer.setTimeout(() => {
    timer = null
    void sync()
  }, delay)
}
