const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Path to your service account key file
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('\n❌ Error: service-account.json not found!');
  console.log('Please upload your Service Account Key JSON file to Cloud Shell');
  console.log('and rename it to "service-account.json" inside the "plzgo-db-task" folder.\n');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportPlaces() {
  try {
    console.log('🚀 Starting export from "places" collection...');
    
    const snapshot = await db.collection('places').get();
    
    if (snapshot.empty) {
      console.log('No matching documents found in "places".');
      return;
    }

    const data = [];
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });

    const outputPath = path.join(__dirname, 'places_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`\n✅ Success! Exported ${data.length} places to:`);
    console.log(`📍 ${outputPath}\n`);
    
  } catch (error) {
    console.error('\n❌ Error during export:', error);
  } finally {
    process.exit(0);
  }
}

exportPlaces();
