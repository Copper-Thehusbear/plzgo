#!/usr/bin/env node
/**
 * Fetches Google Places photos for every Firestore place that has no images yet,
 * then writes { images: [...], image_url: images[0] } back to the document.
 *
 * Prerequisites:
 *   1. Set env vars:
 *        GOOGLE_PLACES_API_KEY=<your key>
 *        GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   2. npm run fetch-images   (or: node scripts/fetch-images.js)
 *
 * Rate limit: Google Places allows ~10 req/s on free tier — we sleep 120ms between calls.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
if (!API_KEY) {
  console.error('❌  Missing GOOGLE_PLACES_API_KEY env var')
  process.exit(1)
}

initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) })
const db = getFirestore()

async function searchPlace(query) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.photos',
    },
    body: JSON.stringify({ textQuery: query }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Places API: ${data.error.message}`)
  return data.places?.[0] ?? null
}

async function getPhotoUrls(photos) {
  const urls = []
  for (const photo of photos.slice(0, 3)) {
    const mediaRes = await fetch(
      `https://places.googleapis.com/v1/${photo.name}/media` +
      `?maxWidthPx=800&skipHttpRedirect=true&key=${API_KEY}`
    )
    const mediaData = await mediaRes.json()
    if (mediaData.photoUri) urls.push(mediaData.photoUri)
  }
  return urls
}

async function getPlacePhotos(place) {
  const nameEn = place.name_en || place.name

  let result = await searchPlace(`${nameEn} Bangkok`)

  if (!result?.photos?.length && place.name !== nameEn) {
    result = await searchPlace(`${place.name} Bangkok`)
  }

  if (!result?.photos?.length) {
    result = await searchPlace(`${nameEn} ${place.zone}`)
  }

  if (!result?.photos?.length) return []
  return getPhotoUrls(result.photos)
}

async function run() {
  const snap = await db.collection('places')
    .where('city', '==', 'Bangkok')
    .get()

  const docs = snap.docs.filter(d => {
    const data = d.data()
    return !data.images?.length && !data.image_url
  })

  console.log(`Found ${docs.length} places without images\n`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const doc of docs) {
    const place = doc.data()
    const label = place.name_en || place.name

    try {
      const images = await getPlacePhotos(place)

      if (images.length) {
        await doc.ref.update({ images, image_url: images[0] })
        console.log(`✅  ${label} — ${images.length} photo(s)`)
        updated++
      } else {
        console.log(`⚠️   ${label} — no photos found`)
        skipped++
      }
    } catch (e) {
      console.log(`❌  ${label} — ${e.message}`)
      failed++
    }

    await new Promise(r => setTimeout(r, 120))
  }

  console.log(`\n── Summary ──────────────────────`)
  console.log(`Updated : ${updated}`)
  console.log(`Skipped : ${skipped}`)
  console.log(`Failed  : ${failed}`)
  console.log(`─────────────────────────────────`)
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
