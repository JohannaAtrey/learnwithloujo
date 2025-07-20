import { db, auth } from '@/lib/firebase-admin';

/**
 * Add a student to work under a teacher
 */
export async function addStudentToTeacher(teacherEmail: string, studentEmail: string) {
  try {
    // Get teacher and student user records
    const teacherRecord = await auth.getUserByEmail(teacherEmail);
    const studentRecord = await auth.getUserByEmail(studentEmail);

    // Verify the user exists and is a student
    if (!studentRecord) {
      throw new Error('Student account not found');
    }
    const studentCustomClaims = studentRecord.customClaims || {};
    if (studentCustomClaims.role !== 'student') {
      console.error(`[addStudentToTeacher] Role check failed for ${studentEmail}. Claims:`, JSON.stringify(studentCustomClaims));
      throw new Error('User is not a student');
    }

    // Check if relationship already exists (by UID or email)
    const existingRelationships = await db
      .collection('teacher_student_relationships')
      .where('studentId', '==', studentRecord.uid)
      .where('teacherId', '==', teacherRecord.uid)
      .get();
    if (!existingRelationships.empty) {
      throw new Error('Student is already assigned to this teacher');
    }

    // Create the relationship with both UIDs and emails
    const relationship = {
      teacherId: teacherRecord.uid,
      teacherEmail,
      studentId: studentRecord.uid,
      studentEmail,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('teacher_student_relationships').add(relationship);
    return { success: true, message: 'Student successfully added' };
  } catch (error: unknown) {
    console.error('Error adding student to teacher:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to add student');
  }
}

/**
 * Remove a student from working under a teacher
 */
export async function removeStudentFromTeacher(teacherEmail: string, studentEmail: string) {
  try {
    // Get the student's user record
    const studentRecord = await auth.getUserByEmail(studentEmail);
    
    if (!studentRecord) {
      throw new Error('Student account not found');
    }

    // Find and delete the relationship
    const relationships = await db
      .collection('teacher_student_relationships')
      .where('studentEmail', '==', studentEmail)
      .where('teacherEmail', '==', teacherEmail)
      .get();

    if (relationships.empty) {
      throw new Error('Student is not assigned to this teacher');
    }

    // Delete all matching relationships (should only be one)
    const deletePromises = relationships.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    return { success: true, message: 'Student successfully removed' };
  } catch (error: unknown) {
    console.error('Error removing student from teacher:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to remove student');
  }
}

/**
 * Create a new student account and add them under a teacher
 */
export async function createStudentAndAddToTeacher(
  teacherEmail: string,
  studentEmail: string,
  password: string,
  displayName: string
) {
  try {
    // Create the student account
    const userRecord = await auth.createUser({
      email: studentEmail,
      password,
      displayName
    });

    // Set custom claims for student role
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'student'
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: studentEmail,
      displayName,
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add the relationship
    await addStudentToTeacher(teacherEmail, studentEmail);

    return {
      success: true,
      message: 'Student account created and added successfully',
      email: studentEmail
    };
  } catch (error: unknown) {
    console.error('Error creating student account:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create student account');
  }
}
