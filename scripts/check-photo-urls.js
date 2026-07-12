import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()
const snap = await db.collection('hotels').limit(10).get()
let http = 0, https = 0, none = 0
for (const d of snap.docs) {
  const p = d.data().photo1 || ''
  if (p.startsWith('http://')) http++
  else if (p.startsWith('https://')) https++
  else none++
}
console.log(`Sample of 10: http=${http} https=${https} empty=${none}`)
const all = await db.collection('hotels').get()
let h=0, hs=0, n=0
for (const d of all.docs) {
  const p = d.data().photo1 || ''
  if (p.startsWith('http://')) h++
  else if (p.startsWith('https://')) hs++
  else n++
}
console.log(`All ${all.size}: http=${h} https=${hs} empty=${n}`)
console.log('Sample URL:', snap.docs[0].data().photo1)
console.log('Sample partner URL:', snap.docs[0].data().url)
process.exit(0)
