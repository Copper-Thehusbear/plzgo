import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
// Region must match the Function's onCall region (functions/index.js → asia-southeast1).
export const functions = getFunctions(app, 'asia-southeast1')

// Analytics only activates when VITE_FIREBASE_MEASUREMENT_ID is set
export let analytics = null
if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
  isSupported().then(yes => {
    if (yes) analytics = getAnalytics(app)
  })
}
