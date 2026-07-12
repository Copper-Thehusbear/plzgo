import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

async function addWellnessTag() {
  console.log('Adding wellness tag to places in Wellness category...')
  const snap = await db.collection('places').where('category', '==', 'Wellness').get()
  const batch = db.batch()
  let count = 0
  
  snap.forEach(doc => {
    const data = doc.data()
    const currentVibes = data.vibe_tags || []
    if (!currentVibes.includes('wellness')) {
      batch.update(doc.ref, {
        vibe_tags: [...currentVibes, 'wellness']
      })
      count++
    }
  })
  
  if (count > 0) {
    await batch.commit()
    console.log(`Updated ${count} places with wellness tag.`)
  } else {
    console.log('No places needed updating.')
  }
}
addWellnessTag().then(() => process.exit(0))
