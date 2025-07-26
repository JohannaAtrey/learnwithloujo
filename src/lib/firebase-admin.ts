import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Check if Firebase Admin has already been initialized
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "learnwithloujo-testing",
  });
}

// Export the auth and firestore admin instances
export const auth = getAuth();
export const db = getFirestore();

/**
 * Helper function to set user role via custom claims
 */
export async function setUserRole(uid: string, role: string): Promise<void> {
  try {
    // Validate role
    const validRoles = ['student', 'teacher', 'parent', 'admin', 'school_admin'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    
    // Set the custom claim
    await auth.setCustomUserClaims(uid, { role });
    
    // Update the user's document in Firestore for backwards compatibility
    await db.collection('users').doc(uid).update({ role });
    
    console.log(`Role ${role} set for user ${uid}`);
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
}

/**
 * Helper function to get user role from custom claims
 */
export async function getUserRole(uid: string): Promise<string | null> {
  try {
    const userRecord = await auth.getUser(uid);
    return userRecord.customClaims?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    throw error;
  }
}