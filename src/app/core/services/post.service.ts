import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post, CreatePostDto } from '../models/post.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly API = `${environment.apiUrl}/posts`;

  constructor(private http: HttpClient) { }

  getAllPosts(filters?: { type?: string; location?: string }): Observable<Post[]> {
    let params = new HttpParams();
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.location) params = params.set('location', filters.location);
    return this.http.get<Post[]>(this.API, { params });
  }

  getPostById(id: string): Observable<Post> {
    return this.http.get<Post>(`${this.API}/${id}`);
  }

  getMyPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.API}/my-posts`);
  }

  getReportedPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.API}/reported`);
  }

  createPost(dto: CreatePostDto, imageFile?: File): Observable<Post> {
    const formData = new FormData();
    console.log(String(dto.isAnonymous));

    formData.append('title', dto.title);
    formData.append('content', dto.content);
    formData.append('location', dto.location);
    formData.append('type', dto.type);
    // if (dto.isAnonymous !== undefined) {
    formData.append('isAnonymous', String(dto.isAnonymous));
    // }
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return this.http.post<Post>(this.API, formData);
  }

  updatePost(id: string, dto: Partial<CreatePostDto>): Observable<Post> {
    return this.http.patch<Post>(`${this.API}/${id}`, dto);
  }

  togglePostActive(id: string): Observable<Post> {
    return this.http.patch<Post>(`${this.API}/${id}/toggle-active`, {});
  }

  reportPost(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.API}/${id}/report`, { reason });
  }

  clearReport(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}/report`);
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  // Méthode de compatibilité pour le composant modération (sync)
  isReported(id: string): boolean {
    // Avec le backend, isReported est un champ du post lui-même
    // Cette méthode est conservée pour compatibilité mais non utilisée
    return false;
  }

  getReportedPostIds(): string[] {
    return [];
  }
}
