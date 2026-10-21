#!/usr/bin/env node
// The AltStore source of the phone's app (T309): `altstore.json` of a release – AltStore (or SideStore) added once with
// https://github.com/<repo>/releases/latest/download/altstore.json shows each new version and installs its .ipa.
// node scripts/altstore-source.mjs <version> <ipa> <owner/repo> [notes.md] > altstore.json
import { readFileSync, statSync } from 'node:fs'

const [version, ipa, repo, notesFile] = process.argv.slice(2)
if (!version || !ipa || !repo) {
  console.error('użycie: altstore-source.mjs <wersja> <plik .ipa> <właściciel/repozytorium> [notatki.md]')
  process.exit(1)
}
/** The notes as plain text (AltStore shows no Markdown): the CHANGELOG's wrapped lines joined. */
const plain = (md) =>
  md
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]{2,}(?=\S)/g, ' ')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
const notes = notesFile ? plain(readFileSync(notesFile, 'utf8')) : `Financial Intel ${version}`
const source = {
  name: 'Financial Intel',
  identifier: 'app.financialintel.source',
  subtitle: 'Budżet kapitana okrętu – na telefonie',
  website: `https://github.com/${repo}`,
  apps: [
    {
      name: 'Financial Intel',
      bundleIdentifier: 'app.financialintel.ios',
      developerName: 'Financial Intel',
      subtitle: 'Ten sam budżet co na komputerze (OneDrive)',
      localizedDescription:
        'Osobisty budżet z okrętem: Mostek, szybki wpis, powiadomienia. Czyta i zapisuje ten sam folder danych na OneDrive co aplikacja na Windows.',
      iconURL: `https://raw.githubusercontent.com/${repo}/main/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`,
      tintColor: 'e8a33d',
      category: 'utilities',
      versions: [
        {
          version,
          date: new Date().toISOString().slice(0, 10),
          localizedDescription: notes,
          downloadURL: `https://github.com/${repo}/releases/download/v${version}/Financial-Intel.ipa`,
          size: statSync(ipa).size,
          minOSVersion: '16.0'
        }
      ],
      appPermissions: { entitlements: [], privacy: {} }
    }
  ],
  news: []
}
process.stdout.write(`${JSON.stringify(source, null, 2)}\n`)
