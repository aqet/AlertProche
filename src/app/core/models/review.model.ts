export interface Review {
  _id: string;
  pseudo: string | null;
  rating: number;
  message: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface ReviewStats {
  average: number;
  total: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateReviewDto {
  rating: number;
  message: string;
  isAnonymous: boolean;
}
