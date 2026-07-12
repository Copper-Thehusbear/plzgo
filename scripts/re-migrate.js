/**
 * re-migrate.js
 * Cleans Thai characters from description_tourist and adds 'local' and 'shopping' tags.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore }        from 'firebase-admin/firestore'
import { readFileSync }        from 'fs'
import { resolve, dirname }    from 'path'
import { fileURLToPath }       from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sa = JSON.parse(readFileSync(resolve(__dirname, '../plzgo-db-task/service-account.json'), 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const THAI_REGEX = /[\u0E00-\u0E7F]/g

function cleanEnglish(text) {
  if (!text) return ''
  // Remove Thai characters and extra spaces
  return text.replace(THAI_REGEX, '').replace(/\s+/g, ' ').trim()
}

async function run() {
  console.log('📖 Fetching all Bangkok places...')
  const snap = await db.collection('places').where('city', '==', 'Bangkok').get()
  console.log(`✅ Found ${snap.size} places to update\n`)

  const batchSize = 400
  let batch = db.batch()
  let count = 0, total = 0

  for (const docSnap of snap.docs) {
    const d = docSnap.data()
    
    const vibeTags = new Set(d.vibe_tags || [])
    
    // Add 'local' tag
    if (d.vibe_primary === 'Local' || d.vibe_secondary === 'Local') {
      vibeTags.add('local')
    }
    
    // Add 'shopping' tag
    if (d.category === 'Shop & Market') {
      vibeTags.add('shopping')
    }

    const update = {
      vibe_tags: [...vibeTags],
      description_tourist: cleanEnglish(d.description_tourist),
      // Ensure name_en is definitely there (it should be, but let's be safe)
      name_en: d.name_en || d.plzgo_id || 'Bangkok Spot'
    }

    batch.update(docSnap.ref, update)
    count++
    total++

    if (count >= batchSize) {
      await batch.commit()
      console.log(`  📦 Committed batch (total: ${total})`)
      batch = db.batch()
      count = 0
    }
  }

  if (count > 0) {
    await batch.commit()
    console.log(`  📦 Final batch (total: ${total})`)
  }

  console.log(`\n✨ Re-migration complete! Updated ${total} places.`)
  process.exit(0)
}

run().catch(e => { console.error('❌', e); process.exit(1) })
