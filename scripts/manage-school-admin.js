// Script to manage school admin roles in Firebase via CLI: add, remove, or list school administrators by updating custom claims and Firestore documents.

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Get the command and email from command line
const command = process.argv[2];
const email = process.argv[3];

// Valid commands
const VALID_COMMANDS = ['add', 'remove', 'list'];

// Initialize Firebase Admin
function initializeFirebase() {
  try {
    const serviceAccountPath = './certificates/serviceAccount.json';
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`Error: Service account file not found at ${serviceAccountPath}`);
      process.exit(1);
    }

    const serviceAccount = require(path.resolve(serviceAccountPath));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log(`Using service account for project: ${serviceAccount.project_id}`);
  } catch (error) {
    console.error('Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

// Add a school admin
async function addSchoolAdmin(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user with UID: ${user.uid}`);

    // Check current claims
    console.log('Current custom claims:', user.customClaims || 'none');

    // Set the school_admin custom claim
    await admin.auth().setCustomUserClaims(user.uid, { role: 'school_admin' });
    
    // Update Firestore document
    await admin.firestore().collection('users').doc(user.uid).update({
      role: 'school_admin',
      updatedAt: new Date().toISOString()
    });

    // Verify the change
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('✅ Success! User is now a school admin');
    console.log('Updated custom claims:', updatedUser.customClaims);
    console.log('\nNOTE: The user will need to log out and log back in for changes to take effect.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Remove a school admin
async function removeSchoolAdmin(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user with UID: ${user.uid}`);

    // Check if user is actually a school admin
    if (!user.customClaims?.role === 'school_admin') {
      console.log('This user is not a school admin.');
      return;
    }

    // Remove the school_admin role by setting role to 'teacher'
    await admin.auth().setCustomUserClaims(user.uid, { role: 'teacher' });
    
    // Update Firestore document
    await admin.firestore().collection('users').doc(user.uid).update({
      role: 'teacher',
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Success! School admin role has been removed');
    console.log('\nNOTE: The user will need to log out and log back in for changes to take effect.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// List all school admins
async function listSchoolAdmins() {
  try {
    // Query Firestore for all school admins
    const snapshot = await admin.firestore()
      .collection('users')
      .where('role', '==', 'school_admin')
      .get();

    if (snapshot.empty) {
      console.log('No school administrators found.');
      return;
    }

    console.log('\nCurrent School Administrators:');
    console.log('-----------------------------');
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.name} (${data.email})`);
    });

  } catch (error) {
    console.error('❌ Error listing school admins:', error.message);
  }
}

// Main execution
async function main() {
  // Validate command
  if (!command || !VALID_COMMANDS.includes(command)) {
    console.error('Error: Please provide a valid command (add, remove, or list)');
    console.error('Usage examples:');
    console.error('  node manage-school-admin.js add email@example.com');
    console.error('  node manage-school-admin.js remove email@example.com');
    console.error('  node manage-school-admin.js list');
    process.exit(1);
  }

  // Validate email for add/remove commands
  if ((command === 'add' || command === 'remove') && !email) {
    console.error('Error: Please provide an email address');
    process.exit(1);
  }

  // Initialize Firebase
  initializeFirebase();

  // Execute requested command
  switch (command) {
    case 'add':
      await addSchoolAdmin(email);
      break;
    case 'remove':
      await removeSchoolAdmin(email);
      break;
    case 'list':
      await listSchoolAdmins();
      break;
  }

  // Exit when done
  process.exit(0);
}

// Run the script
main(); 