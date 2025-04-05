import { Injectable, runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { User } from '../models/user.model';
import { map, Observable, of, switchMap, take } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user$: Observable<User | null>;
  
  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private injector: EnvironmentInjector
  ) {
    // Get auth data, then get firestore user document or null
    this.user$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          return this.firestore.doc<User>(`users/${user.uid}`).valueChanges().pipe(
            map(userData => {
              // Ensure we have the most current Firebase auth data
              return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || userData?.displayName,
                photoURL: user.photoURL || userData?.photoURL,
                emailVerified: user.emailVerified,
                lastLogin: Date.now(),
                ...userData
              } as User;
            })
          );
        } else {
          return of(null);
        }
      })
    );
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, displayName?: string): Promise<void> {
    try {
      const credential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      const user = credential.user;
      
      // Update display name if provided
      if (user && displayName) {
        await user.updateProfile({ displayName });
      }
      
      // Try to save to Firestore but don't let it stop the app flow
      if (user) {
        try {
          await this.setUserData(user, { displayName }).catch(err => {
            console.warn('Non-critical error setting user data:', err);
            // Continue despite the error
          });
        } catch (firestoreError) {
          // Log the error but don't stop the signup process
          console.warn('Could not save user profile data, but user was created:', firestoreError);
        }
        
        // Continue with navigation regardless of whether setUserData succeeded
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error; // Re-throw auth errors since these are critical
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<void> {
    try {
      const credential = await this.afAuth.signInWithEmailAndPassword(email, password);
      
      // Update user data on login
      if (credential.user) {
        await this.updateUserData(credential.user);
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this.afAuth.signOut();
    this.router.navigate(['/login']);
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<void> {
    try {
      return this.afAuth.sendPasswordResetEmail(email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): Observable<boolean> {
    return this.user$.pipe(
      map(user => !!user)
    );
  }

  /**
   * Get current user (one-time fetch)
   */
  getCurrentUser(): Observable<User | null> {
    return this.user$.pipe(take(1));
  }

  /**
   * Update user email
   */
  async updateEmail(newEmail: string, password: string): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) throw new Error('No authenticated user');
      
      // Re-authenticate user before changing email
      const credential = await this.afAuth.signInWithEmailAndPassword(user.email || '', password);
      if (credential.user) {
        await credential.user.updateEmail(newEmail);
        await this.updateUserData(credential.user);
      }
    } catch (error) {
      console.error('Update email error:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user || !user.email) throw new Error('No authenticated user');
      
      // Re-authenticate user before changing password
      const credential = await this.afAuth.signInWithEmailAndPassword(user.email, currentPassword);
      if (credential.user) {
        await credential.user.updatePassword(newPassword);
      }
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(): Promise<void> {
    const user = await this.afAuth.currentUser;
    if (user) {
      return user.sendEmailVerification();
    }
    throw new Error('No authenticated user');
  }

  /**
   * Set user data in Firestore on registration
   */
  private async updateUserData(user: any): Promise<void> {
    // Explicitly run the Firestore operation within the injection context
    return runInInjectionContext(this.injector, async () => {
      const userPath = `users/${user.uid}`;
      const userRef = this.firestore.doc<User>(userPath);

      const userData = {
        // Ensure all necessary fields are included, avoid spreading 'user' directly if it contains methods or complex objects
        uid: user.uid,
        email: user.email || '', // Add null checks
        displayName: user.displayName || '', // Add null checks
        photoURL: user.photoURL || '', // Add null checks
        emailVerified: user.emailVerified || false,
        lastLogin: Date.now()
      };

      try {
        await userRef.set(userData, { merge: true });
      } catch (error) {
         console.error('Error updating user data in Firestore:', error);
         // Decide if you need to re-throw or handle differently
         throw error;
      }
    });
  }

   // Apply the same pattern to setUserData if it causes similar issues
  private async setUserData(user: any, additionalData: any = {}): Promise<void> {
     return runInInjectionContext(this.injector, async () => {
        if (!user || !user.uid) {
          console.error('Invalid user data passed to setUserData');
          throw new Error('Invalid user data');
        }

        const userPath = `users/${user.uid}`;
        const userRef = this.firestore.doc<User>(userPath);

        const userData: User = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || additionalData.displayName || '',
          photoURL: user.photoURL || '',
          emailVerified: user.emailVerified || false,
          createdAt: Date.now(), 
          lastLogin: Date.now(), 
          ...additionalData
        };

        try {
           await userRef.set(userData, { merge: true });
        } catch (error) {
           console.error('Error setting user data in Firestore:', error);
           // Handle or re-throw as needed
           throw error;
         }
    });
  }

}
