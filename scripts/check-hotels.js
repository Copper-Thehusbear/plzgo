#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './plzgo-db-task/service-account.json'
initializeApp({ credential: cert(credPath) })
const db = getFirestore()

const snap = await db.collection('hotels').get()
console.log(`Total hotels: ${snap.size}`)

const byZone = new Map()
for (const d of snap.docs) {
  const z = d.data().zone || '(no zone)'
  byZone.set(z, (byZone.get(z) || 0) + 1)
}
const sorted = [...byZone.entries()].sort((a, b) => b[1] - a[1])
for (const [z, n] of sorted) console.log(`  ${z.padEnd(24)} ${n}`)

if (snap.size > 0) {
  console.log('\nSample doc:')
  console.log(JSON.stringify(snap.docs[0].data(), null, 2))
}
