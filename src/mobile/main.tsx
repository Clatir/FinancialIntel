/**
 * The phone's start (T305): the host (`window.fi`) first – the computers' renderer reads it when its modules load –,
 * then the mirror, the account and the folder (`phone.ts`), then the screens.
 */
import { createPlatform } from './platform'
import { PhoneHost } from './host/host'
import { setPhoneHost } from './hostRef'
import { startPhone, usePhone } from './phone'

const platform = createPlatform()
const host = new PhoneHost({ version: platform.version, kv: platform.kv, notifications: platform.notifications, openUrl: platform.openUrl })
setPhoneHost(host)
;(window as unknown as { fi: typeof host.api }).fi = host.api

void (async () => {
  try {
    await startPhone(host, platform)
  } catch (e) {
    console.error('start', e)
    usePhone.setState({ phase: 'signin', message: e instanceof Error ? e.message : String(e) })
  }
  const { mount } = await import('./app/PhoneApp')
  mount()
})()
