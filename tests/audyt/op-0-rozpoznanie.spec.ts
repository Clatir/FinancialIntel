/** OP / ME – a first look at Operacje and Meldunki of „rok” (layout, texts), no changes. */
import { test } from '@playwright/test'
import { goInbox, goOps, run, say, snap, sums, text } from './op-pomoc'

test('rozpoznanie Operacji i Meldunków', async () => {
  const r = await run('op-rozpoznanie')
  const { app, page, errors } = r
  try {
    await goOps(page)
    say('header', await text(page, '[data-testid="operations-header"]'))
    say('sums', await sums(page))
    say('lista', (await text(page, '[data-testid="operations-list"]')).slice(0, 3000))
    say('edytor', await text(page, '[data-testid="page-operations"]').then((t) => t.slice(-2500)))
    await snap(page, 'op-rozpoznanie-operacje')
    await goInbox(page)
    say('meldunki', await text(page, '[data-testid="page-inbox"]'))
    say('menu', await text(page, 'nav'))
    await snap(page, 'op-rozpoznanie-meldunki')
    say('errors', errors)
  } finally {
    await app.close()
  }
})
