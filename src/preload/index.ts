// adapted from ICTTJ src/preload/index.ts @ 84a8339
import { contextBridge, ipcRenderer } from 'electron'
import type { ChangeSet, DetachEvent, DetachPayload, FiApi, OpenProgress, QuickData, QuickResult } from '@shared/api'
import type { MachinePrefs } from '@shared/machine'
import type { IctjSnapshot } from '@shared/ictj'
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
  openDataDir: (dir, createIfEmpty, force) => invoke('openDataDir', dir, createIfEmpty, force === true),
  cancelOpen: () => invoke('cancelOpen'),
  onOpenProgress: (cb) => listen<[OpenProgress]>('openProgress', cb),
  rendererStep: (name, ms) => ipcRenderer.send('fi:step', name, ms),
  saveRecord: (collection, record) => invoke('saveRecord', collection, record),
  saveRecords: (collection, records) => invoke('saveRecords', collection, records),
  deleteRecord: (collection, id) => invoke('deleteRecord', collection, id),
  deleteRecords: (collection, ids, reason) => invoke('deleteRecords', collection, ids, reason),
  historyList: (kind, id) => invoke('historyList', kind, id),
  historyRead: (kind, id, file) => invoke('historyRead', kind, id, file),
  historyDeleted: (collection) => invoke('historyDeleted', collection),
  historyRestore: (kind, id, file) => invoke('historyRestore', kind, id, file),
  historyKeep: (kind, record, reason) => invoke('historyKeep', kind, record, reason),
  saveSettings: (fi) => invoke('saveSettings', fi),
  resolveConflict: (id, keep) => invoke('resolveConflict', id, keep),
  resolveConflicts: (items) => invoke('resolveConflicts', items),
  mergeConflict: (id, merged) => invoke('mergeConflict', id, merged),
  trashProblemFile: (rel) => invoke('trashProblemFile', rel),
  showInFolder: (rel) => invoke('showInFolder', rel),
  openExternal: (url) => invoke('openExternal', url),
  openLogs: () => invoke('openLogs'),
  trayPrefs: () => invoke('trayPrefs'),
  setTrayPrefs: (patch) => invoke('setTrayPrefs', patch),
  rescan: () => invoke('rescan'),
  exportZip: () => invoke('exportZip'),
  saveTextFile: (name, content, filter) => invoke('saveTextFile', name, content, filter),
  saveXlsx: (name, sheets) => invoke('saveXlsx', name, sheets),
  savePdf: (name, html) => invoke('savePdf', name, html),
  copyText: (text) => invoke('copyText', text),
  listBackups: () => invoke('listBackups'),
  backupNow: () => invoke('backupNow'),
  importBackup: () => invoke('importBackup'),
  pickImportFile: () => invoke('pickImportFile'),
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
      // Still saving: said every second, so closing waits for it (B43).
      const alive = setInterval(() => ipcRenderer.send('fi:flushing'), 1000)
      cb().then(
        (saved) => {
          clearInterval(alive)
          ipcRenderer.send('fi:flushed', saved)
        },
        () => {
          clearInterval(alive)
          ipcRenderer.send('fi:flushed', false)
        }
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
  detachFullscreen: (on) => invoke('detachFullscreen', on),
  setMachinePrefs: (patch) => invoke('setMachinePrefs', patch),
  onMachinePrefs: (cb) => listen<[MachinePrefs]>('machinePrefs', cb),
  quickShortcutState: () => invoke('quickShortcutState'),
  quickOpen: () => invoke('quickOpen'),
  onQuickRequest: (cb) => listen<[]>('quickRequest', cb),
  quickData: (data) => invoke('quickData', data),
  onQuickAdd: (cb) => listen<[unknown]>('quickAdd', cb),
  quickResult: (result) => invoke('quickResult', result),
  onQuickData: (cb) => listen<[QuickData | null]>('quickData', cb),
  quickAdd: (draft) => invoke('quickAdd', draft),
  quickRefresh: () => invoke('quickRefresh'),
  onQuickResult: (cb) => listen<[QuickResult]>('quickResult', cb),
  quickClose: () => invoke('quickClose'),
  setTrayStatus: (text) => invoke('setTrayStatus', text),
  notify: (n) => invoke('notify', n),
  onNotificationClick: (cb) => listen<[string]>('notificationClick', cb),
  ictjState: () => invoke('ictjState'),
  ictjSuggest: () => invoke('ictjSuggest'),
  ictjPickDir: () => invoke('ictjPickDir'),
  ictjSetDir: (dir) => invoke('ictjSetDir', dir),
  ictjOpen: () => invoke('ictjOpen'),
  ictjProgram: () => invoke('ictjProgram'),
  ictjPickExe: (mode) => invoke('ictjPickExe', mode),
  onIctj: (cb) => listen<[IctjSnapshot]>('ictj', cb)
}

contextBridge.exposeInMainWorld('fi', api)
