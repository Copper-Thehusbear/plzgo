import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

async function getAllVibes() {
  const snap = await db.collection('places').where('city', '==', 'Bangkok').get()
  const vibes = new Set()
  snap.forEach(doc => {
    const d = doc.data()
    if (d.vibe_tags) d.vibe_tags.forEach(v => vibes.add(v))
  })
  console.log('Unique Vibes in DB:', [...vibes].sort())
}
getAllVibes().then(() => process.exit(0))
