import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { ImageItem } from '../models/image-item.models';
import { forkJoin, Observable, from } from 'rxjs';
import { switchMap, map, finalize } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  
  private readonly collectionName = 'images';
  
  constructor(
    private storage: AngularFireStorage,
    private firestore: AngularFirestore
  ) {}

  /**
   * Upload an image to Firebase Storage and save metadata to Firestore
   * @param file File to upload
   * @param customMetadata Optional custom metadata
   * @returns Observable with the uploaded image metadata
   */
  uploadImage(file: File, customMetadata: Record<string, string> = {}): Observable<ImageItem> {
    // Create a unique file path
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `images/${fileName}`;
    const fileRef = this.storage.ref(filePath);
    
    // Create upload task
    const task = this.storage.upload(filePath, file, {
      customMetadata
    });

    // Return an observable that completes when upload is done
    return from(task).pipe(
      switchMap(() => from(task.snapshotChanges())),
      finalize(() => {}),
      switchMap(() => fileRef.getDownloadURL()),
      switchMap(url => {
        // Create image metadata
        const imageData: ImageItem = {
          name: file.name,
          url: url,
          path: filePath,
          createdAt: timestamp,
          size: file.size,
          type: file.type
        };
        
        // Save to Firestore
        return from(this.firestore.collection(this.collectionName).add(imageData)).pipe(
          map(docRef => {
            return {
              id: docRef.id,
              ...imageData
            };
          })
        );
      })
    );
  }

  /**
   * Upload multiple images at once
   * @param files Array of files to upload
   * @returns Observable array of uploaded image metadata
   */
  uploadMultipleImages(files: File[]): Observable<ImageItem[]> {
    const uploads = files.map(file => this.uploadImage(file));
    return forkJoin(uploads);
  }

  /**
   * Get all images from Firestore
   * @returns Observable array of image metadata
   */
  getAllImages(): Observable<ImageItem[]> {
    return this.firestore.collection<ImageItem>(
      this.collectionName, 
      ref => ref.orderBy('createdAt', 'desc')
    )
    .valueChanges({ idField: 'id' });
  }

  /**
   * Get a single image by its ID
   * @param id Image ID
   * @returns Observable with image metadata
   */
  getImageById(id: string): Observable<ImageItem | undefined> {
    return this.firestore.doc<ImageItem>(`${this.collectionName}/${id}`)
      .valueChanges({ idField: 'id' });
  }

  /**
   * Delete an image from Storage and its metadata from Firestore
   * @param image Image metadata to delete
   * @returns Observable that completes when deletion is done
   */
  deleteImage(image: ImageItem): Observable<void> {
    const storageRef = this.storage.ref(image.path);
    
    // First delete from storage, then from firestore
    return from(storageRef.delete()).pipe(
      switchMap(() => {
        if (image.id) {
          return from(this.firestore.doc(`${this.collectionName}/${image.id}`).delete());
        } else {
          return from(Promise.resolve());
        }
      })
    );
  }

  /**
   * Search for images by name
   * @param query Search query
   * @returns Observable array of matching images
   */
  searchImages(query: string): Observable<ImageItem[]> {
    // Note: Firestore doesn't support native text search
    // This is a simplified approach for searching by name
    const searchTermLower = query.toLowerCase();
    
    return this.getAllImages().pipe(
      map(images => images.filter(img => 
        img.name.toLowerCase().includes(searchTermLower)
      ))
    );
  }


}
