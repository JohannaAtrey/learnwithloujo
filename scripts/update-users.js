// Script to update Firestore user documents: ensures only 'parent' users have a 'children' field (added if missing), and removes it from others.

const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json'); // Path to your service account key file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateUsers() {
  try {
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();

    const batch = db.batch();

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.role === 'parent') {
        // Add the children field with an empty array if it doesn't exist
        if (!userData.children) {
          const userRef = usersRef.doc(doc.id);
          batch.update(userRef, { children: [] });
        }
      } else {
        // Remove the children field if it exists
        if (userData.children) {
          const userRef = usersRef.doc(doc.id);
          batch.update(userRef, {
            children: admin.firestore.FieldValue.delete()
          });
        }
      }
    });

    await batch.commit();
    console.log('Successfully updated children field for users');
  } catch (error) {
    console.error('Error updating children field for users:', error);
  }
}

updateUsers();
