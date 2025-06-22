import { Injectable, runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { User } from '../models/user.model';
import { map, Observable, of, switchMap, take } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { GoogleAuthProvider } from '@angular/fire/auth';

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
    this.user$ = this.afAuth.authState.pipe(
      map(user => {
        if (!user) return null;
        
        return {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          emailVerified: user.emailVerified || false,
          lastLogin: Date.now()
        } as User;
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
      
      if (user && displayName) {
        await user.updateProfile({ displayName });
      }
      
      if (user) {
        try {
          await this.setUserData(user, { displayName }).catch(err => {
            console.warn('Non-critical error setting user data:', err);
          });
        } catch (firestoreError) {
          console.warn('Could not save user profile data, but user was created:', firestoreError);
        }
        
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error; 
    }
  }

/**
 * Sign in with email and password
 */
async signIn(email: string, password: string): Promise<void> {
  try {
    const credential = await this.afAuth.signInWithEmailAndPassword(email, password);
    
    if (!credential.user) {
      throw new Error('No user returned after authentication');
    }
    console.log('User successfully authenticated:', credential.user.uid);
    try {
      await this.updateUserData(credential.user);
    } catch (updateError) {
      console.warn('Could not update user data but login successful:', updateError);
    }
    
    this.router.navigate(['/dashboard']);
    
  } catch (error: any) {
    console.error('Sign in error:', error);
    
    // Provide more specific error messages based on Firebase error codes
    if (error.code === 'auth/user-not-found') {
      throw new Error('User with this email does not exist');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts, please try again later');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled');
    } else {
      // Generic error message for other cases
      throw new Error('Login failed. Please check your credentials and try again.');
    }
  }
}

async signInWithGoogleAccount() : Promise<void> {
  const googleAuthProvider = new GoogleAuthProvider();
  googleAuthProvider.addScope('email');
  googleAuthProvider.addScope('profile');
  try {
    const result = await this.afAuth.signInWithPopup(googleAuthProvider);
  
    try {
      if(result.user){
        console.log(`View user data ${result.user}`)
        this.updateUserData(result.user);
        this.router.navigate(['/dashboard']);
      }
    }catch(loginError){
      console.log(loginError);
    }
  }catch(error){
    console.log(`An error occured with google auth ${error}`);
    return Promise.reject(error);
  }
}

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await this.afAuth.signOut();
      this.router.navigate(['/login']);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
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
  public async updateUserData(user: any): Promise<void> {
    // Explicitly run the Firestore operation within the injection context
    return runInInjectionContext(this.injector, async () => {
      const userPath = `users/${user.uid}`;
      const userRef = this.firestore.doc<User>(userPath);

      const userData = {
        uid: user.uid,
        email: user.email || '', 
        displayName: user.displayName || '', 
        photoURL: user.photoURL || '', 
        emailVerified: user.emailVerified || false,
        lastLogin: Date.now()
      };

      try {
        await userRef.set(userData, { merge: true });
      } catch (error) {
         console.error('Error updating user data in Firestore:', error);
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
           throw error;
         }
    });
  }

}
