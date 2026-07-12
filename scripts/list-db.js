import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

async function listCollections() {
  const collections = await db.listCollections()
  for (const col of collections) {
    console.log(`Collection: ${col.id}`)
    const snap = await col.limit(2).get()
    snap.forEach(doc => {
      console.log(`  Document ID: ${doc.id}`)
      console.log('  Data:', JSON.stringify(doc.data(), (key, value) => {
        if (Array.isArray(value)) return `[Array length: ${value.length}]`
        if (key === 'location' && value && value.latitude) return `[Lat: ${value.latitude}, Lng: ${value.longitude}]`
        return value
      }, 4))
    })
  }
}
listCollections().then(() => process.exit(0))
