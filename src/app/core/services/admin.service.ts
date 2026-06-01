import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminStats {
  users: {
    total: number;
    standard: number;
    moderateur: number;
    admin: number;
    newThisWeek: number;
  };
  posts: {
    total: number;
    reported: number;
    disabled: number;
    disparitions: number;
    abus: number;
    prevention: number;
    newThisWeek: number;
  };
  comments: { total: number };
  activityByDay: { _id: string; count: number }[];
}

export interface AdminUser {
  _id: string;
  email: string;
  pseudo: string;
  role: 'Standard' | 'Moderateur' | 'Admin';
  createdAt: string;
  postCount: number;
  commentCount: number;
}

export interface AdminPost {
  _id: string;
  title: string;
  type: string;
  location: string;
  isActive: boolean;
  isReported: boolean;
  isAnonymous: boolean;
  authorPseudo: string;
  authorEmail: string;
  commentCount: number;
  createdAt: string;
  reportReasons?: string[];
}

export interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedPosts {
  posts: AdminPost[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly API = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.API}/stats`);
  }

  getUsers(page = 1, limit = 20, search?: string): Observable<PaginatedUsers> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedUsers>(`${this.API}/users`, { params });
  }

  updateUserRole(userId: string, role: string): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.API}/users/${userId}/role`, { role });
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/users/${userId}`);
  }

  getPosts(page = 1, limit = 20, filter?: string): Observable<PaginatedPosts> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filter) params = params.set('filter', filter);
    return this.http.get<PaginatedPosts>(`${this.API}/posts`, { params });
  }

  deletePost(postId: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/posts/${postId}`);
  }
}
