import { db, auth } from '@/lib/firebase-admin'; // Corrected imports

interface SchoolTeacherRelationship {
  schoolAdminEmail: string;
  teacherEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Add a teacher to work under a school admin
 */
export async function addTeacherToSchoolAdmin(schoolAdminEmail: string, teacherEmail: string) {
  try {
    // First, get the teacher's user record from Firebase Auth
    const teacherRecord = await auth.getUserByEmail(teacherEmail); // Use auth directly

    // Verify the user exists and is a teacher
    if (!teacherRecord) {
      throw new Error('Teacher account not found');
    }

    const teacherCustomClaims = teacherRecord.customClaims || {};
    if (teacherCustomClaims.role !== 'teacher') {
      throw new Error('User is not a teacher');
    }

    // Check if relationship already exists
    const existingRelationships = await db
      .collection('school_teacher_relationships')
      .where('teacherEmail', '==', teacherEmail)
      .where('schoolAdminEmail', '==', schoolAdminEmail)
      .get();

    if (!existingRelationships.empty) {
      throw new Error('Teacher is already assigned to this school admin');
    }

    // Fetch the school admin's user document to get their schoolId
    const adminAuthRecord = await auth.getUserByEmail(schoolAdminEmail);
    if (!adminAuthRecord) {
        throw new Error('School Admin authentication record not found.');
    }
    const adminUserDocRef = db.collection('users').doc(adminAuthRecord.uid);
    const adminUserDoc = await adminUserDocRef.get();
    const schoolId = adminUserDoc.data()?.schoolId;

    if (!schoolId) {
      throw new Error('School Admin is not associated with a school. Cannot assign teacher.');
    }

    // Update the teacher's user document with the schoolId
    // This ensures existing teachers also get the schoolId set if they are added.
    const teacherUserDocRef = db.collection('users').doc(teacherRecord.uid);
    await teacherUserDocRef.set({
      schoolId: schoolId,
      updatedAt: new Date() // Also update the timestamp
    }, { merge: true });


    // Create the relationship document
    const relationship: SchoolTeacherRelationship = {
      schoolAdminEmail,
      teacherEmail,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('school_teacher_relationships').add(relationship);
    return { success: true, message: 'Teacher successfully added and associated with school.' };
  } catch (error: unknown) {
    console.error('Error adding teacher to school admin:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to add teacher');
  }
}

/**
 * Remove a teacher from working under a school admin
 */
export async function removeTeacherFromSchoolAdmin(schoolAdminEmail: string, teacherEmail: string) {
  try {
    // Get the teacher's user record
    const teacherRecord = await auth.getUserByEmail(teacherEmail); // Use auth directly
    
    if (!teacherRecord) {
      throw new Error('Teacher account not found');
    }

    // Find and delete the relationship
    const relationships = await db
      .collection('school_teacher_relationships')
      .where('teacherEmail', '==', teacherEmail)
      .where('schoolAdminEmail', '==', schoolAdminEmail)
      .get();

    if (relationships.empty) {
      throw new Error('Teacher is not assigned to this school admin');
    }

    // Delete all matching relationships (should only be one)
    const deletePromises = relationships.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    return { success: true, message: 'Teacher successfully removed' };
  } catch (error: unknown) {
    console.error('Error removing teacher from school admin:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to remove teacher');
  }
}

/**
 * Get all teachers working under a school admin
 */
export async function getTeachersUnderSchoolAdmin(schoolAdminEmail: string) {
  try {
    const relationships = await db
      .collection('school_teacher_relationships')
      .where('schoolAdminEmail', '==', schoolAdminEmail)
      .get();

    const teachers = relationships.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: new Date(doc.data().createdAt._seconds * 1000 + Math.floor(doc.data().createdAt._nanoseconds / 1_000_000))
    }));

    return teachers;
  } catch (error: unknown) {
    console.error('Error getting teachers under school admin:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get teachers');
  }
}

/**
 * Create a new teacher account and add them under a school admin
 */
export async function createTeacherAndAddToSchoolAdmin(
  schoolAdminEmail: string,
  teacherEmail: string,
  password: string,
  displayName: string
) {
  try {
    // Create the teacher account
    const userRecord = await auth.createUser({ // Use auth directly
      email: teacherEmail,
      password,
      displayName
    });

    // Set custom claims for teacher role
    await auth.setCustomUserClaims(userRecord.uid, { // Use auth directly
      role: 'teacher'
    });

    // Fetch the school admin's user document to get their schoolId
    const adminAuthRecord = await auth.getUserByEmail(schoolAdminEmail);
    if (!adminAuthRecord) { // Should not happen if schoolAdminEmail is valid
        throw new Error('School Admin authentication record not found.');
    }
    const adminUserDocRef = db.collection('users').doc(adminAuthRecord.uid);
    const adminUserDoc = await adminUserDocRef.get();
    const schoolId = adminUserDoc.data()?.schoolId;

    if (!schoolId) {
      throw new Error('School Admin is not associated with a school. Cannot assign teacher.');
    }

    // Create user document in Firestore, including schoolId
    await db.collection('users').doc(userRecord.uid).set({
      email: teacherEmail,
      displayName,
      role: 'teacher',
      schoolId: schoolId, // Assign schoolId to the teacher
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add the relationship
    await addTeacherToSchoolAdmin(schoolAdminEmail, teacherEmail);

    return {
      success: true,
      message: 'Teacher account created and added successfully',
      email: teacherEmail
    };
  } catch (error: unknown) {
    console.error('Error creating teacher account:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create teacher account');
  }
}
