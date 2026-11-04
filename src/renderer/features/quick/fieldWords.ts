/**
 * The words the fields of the quick entry say about values they took changed (a tag cut to 40 characters – AP-15, T413,
 * T417): they belong to one action – an Enter, a click – and go with the answer of the save that action started.
 */
export interface FieldWords {
  /** A key or a click: a new action – the words said before it were read in the footer. */
  action(): void
  /** A field's word in this action (each once). */
  word(text: string): void
  /** The words of this action (a refused save says them with its reason). */
  now(): readonly string[]
  /** The save goes: its words kept for its answer – keys typed while it is on its way are a new action (review 3 of N4). */
  send(): void
  /** The save's answer: the words of the action that sent it (once). */
  answer(): readonly string[]
  /** A fresh opening of the window. */
  reset(): void
}

export function fieldWords(): FieldWords {
  let current: string[] = []
  let sent: string[] = []
  return {
    action: () => {
      current = []
    },
    word: (text) => {
      if (!current.includes(text)) current.push(text)
    },
    now: () => current,
    send: () => {
      sent = [...current]
    },
    answer: () => {
      const out = sent
      sent = []
      return out
    },
    reset: () => {
      current = []
      sent = []
    }
  }
}
