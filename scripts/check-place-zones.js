import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const snap = await db.collection('places').get()
const zone = new Map(), zoneEn = new Map()
for (const d of snap.docs) {
  const data = d.data()
  const z = data.zone || '(none)'
  const ze = data.zone_en || '(none)'
  zone.set(z, (zone.get(z) || 0) + 1)
  zoneEn.set(ze, (zoneEn.get(ze) || 0) + 1)
}
console.log(`Total places: ${snap.size}`)
console.log('\nTop zone values:')
for (const [z, n] of [...zone.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 25)) {
  console.log(`  ${z.padEnd(28)} ${n}`)
}
console.log('\nTop zone_en values:')
for (const [z, n] of [...zoneEn.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 25)) {
  console.log(`  ${z.padEnd(28)} ${n}`)
}
process.exit(0)
