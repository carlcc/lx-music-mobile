# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

> 项目性质：本仓库是 [lyswhut/lx-music-mobile](https://github.com/lyswhut/lx-music-mobile) 的 fork（React Native 0.73 + react-native-navigation 7）。
> 上游面向手机竖屏；**本 fork 的目标是车机 / 横屏适配，以及个人习惯的界面美化与逻辑调整**。
> 改动时的优先级：**车机横屏可用性 > 手机竖屏一致性**。只要涉及 UI，先问「横屏下车机上显示/操作是否正常」。

## 常用命令

| 目的 | 命令 | 说明 |
| --- | --- | --- |
| 启动 Metro | `npm run start`（卡缓存用 `npm run sc`） | 开发调试前先起 Metro，device 上再摇出菜单选 Dev Settings 填主机 IP。 |
| 安装并运行到设备 | `npm run dev` | 等价于 `react-native run-android --active-arch-only`，适用于 adb 已连上的车机/手机。 |
| 打开 RN 开发者菜单 | `npm run menu` | 车机通常没有摇一摇，`adb shell input keyevent 82` 是唯一入口。 |
| React DevTools | `npm run rd` | 配合开发者菜单里的 "Toggle Inspector" 使用。 |
| Android 编译（Linux） | `cd android && ./gradlew assembleDebug`（发布包 `assembleRelease`） | package.json 里的 `pack:android` 写的是 `gradlew.bat`，Windows 专用；Linux/macOS 直接跑 `./gradlew`。调试包也可在 Android Studio 里直接 Run `app`。 |
| 打 JS bundle 到 assets | `npm run bundle-android` | 怀疑 bundle 异常、或想脱离 Metro 单独验证时使用。 |
| Lint | `npm run lint` / `npm run lint:fix` | 走 `standard` + `standard-with-typescript`（`@babel/eslint-parser`）。提交前请保证改动文件零告警。 |
| 类型检查 | `npx tsc --noEmit -p tsconfig.json` | 没有 npm script。仓库**基线存在若干历史类型错误**（`core/player/timeoutExit.ts`、`plugins/player/hook.ts`、`screens/Home/Views/SongList/HeaderBar/SourceSelector.tsx`、`store/player/action.ts`），判读结果时请区分新旧。 |
| 重新生成主题 | `npm run build:theme` | 修改 `src/theme` 源主题后必须执行，产物写在 `src/theme/themes/themes.ts`。 |

本项目**没有配置测试框架**（无 jest / 无 test script）。根目录 `test.js` 只是历史调试脚本，仅在 `index.js` 注释里被引用过。因此改动的验证方式是：lint + tsc + 真机（车机）实测。播放相关的改动尤其依赖真机——车载蓝牙/方向盘按键、息屏/亮屏、多次快速切歌这些路径本地无法模拟。

## 整体架构

### 启动链路

`index.js` → `shim.js`（polyfill）→ `src/app.ts`。`app.ts` 先 `initStorage()`（存储放在外部存储，必须先拿到权限与目录），再并行 `getFontSize()` 与 `windowSizeTools.init()`。**`windowSizeTools` 必须在任何 UI 渲染前 init**——所有车机尺寸都从它的窗口尺寸推算。随后动态 `import('@/navigation')` 和 `import('@/core/init')`，init 顺序见 `src/core/init/index.ts`（setting → theme → i18n → userApi → registerPlaybackService → player → data → commonState → sync → 缓存清理）。各步有 `bootLog()`，初始化失败会弹包含 boot log 的对话框（车机上很有用）。

### 状态管理（不是 Redux，尽管 README 这么写）

`src/store/<feature>/{state,action,hook}.ts` 是**模块级单例 + 自建事件总线**的组合：

- `state.ts` 导出一个可变对象（单例真相源）；
- `action.ts` 负责改 state 并通过 `global.state_event`（`src/event/stateEvent.ts`，`Event` 类的具名方法）通知；
- `hook.ts` 提供 `useIsPlay()`、`useProgress()`、`useSettingValue(key)` 等，内部 `useState(初值) + useEffect 里订阅事件并 setState`。

所以**组件永远不要直接改 store**，要改请走 action；要读就用对应的 hook（否则不会响应更新）。

UI 侧的命令式事件（跨模块、带副作用）走 `global.app_event`（`src/event/appEvent.ts`），典型如 `app_event.play()/pause()/playerPlaying()/setProgress()`。

`global.lx`（定义于 `src/config/globalData.ts`，类型在 `src/types/app.d.ts`）是跨层共享的**可变运行时口袋**：`playerStatus`、`playerTrackId`、`gettingUrlId`、`restorePlayInfo`、`isPlayedStop`、`fontSize`、`apis` 等。播放器各层大量依赖它做「当前正在发生什么」的判断。

### 播放器的四层结构（改动前务必先看清边界）

1. `src/plugins/player/` —— react-native-track-player（RNTP）的唯一封装层。
   - `utils.ts`：播放原语（`setResource/setPlay/pause/seekTo/getPosition`…），以及 `isEmpty/isTempId`（靠 id 后缀 `//default` 正则判断占位音轨）。
   - `playList.ts`：`buildTracks()` 每次都会同时加入**真实音轨**和一条 `//default` 占位静音音轨；`handlePlayMusic()` 负责 add → skip → pause → seek → play，并只保留最近 2 条音轨。
   - `service.ts`：注册 playback service，把原生事件翻译成 `app_event`。**车机的方向盘/媒体按键从这里进来**（`RemoteNext/RemotePrev/RemotePlay/RemotePause`），所以「车上的切歌键」本质是走 `playNext() → service → core/player`。
   - `stateSync.ts`：用原生 `TrackPlayer.getState()` 的真值校正 UI 的播放状态。
2. `src/core/player/player.ts` —— 业务动作层（`playNext/playPrev/togglePlay/setMusicUrl/setPlaying`…），不直接碰 RNTP。
3. `src/core/init/player/*` —— 接线层，在 init 时把上述事件挂到 store 和副作用上：
   - `playerEvent.ts`：`app_event.playerPlay/pause/playing/loaded/error` → store action + 进度控制 + 下一首解锁。
   - `playProgress.ts`：每 1 秒轮询进度；**受屏幕亮灭控制**（车机会息屏），通过原生模块的 `onScreenStateChange`（`src/utils/nativeModules/utils.ts`）监听，并有 AppState 兜底。
   - `playInfo.ts`（歌词/元数据）、`playStatus.ts`、`preloadNextMusic.ts`、`watchList.ts`。
4. UI 层：`src/components/player/PlayerBar/*`（底部播放条，横屏/竖屏共用一套组件内部再分支）、`src/screens/PlayDetail/*`（播放详情）。

**最关键的非显性约定**：UI 的播放状态（`isPlay`，决定唱片是否转动、进度是否推进）由 `app_event.play/pause` 维护，而这些事件在 service 里有两个「守卫窗口」（取链接中 `gettingUrlId`、占位音轨 `isTempId`）会被丢弃。车机横屏界面高度依赖 `isPlay`，改动播放状态相关逻辑时必须同时看 `service.ts` 与 `stateSync.ts`，任何「可能会丢事件」的调整都要留兜底同步。

### 数据与同步

在线音源适配器在 `src/utils/musicSdk/<source>/*`；统一的链接/音质/歌词/封面处理在 `src/core/music/*`（含本地试听缓存 `core/auditionCache.ts`、在线图片缓存 `core/onlineImgCache.ts`）。本地「我的列表」「歌单」「不喜欢」等数据用 `src/store/list|songlist|dislikeList`，经 `src/plugins/sync` 与 lx-music-sync-server 同步。

### 导航

用的是 **react-native-navigation（RNN）7**，不是 react-navigation。每个页面都是原生 screen，靠手动传递的 `componentId` 做 push/pop/overlay；`src/config/constant.ts` 的 `COMPONENT_IDS` 配合 `setComponentId()` 与 `usePageVisible()` 判断某个页面当前是否可见（例如首页不可见时停止更新播放条进度）。新增页面请照抄既有 screen 的用法，不要引入别的导航库。

### 主题与尺寸

主题是**生成**的：`npm run build:theme` 由 `src/theme/themes/createThemes.js` 依据 `src/theme/themes/images/` 下的壁纸 + 主色生成 `src/theme/themes/themes.ts`（该文件头部注明「此文件由 createThemes.js 生成」，不要手改）。组件用 `useTheme()` 取颜色 token（如 `c-primary-font`、`c-button-font`、`c-primary-background-hover`），因此**改主题源后务必重跑生成命令**，否则 UI 读到的颜色会缺失。

字号问题：`src/utils/pixelRatio.ts` 的 `scaleSizeW/H/WR` 会同时受屏幕像素密度、屏幕像素数和 `global.lx.fontSize` 影响，同一份代码在不同车机上结果差异很大；`<Icon size={n}>` 走的正是这条链路。**新增/调整车机上的控件时，尺寸建议在 `src/components/car/constants.ts` 的 `useCarMetrics()` 里统一下发（已有 topBarHeight、playerBarBtnSize、playerBarBtnGap、controlBtnSize 等），图标一律用 `rawSize`，并给按钮显式宽高 + 行/列 `gap`，不要依赖内容撑开。**

## 本 fork 的横屏 / 车机改动约定

- **判断入口**：`useHorizontalMode()`（`src/utils/hooks/useHorizontalMode.ts`，`宽/高 > 1.2`，基于 `windowSizeTools`）。全仓约 27 个文件据此分支，其中**每个大屏级页面都拆成 `Horizontal/` 与 `Vertical/` 两套实现**（`screens/Home`、`screens/PlayDetail`）。改 UI 时不要只改一套：至少确认另一套不会崩，若故意保留差异请在代码注释里写明（例如 `PlayPrevBtn` 目前只在横屏展示）。
- **车机专用组件**集中在 `src/components/car/`：`CarPlayDetail`、`CarSonglistDetail`、`CarHeader/CarAside/CarBg`、`CarProgress`、`QueueList/QueuePopup`、`VinylDisc`、以及行为层 `action.ts / popup.ts / rowActionsConfig.ts / playControlActions.ts`（后者是播放条与播放详情**共用**的「5 大键」行为：播放模式循环切换、桌面歌词开关/长按锁定）。共享行为请继续放在共用模块，避免两处实现漂移。
- **为操作（而非看）设计**：车机上触控目标大、误触代价高，按钮要给足固定尺寸与间隙（参考上面 `useCarMetrics` 的说明），重要操作可配长按而非多层级菜单。
- **屏幕随时间（息屏/亮屏）会停掉进度轮询**，任何新的「随播放推进」的 UI（动画、进度、歌词）都要确认息屏恢复后能自愈，或直接复用 `useProgress`/`useIsPlay` 这类已处理该场景的 hook。
- **桌面歌词**是本 fork 的重点功能之一（悬浮窗）：`src/core/desktopLyric.ts` 包装 `src/utils/nativeModules/lyricDesktop.ts`，权限与开关 UI 封装在 `src/components/DesktopLyricEnable.tsx`（通过 ref 的 `setEnabled(enabled)` 调用）。
- **已知简化**：部分车机功能文案是硬编码中文（如播放模式 toast `队列顺序循环`），而不是走 `useI18n()`。新写 UI 请优先复用 `src/lang` 中已有的 key。
