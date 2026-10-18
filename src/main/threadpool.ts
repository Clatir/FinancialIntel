/**
 * Node reads and writes files on a pool of 4 threads by default (libuv). A file OneDrive keeps online-only blocks its
 * thread until it arrives from the cloud: four such reads stopped every other file operation of the app, and opening
 * a folder of a thousand such files seemed to hang (1.4.1, checked in Electron: with 6 reads blocked a `stat` waited
 * for them; with the pool set here it took 45 ms). The pool is sized on its first use, so this module is imported
 * first in `index.ts`, before anything touches a file.
 */
export const THREADPOOL_SIZE = 32

if (!process.env.UV_THREADPOOL_SIZE) process.env.UV_THREADPOOL_SIZE = String(THREADPOOL_SIZE)
