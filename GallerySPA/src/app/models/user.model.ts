export interface User {
    uid: string;
    email: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    emailVerified: boolean;
    createdAt?: number;
    lastLogin?: number;
  }