// adapted from ICTTJ src/preload/index.ts @ 84a8339
import { contextBridge, ipcRenderer } from 'electron'
import type { ChangeSet, DetachEvent, DetachPayload, FiApi } from '@shared/api'
import type { UpdateState } from '@shared/update'

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(`fi:${channel}`, ...args)

function listen<A extends unknown[]>(channel: string, cb: (...args: A) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]) => cb(...(args as A))
  ipcRenderer.on(`fi:${channel}`, listener)
  return () => ipcRenderer.removeListener(`fi:${channel}`, listener)
}

const api: FiApi = {
  appInfo: () => invoke('appInfo'),
  getConfig: () => invoke('getConfig'),
  loadCurrent: () => invoke('loadCurrent'),
  defaultDataDir: () => invoke('defaultDataDir'),
  pickDataDir: (mode) => invoke('pickDataDir', mode),
  openDataDir: (dir, createIfEmpty) => invoke('openDataDir', dir, createIfEmpty),
  saveRecord: (collection, record) => invoke('saveRecord', collection, record),
  deleteRecord: (collection, id) => invoke('deleteRecord', collection, id),
  historyList: (kind, id) => invoke('historyList', kind, id),
  historyRead: (kind, id, file) => invoke('historyRead', kind, id, file),
  historyDeleted: (collection) => invoke('historyDeleted', collection),
  historyRestore: (kind, id, file) => invoke('historyRestore', kind, id, file),
  historyKeep: (kind, record, reason) => invoke('historyKeep', kind, record, reason),
  saveSettings: (fi) => invoke('saveSettings', fi),
  resolveConflict: (id, keep) => invoke('resolveConflict', id, keep),
  trashProblemFile: (rel) => invoke('trashProblemFile', rel),
  showInFolder: (rel) => invoke('showInFolder', rel),
  openExternal: (url) => invoke('openExternal', url),
  openLogs: () => invoke('openLogs'),
  trayPrefs: () => invoke('trayPrefs'),
  setTrayPrefs: (patch) => invoke('setTrayPrefs', patch),
  rescan: () => invoke('rescan'),
  exportZip: () => invoke('exportZip'),
  copyText: (text) => invoke('copyText', text),
  listBackups: () => invoke('listBackups'),
  backupNow: () => invoke('backupNow'),
  setBackupDir: (mode) => invoke('setBackupDir', mode),
  showPath: (abs) => invoke('showPath', abs),
  updateState: () => invoke('updateState'),
  checkForUpdates: () => invoke('checkForUpdates'),
  downloadUpdate: () => invoke('downloadUpdate'),
  installUpdateNow: () => invoke('installUpdateNow'),
  setUpdatePrefs: (prefs) => invoke('setUpdatePrefs', prefs),
  setUpdateToken: (token) => invoke('setUpdateToken', token),
  dismissUpdateNotice: () => invoke('dismissUpdateNotice'),
  onUpdateState: (cb) => listen<[UpdateState]>('update', cb),
  onChange: (cb) => listen<[ChangeSet]>('change', cb),
  onFlushRequest: (cb) =>
    listen<[]>('flush', () => {
      cb().then(
        (saved) => ipcRenderer.send('fi:flushed', saved),
        () => ipcRenderer.send('fi:flushed', false)
      )
    }),
  detachOpen: (key, payload) => invoke('detachOpen', key, payload),
  detachSend: (key, payload) => invoke('detachSend', key, payload),
  detachClose: (key) => invoke('detachClose', key),
  detachFocus: (key) => invoke('detachFocus', key),
  onDetachClosed: (cb) => listen<[string]>('detachClosed', cb),
  onDetachEvent: (cb) => listen<[string, DetachEvent]>('detachEvent', cb),
  detachReady: () => invoke('detachReady'),
  onDetachProps: (cb) => listen<[DetachPayload]>('detachProps', cb),
  detachEmit: (event) => invoke('detachEmit', event),
  detachFullscreen: (on) => invoke('detachFullscreen', on)
}

contextBridge.exposeInMainWorld('fi', api)
