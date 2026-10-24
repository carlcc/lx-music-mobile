import hotSearchState, { type Source } from '@/store/hotSearch/state'
import hotSearchActions, { type Lists } from '@/store/hotSearch/action'
import musicSdk from '@/utils/musicSdk'

/** 正在进行的请求，避免同一音源被并发调用时重复发请求 */
const pendingTasks = new Map<Source, Promise<string[]>>()

const loadList = async(source: Source): Promise<string[]> => {
  if (source == 'all') {
    let task = []
    for (const source of hotSearchState.sources) {
      if (source == 'all') continue
      task.push(
        hotSearchState.sourceList[source]?.length
          ? Promise.resolve({ source, list: hotSearchState.sourceList[source] })
          : ((musicSdk[source]?.hotSearch.getList() as Promise<Lists[number]>) ?? Promise.reject(new Error('source not found: ' + source))).catch((err: any) => {
              console.log(err)
              return { source, list: [] }
            }),
      )
    }
    return Promise.all(task).then((results: Lists) => {
      return hotSearchActions.setList(source, results)
    })
  } else {
    if (hotSearchState.sourceList[source]?.length) return hotSearchState.sourceList[source]
    if (!musicSdk[source]?.hotSearch) {
      hotSearchActions.setList(source, [])
      return []
    }
    return musicSdk[source]?.hotSearch.getList().catch((err: any) => {
      console.log(err)
      return { source, list: [] }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    }).then(data => hotSearchActions.setList(source, data.list))
  }
}

export const getList = async(source: Source): Promise<string[]> => {
  // 已有数据直接复用
  if (source != 'all' && hotSearchState.sourceList[source]?.length) return Promise.resolve(hotSearchState.sourceList[source])
  const cachedTask = pendingTasks.get(source)
  if (cachedTask) return cachedTask
  const task = loadList(source)
  pendingTasks.set(source, task)
  void task.catch(() => {}).finally(() => {
    pendingTasks.delete(source)
  })
  return task
}
