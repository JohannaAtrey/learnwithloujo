import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { UserRecord } from 'firebase-admin/auth';

const db = getFirestore();
const auth = getAuth();

/**
 * Get all users with school_admin role
 */
export async function getAllSchoolAdmins(): Promise<UserRecord[]> {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('role', '==', 'school_admin').get();
    
    const schoolAdmins: UserRecord[] = [];
    for (const doc of snapshot.docs) {
      const userRecord = await auth.getUser(doc.id);
      schoolAdmins.push(userRecord);
    }
    
    return schoolAdmins;
  } catch (error) {
    console.error('Error getting school admins:', error);
    throw error;
  }
}

/**
 * Set a user's role to school_admin and create/link a school entity
 */
export async function promoteToSchoolAdmin(email: string, schoolName: string) {
  try {
    const user = await auth.getUserByEmail(email);

    // Check if user already has a schoolId - for simplicity, prevent re-promotion if they do
    // More complex logic could allow associating with an existing school if desired
    const userDocRef = db.collection('users').doc(user.uid);
    const userDoc = await userDocRef.get();
    if (userDoc.exists && userDoc.data()?.schoolId) {
      // If they are already a school_admin and have a schoolId, perhaps just update claims if needed
      // For now, let's throw an error to prevent creating a new school for an existing admin.
      // Or, if their role wasn't school_admin but they had a schoolId (unlikely state), this logic might need refinement.
      if (userDoc.data()?.role === 'school_admin') {
        throw new Error('User is already a school admin associated with a school.');
      }
    }

    // Create a new school document in 'schools' collection
    const schoolsRef = db.collection('schools');
    const newSchoolDocRef = await schoolsRef.add({
      name: schoolName,
      primaryAdminUid: user.uid,
      monthlyGenerationQuota: 100, // Default quota
      generationsThisMonth: 0,
      lastQuotaResetDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    const schoolId = newSchoolDocRef.id;

    // Set custom claims for school_admin role
    await auth.setCustomUserClaims(user.uid, {
      role: 'school_admin',
      schoolId: schoolId // Optionally include schoolId in claims if useful for security rules
    });
    // const schoolId = newSchoolDocRef.id; // Already defined above

    // Set custom claims for school_admin role
    // await auth.setCustomUserClaims(user.uid, { // Already set above
    //   role: 'school_admin',
    //   schoolId: schoolId // Optionally include schoolId in claims if useful for security rules
    // });

    // Update user document in Firestore with role and schoolId
    console.log(`[promoteToSchoolAdmin] Attempting to set schoolId ${schoolId} for user ${user.uid}`); // Log before set
    await userDocRef.set({
      email: user.email,
      displayName: user.displayName || schoolName, // Use displayName or schoolName as fallback
      role: 'school_admin',
      schoolId: schoolId, // Store the new school's ID
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`[promoteToSchoolAdmin] Successfully set schoolId ${schoolId} for user ${user.uid}`); // Log after set

    return { success: true, message: `User promoted to school admin and school '${schoolName}' created with ID ${schoolId}.` };
  } catch (error) {
    console.error('Error promoting to school admin:', error);
    throw error;
  }
}

/**
 * Change a school admin's role to teacher
 */
export async function demoteFromSchoolAdmin(email: string) {
  try {
    const user = await auth.getUserByEmail(email);
    
    // Set custom claims back to teacher
    await auth.setCustomUserClaims(user.uid, {
      role: 'teacher'
    });

    // Update user document in Firestore
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      role: 'teacher',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true, message: 'School admin demoted to teacher' };
  } catch (error) {
    console.error('Error demoting school admin:', error);
    throw error;
  }
}

/**
 * Delete a user account completely
 */
export async function deleteSchoolAdmin(email: string) {
  try {
    const user = await auth.getUserByEmail(email);
    
    // Delete from Firebase Auth
    await auth.deleteUser(user.uid);
    
    // Delete from Firestore
    await db.collection('users').doc(user.uid).delete();

    return { success: true, message: 'School admin deleted' };
  } catch (error) {
    console.error('Error deleting school admin:', error);
    throw error;
  }
}
