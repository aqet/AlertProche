import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Comment, CreateCommentDto } from '../models/comment.model';
import { environment } from '../../../environments/environment';
import { ModerationService } from './moderation.service';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly API = `${environment.apiUrl}/comments`;

  constructor(
    private http: HttpClient,
    private moderateService: ModerationService,
  ) {}

  getCommentsByPost(postId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.API}/post/${postId}`);
  }

  getMyComments(): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.API}/my-comments`);
  }

  createComment(postId: string, dto: CreateCommentDto): Observable<Comment> {
    let ModerationResult = this.moderateService.getModerationMessage(dto.content);
    if (ModerationResult) return throwError(() => new Error(ModerationResult));
    return this.http.post<Comment>(`${this.API}/post/${postId}`, dto);
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
