// The area IM / SA: the synthetic bank files (C:\FI-audyt\pliki\im) – no app.
import { test } from '@playwright/test'
import { writeFiles } from './im-pomoc'

test('im: pliki z banku', () => {
  console.log(JSON.stringify(writeFiles(), null, 1))
})
