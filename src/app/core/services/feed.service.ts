import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FeedAuthor {
  userId: string;
  pseudo: string;
  photoUrl: string | null;
}

export interface FeedPost {
  _id: string;
  author: FeedAuthor;
  content: string;
  mediaType: 'image' | 'video' | 'mixed' | 'none';
  mediaUrls: string[];
  mediaFileTypes: string[]; // type par fichier : 'image' | 'video'
  location: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  likedBy: string[];
  createdAt: string;
  isVisible: boolean;
}

export interface FeedPage {
  posts: FeedPost[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly API = `${environment.apiUrl}/feed`;
  private http = inject(HttpClient);

  getFeed(page = 1, limit = 10): Observable<FeedPage> {
    return this.http.get<FeedPage>(`${this.API}?page=${page}&limit=${limit}`);
  }

  getPostById(postId: string): Observable<FeedPost> {
    return this.http.get<FeedPost>(`${this.API}/${postId}`);
  }

  createPost(formData: FormData): Observable<FeedPost> {
    return this.http.post<FeedPost>(this.API, formData);
  }

  toggleLike(postId: string): Observable<{ liked: boolean; likesCount: number }> {
    return this.http.patch<{ liked: boolean; likesCount: number }>(
      `${this.API}/${postId}/like`, {}
    );
  }

  deletePost(postId: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${postId}`);
  }

  addComment(postId: string, content: string): Observable<any> {
    return this.http.post(`${this.API}/${postId}/comments`, { content });
  }

  getComments(postId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/${postId}/comments`);
  }

  incrementShares(postId: string): Observable<void> {
    return this.http.post<void>(`${this.API}/${postId}/share`, {});
  }
}
