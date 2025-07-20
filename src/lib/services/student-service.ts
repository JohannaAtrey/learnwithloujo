import { db } from '@/lib/firebase-admin';
import { User } from '@/types';

export interface TeacherStudent {
  id: string;
  studentId: string;
  name: string;
  email: string;
  relationshipId: string;
  createdAt: Date; // Firestore Timestamp
}

/**
 * Get all students under a teacher with their full details
 */
export async function getTeacherStudents(teacherId: string): Promise<TeacherStudent[]> {
  try {
    // Get teacher-student relationships
    const relationshipsRef = db.collection('teacher_student_relationships');
    const relationshipsQuery = relationshipsRef
      .where('teacherId', '==', teacherId)
      .orderBy('createdAt', 'desc');
    
    const relationshipsSnapshot = await relationshipsQuery.get();
    
    if (relationshipsSnapshot.empty) {
      return [];
    }

    // Get all student details in one batch (by document ID)
    const studentIds = relationshipsSnapshot.docs.map(doc => doc.data().studentId);
    const studentDocs = await db.getAll(
      ...studentIds.map(id => db.collection('users').doc(id))
    );

    const studentMap = new Map(
      studentDocs
        .filter(doc => doc.exists)
        .map(doc => [doc.id, { id: doc.id, ...doc.data() } as User])
    );

    // Combine relationship and student data
    return relationshipsSnapshot.docs
      .map(doc => {
        const relationshipData = doc.data();
        const studentData = studentMap.get(relationshipData.studentId);
        
        if (!studentData) {
          console.warn(`Student data not found for ID: ${relationshipData.studentId}`);
          return null;
        }

        return {
          id: doc.id, // relationship ID
          studentId: relationshipData.studentId,
          name: studentData.name || studentData.displayName || studentData.email,
          email: studentData.email,
          relationshipId: doc.id,
          createdAt: new Date(relationshipData.createdAt._seconds * 1000 + Math.floor(relationshipData.createdAt._nanoseconds / 1_000_000))
        };
      })
      .filter((student): student is TeacherStudent => student !== null);
  } catch (error) {
    console.error('Error in getTeacherStudents:', error);
    throw new Error('Failed to fetch teacher students');
  }
} 