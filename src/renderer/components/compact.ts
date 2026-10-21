import { createContext } from 'react'

/**
 * The phone (T307): the computers' screens in one narrow column – panels keep their title and collapse (no window of
 * their own, no maximize, no edges to drag), a page's columns stack.
 */
export const CompactContext = createContext(false)
