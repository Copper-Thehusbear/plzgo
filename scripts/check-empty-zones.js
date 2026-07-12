import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

async function checkEmptyZones() {
  const snap = await db.collection('places').get()
  let empty = 0
  let total = 0
  snap.forEach(doc => {
    total++
    if (!doc.data().zone) {
      empty++
      // console.log('Empty zone doc:', doc.id, doc.data().name_en)
    }
  })
  console.log(`Total: ${total}, Empty Zones: ${empty}`)
}
checkEmptyZones().then(() => process.exit(0))
