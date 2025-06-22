import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { UploadComponent } from './upload/upload.component';

export const routes: Routes = [
    {path: 'home', component : HomeComponent},
    {path: 'login', component : LoginComponent},
    {path : 'register', component : RegisterComponent},
    {path: '', redirectTo: '/home', pathMatch: 'full'},
    {path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]},
    {path: 'upload', component: UploadComponent}
];
