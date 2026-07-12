import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const snap = await db.collection('hotels').get()
let withPhoto = 0, withoutPhoto = 0, withRating = 0, withoutRating = 0
const zoneMap = new Map()
for (const d of snap.docs) {
  const data = d.data()
  if (data.photo1 && data.photo1.trim()) withPhoto++; else withoutPhoto++
  if (data.rating_average != null) withRating++; else withoutRating++
  const z = data.zone
  if (!zoneMap.has(z)) zoneMap.set(z, { total: 0, withPhoto: 0, withRating: 0 })
  const e = zoneMap.get(z)
  e.total++
  if (data.photo1 && data.photo1.trim()) e.withPhoto++
  if (data.rating_average != null) e.withRating++
}
console.log(`Total: ${snap.size}`)
console.log(`  with photo1:    ${withPhoto}`)
console.log(`  without photo1: ${withoutPhoto}`)
console.log(`  with rating:    ${withRating}`)
console.log(`  without rating: ${withoutRating}`)
console.log('')
console.log('Zone                  Total  +Photo  +Rating')
for (const [z, e] of [...zoneMap.entries()].sort((a,b)=>b[1].total-a[1].total)) {
  console.log(`  ${z.padEnd(22)} ${String(e.total).padStart(4)}  ${String(e.withPhoto).padStart(5)}  ${String(e.withRating).padStart(6)}`)
}
process.exit(0)
