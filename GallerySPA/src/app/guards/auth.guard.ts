// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.user$.pipe(
      take(1),
      map(user => {
        // If user is authenticated, allow access
        if (user) {
          return true;
        }
        
        // If not authenticated, redirect to login page
        console.log('Access denied - Not authenticated');
        return this.router.createUrlTree(['/login']);
      })
    );
  }
}