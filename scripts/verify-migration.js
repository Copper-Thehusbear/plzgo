import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

async function verify() {
  console.log('--- PLACES VERIFICATION ---')
  const placesSnap = await db.collection('places').where('city', '==', 'Bangkok').get()
  console.log('Total places with city "Bangkok":', placesSnap.size)

  if (placesSnap.size > 0) {
    const sample = placesSnap.docs[0].data()
    console.log('Sample Place Schema (First Doc):')
    // Truncate large arrays for readability
    const cleanSample = {}
    for (const key in sample) {
      if (Array.isArray(sample[key])) {
        cleanSample[key] = `[Array length: ${sample[key].length}]`
      } else {
        cleanSample[key] = sample[key]
      }
    }
    console.log(JSON.stringify(cleanSample, null, 2))
    
    // Check vibe distribution
    const vibes = {}
    placesSnap.forEach(doc => {
      const data = doc.data()
      if (data.vibe_tags) {
        data.vibe_tags.forEach(v => {
          vibes[v] = (vibes[v] || 0) + 1
        })
      }
    })
    console.log('\nVibe Tags Distribution:')
    console.log(JSON.stringify(vibes, null, 2))
  }

  console.log('\n--- HOTELS VERIFICATION ---')
  const hotelsSnap = await db.collection('hotels').limit(5).get()
  console.log('Sample Hotels (first 5):')
  hotelsSnap.forEach(doc => {
    const data = doc.data()
    console.log(`- ${data.name} | Zone: ${data.zone}`)
  })
}

verify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
