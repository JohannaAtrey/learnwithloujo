import { Firestore } from 'firebase-admin/firestore';
import { Auth } from 'firebase-admin/auth';

export declare const db: Firestore;
export declare const getAuth: () => Auth;
export declare const auth: Auth; 