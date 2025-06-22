import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FormGroup, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule, NgIf],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  host: { ngSkipHydration: 'true' }
})
export class LoginComponent {
  loading = false;
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(private router: Router, private authService: AuthService, private fb: FormBuilder){
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
  })
  }

  async onSubmit(){

    if(this.loginForm.invalid){
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try{
      const {email, password} = this.loginForm.value;
      console.log(this.loginForm.value);
      this.authService.signIn(email, password);
    }catch(error: any){
      console.log(error);
    }finally{
      this.isLoading = false;
    }
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  // Other login options
   async signInWithGoogle(): Promise<void> {
    this.loading = true;
    try {
       await this.authService.signInWithGoogleAccount();
    } catch (error) {
      console.error('Google sign-in failed:', error);
      // Handle error (show toast, etc.)
    } finally {
      this.loading = false;
    }
  }
}
