import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { NgIf } from '@angular/common';
@Component({
  selector: 'app-register',
  imports: [RouterLink, ReactiveFormsModule, NgIf],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router)
  {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit(){

    if(this.registerForm.invalid){
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try{
      const { firstName, lastName, email, password } = this.registerForm.value;
      console.log(this.registerForm.value);
      await this.authService.signUp(email, password, `${firstName}, ${lastName}`);
    }catch(error: any){
      this.errorMessage = error;
      console.log(error);
    }finally {
      this.isLoading = false;
    }
  }

  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
}
