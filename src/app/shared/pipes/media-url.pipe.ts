import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Transforme une URL d'image relative (ex: /uploads/images/post-xxx.jpg)
 * en URL absolue pointant vers le backend (ex: http://localhost:3000/uploads/images/post-xxx.jpg).
 * Les URLs déjà absolues (http/https/data:) sont retournées telles quelles.
 */
@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    if (!url) return '';
    // Déjà absolue ou data URI → retourner tel quel
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    // URL relative → préfixer avec l'URL du backend
    const base = environment.apiUrl.replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }
}
