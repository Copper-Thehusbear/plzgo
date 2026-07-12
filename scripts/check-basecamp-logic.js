import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const HUB_HOTEL_ZONES = {
  'Sukhumvit':       ['Watthana', 'Khlong Toei'],
  'Silom / Sathorn': ['Bang Rak', 'Sathon', 'Bang Kho Laem'],
  'Old City':        ['Phra Nakhon', 'Pom Prap Sattru Phai', 'Dusit'],
  'Thonglor':        ['Watthana'],
  'Yaowarat':        ['Samphanthawong', 'Pom Prap Sattru Phai', 'Bang Rak'],
  'Chatuchak':       ['Chatuchak', 'Phaya Thai'],
  'Ari':             ['Phaya Thai', 'Chatuchak'],
  'Riverside':       ['Bang Rak', 'Bang Kho Laem', 'Khlong San'],
}

for (const [hub, zones] of Object.entries(HUB_HOTEL_ZONES)) {
  const snap = await db.collection('hotels').where('zone', 'in', zones).get()
  const list = snap.docs
    .map(d => d.data())
    .filter(h => h.photo1)
    .sort((a, b) => {
      const ra = a.rating_average || 0
      const rb = b.rating_average || 0
      if (rb !== ra) return rb - ra
      return (b.number_of_reviews || 0) - (a.number_of_reviews || 0)
    })
    .slice(0, 3)
  console.log(`\n${hub.padEnd(18)} (${zones.join(',')}) → ${snap.size} hotels`)
  for (const h of list) {
    console.log(`  ${(h.hotel_name || '').padEnd(40)} ${h.zone.padEnd(20)} ★${h.star_rating || '?'} ${h.rating_average}/10`)
  }
}
process.exit(0)
