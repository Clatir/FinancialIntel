#!/usr/bin/env node
// adapted from ICTTJ scripts/make-icon.mjs @ 84a8339
/** Renders resources/icon.png (512x512) with Chromium canvas: dark tile, radar rings, amber ship (Financial Intel). */
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage()
const b64 = await page.evaluate(() => {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const x = c.getContext('2d')
  x.fillStyle = '#0b0d10'
  x.beginPath()
  x.roundRect(16, 16, 480, 480, 72)
  x.fill()
  x.strokeStyle = '#2b323b'
  x.lineWidth = 6
  x.stroke()
  const cx = 256
  const cy = 256
  // radar rings and cross
  x.strokeStyle = '#1e232a'
  x.lineWidth = 4
  for (const r of [70, 130, 190]) {
    x.beginPath()
    x.arc(cx, cy, r, 0, Math.PI * 2)
    x.stroke()
  }
  x.beginPath()
  x.moveTo(cx - 190, cy)
  x.lineTo(cx + 190, cy)
  x.moveTo(cx, cy - 190)
  x.lineTo(cx, cy + 190)
  x.stroke()
  // sweep
  x.fillStyle = 'rgba(232, 163, 61, 0.18)'
  x.beginPath()
  x.moveTo(cx, cy)
  x.arc(cx, cy, 190, -Math.PI / 2, -Math.PI / 6)
  x.closePath()
  x.fill()
  // ship: an arrowhead pointing up-right along the sweep
  x.save()
  x.translate(cx, cy)
  x.rotate(Math.PI / 4)
  x.fillStyle = '#e8a33d'
  x.beginPath()
  x.moveTo(0, -112)
  x.lineTo(62, 74)
  x.lineTo(0, 40)
  x.lineTo(-62, 74)
  x.closePath()
  x.fill()
  x.restore()
  // contacts
  x.fillStyle = '#4f5862'
  for (const [px, py] of [[150, 340], [360, 380], [120, 170]]) {
    x.beginPath()
    x.arc(px, py, 12, 0, Math.PI * 2)
    x.fill()
  }
  return c.toDataURL('image/png').split(',')[1]
})
writeFileSync(new URL('../resources/icon.png', import.meta.url), Buffer.from(b64, 'base64'))
await browser.close()
console.log('resources/icon.png')
