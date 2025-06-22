import { Component, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  host: { ngSkipHydration: 'true' }
})
export class DashboardComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  user!:User;
  showUploadModal = false;
  isDragging = false;
  selectedFiles: File[] = [];

  constructor(private authService: AuthService){}

  ngOnInit(){
    this.authService.user$.subscribe({
      next: (resp) => {
        if(resp)
        {
          this.user = resp;
        }
      },
      error: (err) => {
        console.log(`error on user data ${err}`);
      }
    })
  }

  signOut(){
    this.authService.signOut();
  }


  openUploadModal() {
    this.showUploadModal = true;
  }
  
  closeUploadModal() {
    this.showUploadModal = false;
    this.selectedFiles = [];
  }
  
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    
    if (event.dataTransfer?.files) {
      // Convert FileList to Array
      const files = Array.from(event.dataTransfer.files);
      this.handleFiles(files);
    }
  }
  
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.handleFiles(files);
    }
  }
  
  handleFiles(files: File[]) {
    // Filter only images
    this.selectedFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Here you could add code to preview the images if needed
  }
  
  uploadImages(event: Event) {
    event.preventDefault();
    
    if (this.selectedFiles.length > 0) {
      // Here you would implement the file upload logic
      console.log('Uploading files:', this.selectedFiles);
      
      // After upload is complete:
      // this.closeUploadModal();
    }
  }
  
}
