/** Lower case without Polish letters' marks (ł → l): „Żabka ŁÓDŹ” = „zabka lodz” – search and matching ignore them. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}
