// Script to assign a custom Firebase role (default: 'admin') to a user by email or UID using a service account key.
// Also attempts to update the user's role in Firestore if the user document exists.

const role_to_be_set='admin';


const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Get the email/uid from command line
const userIdentifier = process.argv[2];
const serviceAccountPath = process.argv[3] || './certificates/serviceAccount.json';

if (!userIdentifier) {
  console.error('Error: Please provide a user email or UID');
  console.error('Usage: node make-admin-json.js your-user@email.com [./path/to/serviceAccountKey.json]');
  process.exit(1);
}

// Check if service account file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Error: Service account file not found at ${serviceAccountPath}`);
  console.error('Download your service account key from Firebase Console:');
  console.error('  1. Go to Project Settings > Service Accounts');
  console.error('  2. Click "Generate New Private Key"');
  console.error('  3. Save the file as serviceAccountKey.json in this directory or specify the path');
  process.exit(1);
}

// Load the service account
try {
  const serviceAccount = require(path.resolve(serviceAccountPath));
  
  // Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log(`Using service account for project: ${serviceAccount.project_id}`);
} catch (error) {
  console.error('Error loading service account file:', error.message);
  process.exit(1);
}

// Make the user an admin
async function makeAdmin() {
  try {
    // Check if input is email or uid
    let uid;
    if (userIdentifier.includes('@')) {
      console.log(`Looking up user by email: ${userIdentifier}`);
      const user = await admin.auth().getUserByEmail(userIdentifier);
      uid = user.uid;
      console.log(`Found user with UID: ${uid}`);
    } else {
      uid = userIdentifier;
      console.log(`Using provided UID: ${uid}`);
    }

    // Get current claims if any
    const user = await admin.auth().getUser(uid);
    console.log('Current custom claims:', user.customClaims || 'none');

    // Set the admin custom claim
    await admin.auth().setCustomUserClaims(uid, { role: role_to_be_set });
    
    console.log(`✅ Success! User ${userIdentifier} is now an ${role_to_be_set}.`);
    
    // Verify the change
    const updatedUser = await admin.auth().getUser(uid);
    console.log('Updated custom claims:', updatedUser.customClaims);
    
    console.log('\nNOTE: The user will need to log out and log back in for changes to take effect.');
    
    // Optional: Update user in Firestore too
    try {
      await admin.firestore().collection('users').doc(uid).update({
        role: role_to_be_set,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Firestore user document also updated.');
    } catch (err) {
      console.warn('⚠️ Could not update Firestore document. You may need to update it manually.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

makeAdmin();