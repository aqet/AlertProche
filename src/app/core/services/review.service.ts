import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateReviewDto, Review, ReviewStats, ReviewsResponse } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly API = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  getReviews(page = 1, limit = 10): Observable<ReviewsResponse> {
    return this.http.get<ReviewsResponse>(`${this.API}?page=${page}&limit=${limit}`);
  }

  getStats(): Observable<ReviewStats> {
    return this.http.get<ReviewStats>(`${this.API}/stats`);
  }

  createReview(dto: CreateReviewDto): Observable<Review> {
    return this.http.post<Review>(this.API, dto);
  }
}
