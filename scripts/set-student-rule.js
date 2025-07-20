// Script to assign a custom role (e.g., 'student') to a Firebase user by email using Admin SDK and service account credentials.


const admin = require('firebase-admin');
// Initialize Firebase Admin SDK with your service account
const serviceAccount = require('C:/Users/Johanna/Desktop/Files/Work/loujo-b3649-firebase-adminsdk-fbsvc-f0419de502.json'); // Replace with your actual path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const emailToUpdate = 'student@example.com'; // The email of the user
const roleToSet = 'student';                 // The role to set

async function setUserRole() {
  try {
    const user = await admin.auth().getUserByEmail(emailToUpdate);
    if (!user) {
      console.log(`User with email ${emailToUpdate} not found.`);
      return;
    }

    const currentClaims = user.customClaims || {};
    await admin.auth().setCustomUserClaims(user.uid, { ...currentClaims, role: roleToSet });
    console.log(`Successfully set role '${roleToSet}' for user ${emailToUpdate} (UID: ${user.uid}).`);

    // To verify (optional):
    // const updatedUser = await admin.auth().getUser(user.uid);
    // console.log('Updated claims:', updatedUser.customClaims);

  } catch (error) {
    console.error('Error setting user role:', error);
  }
}

setUserRole();
