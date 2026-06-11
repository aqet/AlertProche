import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Post, CreatePostDto } from '../models/post.model';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { ModerationService } from './moderation.service';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly API = `${environment.apiUrl}/posts`;

  constructor(
    private http: HttpClient,
    private moderateService: ModerationService,
  ) {}

  getAllPosts(filters?: {
    type?: string;
    location?: string;
  }): Observable<Post[]> {
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

  async analyzeImage(image: File): Promise<any> {
    if (!image) return null;

    try {
      // 1. On compresse l'image directement dans le navigateur
      const compressed = await this.compressAndConvertToBase64(
        image,
        1024,
        0.7,
      );

      const payload = {
        image: compressed.base64, // Base64 ultra-léger
        mimeType: compressed.type,
      };

      // 2. Envoi rapide vers le backend
      const aiResponse = await firstValueFrom(
        this.http.post<any>(`${this.API}/analyze-image`, payload),
      );
      return aiResponse;
    } catch (error) {
      console.error("Erreur lors de la compression ou de l'analyse :", error);
      throw error;
    }
  }

  // 💡 Fonction à ajouter dans ton composant ou service Angular
  compressAndConvertToBase64(
    file: File,
    maxWidth = 1024,
    quality = 0.7,
  ): Promise<{ base64: string; type: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calcul du ratio pour ne pas déformer l'image
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Impossible de créer le contexte canvas');

          // Dessiner l'image redimensionnée dans le canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Récupérer la chaîne base64 compressée en JPEG (très léger)
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

          resolve({
            base64: compressedBase64,
            type: 'image/jpeg',
          });
        };
      };
      reader.onerror = (error) => reject(error);
    });
  }

  createPost(dto: CreatePostDto, imageFile?: File): Observable<Post> {
    const formData = new FormData();
    let ModerationResult = this.moderateService.getModerationMessage(dto.title);
    if (ModerationResult) return throwError(() => new Error(ModerationResult));
    ModerationResult = this.moderateService.getModerationMessage(dto.content);
    if (ModerationResult) return throwError(() => new Error(ModerationResult));
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
