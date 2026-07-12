import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

async function check() {
  const snap = await db.collection('places').limit(5).get()
  snap.forEach(doc => {
    const d = doc.data()
    console.log(`ID: ${d.plzgo_id} | NameEn: ${d.name_en} | Name: ${d.name}`)
    console.log(`DescTour: ${d.description_tourist?.slice(0, 100)}...`)
    console.log('---')
  })
}
check().then(() => process.exit(0))
