import {
  Component, inject, signal, output, computed, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { FeedService, FeedPost } from '../../../core/services/feed.service';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

// browser-image-compression est optionnel — on le charge dynamiquement
type ImageCompression = (file: File, options: object) => Promise<File>;

const MAX_IMAGE_MB  = 5;
const MAX_VIDEO_MB  = 15;
const MAX_FILES     = 4;
const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm'];

// Liste de grandes villes mondiales + villes camerounaises
const WORLD_CITIES: string[] = [
  // Cameroun
  'National', 'Yaoundé', 'Douala', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua',
  'Ngaoundéré', 'Bertoua', 'Ébolowa', 'Kribi', 'Limbe', 'Kumba', 'Edéa', 'Loum',
  'Nkongsamba', 'Dschang', 'Foumban', 'Buea', 'Mbouda', 'Kumbo', 'Mbalmayo',
  'Sangmélima', 'Batouri', 'Kousséri', 'Guider', 'Garoua Boulaï', 'Meïganga',
  'Tibati', 'Ngaoundal', 'Yokadouma', 'Abong Mbang', 'Ambam', 'Eséka', 'Tiko',
  // Afrique
  'Lagos', 'Abidjan', 'Dakar', 'Accra', 'Nairobi', 'Addis-Abeba', 'Kinshasa',
  'Luanda', 'Khartoum', 'Casablanca', 'Tunis', 'Alger', 'Le Caire', 'Johannesburg',
  'Cape Town', 'Dar es Salam', 'Maputo', 'Lusaka', 'Harare', 'Conakry',
  'Lomé', 'Cotonou', 'Bamako', 'Ouagadougou', 'Niamey', 'N\'Djamena',
  'Bangui', 'Libreville', 'Brazzaville', 'Malabo',
  // Europe
  'Paris', 'Londres', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Bruxelles',
  'Zurich', 'Vienne', 'Stockholm', 'Oslo', 'Copenhague', 'Helsinki', 'Varsovie',
  'Prague', 'Budapest', 'Lisbonne', 'Athènes', 'Bucarest', 'Sofia',
  // Amériques
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Toronto', 'Montréal',
  'Mexico', 'São Paulo', 'Rio de Janeiro', 'Buenos Aires', 'Bogotá', 'Lima',
  'Santiago', 'Caracas', 'La Havane', 'Miami', 'Washington',
  // Asie / Océanie
  'Tokyo', 'Pékin', 'Shanghai', 'Mumbai', 'Delhi', 'Bangalore', 'Séoul',
  'Bangkok', 'Singapour', 'Jakarta', 'Manille', 'Hanoï', 'Karachi', 'Lahore',
  'Dubaï', 'Riyad', 'Istanbul', 'Moscou', 'Sydney', 'Melbourne',
];

@Component({
  selector: 'app-create-feed-post',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-feed-post.component.html',
  styleUrls: ['./create-feed-post.component.css'],
})
export class CreateFeedPostComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private auth     = inject(AuthService);
  private feedSvc  = inject(FeedService);
  private http     = inject(HttpClient);

  /** Émis quand un post est créé avec succès */
  posted = output<FeedPost>();

  user = computed(() => this.auth.currentUser());

  content   = signal('');
  files     = signal<File[]>([]);
  previews  = signal<{ url: string; type: 'image' | 'video' }[]>([]);
  loading   = signal(false);
  error     = signal('');
  charCount = computed(() => this.content().length);

  // ── Localisation avec autocomplétion + validation IA ────────────────────
  locationInput       = signal('');
  locationSuggestions = signal<string[]>([]);
  locationValidating  = signal(false);
  locationError       = signal('');
  locationValid       = signal(false);
  showSuggestions     = signal(false);
  showLocationField   = signal(false);

  // ── Sélection de fichiers (corrigée) ─────────────────────────────────────
  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = ''; // reset pour permettre re-sélection

    this.error.set('');
    if (selected.length === 0) return;

    // Vérifier le nombre total AVANT traitement
    if (this.files().length + selected.length > MAX_FILES) {
      this.error.set(`Maximum ${MAX_FILES} fichiers par post.`);
      return;
    }

    const processed: File[] = [];
    const newPreviews: { url: string; type: 'image' | 'video' }[] = [];
    const errors: string[] = [];

    for (const file of selected) {
      const isImage = ALLOWED_IMAGE.includes(file.type);
      const isVideo = ALLOWED_VIDEO.includes(file.type);

      if (!isImage && !isVideo) {
        // Ignorer ce fichier avec message cumulatif, ne pas stopper
        errors.push(`Format non supporté : ${file.name}`);
        continue;
      }

      const maxBytes = isVideo ? MAX_VIDEO_MB * 1024 * 1024 : MAX_IMAGE_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        errors.push(`"${file.name}" dépasse ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB} Mo`);
        continue;
      }

      let finalFile = file;

      if (isImage) {
        finalFile = await this.compressImage(file);
      }

      processed.push(finalFile);
      newPreviews.push({
        url: URL.createObjectURL(finalFile),
        type: isImage ? 'image' : 'video',
      });
    }

    if (errors.length > 0) {
      this.error.set(errors.join('. ') + '.');
    }

    if (processed.length > 0) {
      this.files.update(f => [...f, ...processed]);
      this.previews.update(p => [...p, ...newPreviews]);
    }
  }

  removeFile(index: number): void {
    this.files.update(f => f.filter((_, i) => i !== index));
    this.previews.update(p => {
      URL.revokeObjectURL(p[index]?.url);
      return p.filter((_, i) => i !== index);
    });
  }

  // ── Compression image via browser-image-compression ─────────────────────
  private async compressImage(file: File): Promise<File> {
    try {
      const mod = await import('browser-image-compression' as any).catch(() => null);
      const compress: ImageCompression = mod?.default ?? mod;
      if (!compress) return file;

      const compressed = await compress(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      return new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
        type: 'image/webp',
      });
    } catch {
      return file;
    }
  }

  // ── Localisation ─────────────────────────────────────────────────────────

  onLocationInput(value: string): void {
    this.locationInput.set(value);
    this.locationError.set('');
    this.locationValid.set(false);

    const q = value.trim().toLowerCase();
    if (q.length < 2) {
      this.locationSuggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }

    const matches = WORLD_CITIES
      .filter(c => c.toLowerCase().includes(q))
      .slice(0, 8);

    this.locationSuggestions.set(matches);
    this.showSuggestions.set(matches.length > 0);
  }

  selectLocation(city: string): void {
    this.locationInput.set(city);
    this.locationValid.set(true);
    this.locationError.set('');
    this.showSuggestions.set(false);
  }

  onLocationBlur(): void {
    // Délai pour permettre le mousedown sur une suggestion
    setTimeout(() => {
      this.showSuggestions.set(false);
      // Si la valeur n'est pas encore validée, lancer la validation IA
      if (this.locationInput().trim() && !this.locationValid()) {
        this.validateFreeCity();
      }
    }, 200);
  }

  async validateFreeCity(): Promise<void> {
    const city = this.locationInput().trim();
    if (!city) return;

    // Si la ville est dans la liste locale, accepter directement
    const inList = WORLD_CITIES.some(c => c.toLowerCase() === city.toLowerCase());
    if (inList) {
      this.selectLocation(city);
      return;
    }

    this.locationValidating.set(true);
    this.locationError.set('');
    try {
      const result = await firstValueFrom(
        this.http.post<{ valid: boolean; normalizedName: string | null }>(
          `${environment.apiUrl}/posts/validate-city`,
          { city }
        )
      );
      if (result.valid && result.normalizedName) {
        this.locationInput.set(result.normalizedName);
        this.locationValid.set(true);
        this.locationError.set('');
      } else {
        this.locationValid.set(false);
        this.locationError.set(`"${city}" ne semble pas être une localité valide. Veuillez vérifier le nom ou choisir une ville dans la liste.`);
      }
    } catch {
      this.locationError.set('Impossible de valider la ville. Veuillez réessayer.');
    } finally {
      this.locationValidating.set(false);
    }
  }

  toggleLocationField(): void {
    if (this.showLocationField()) {
      this.showLocationField.set(false);
      this.locationInput.set('');
      this.locationValid.set(false);
      this.locationError.set('');
    } else {
      this.showLocationField.set(true);
    }
  }

  // ── Soumission ────────────────────────────────────────────────────────────
  async submit(): Promise<void> {
    if (!this.content().trim() && this.files().length === 0) {
      this.error.set('Écrivez quelque chose ou ajoutez un média.');
      return;
    }
    if (this.content().length > 2000) {
      this.error.set('Le texte ne peut pas dépasser 2000 caractères.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const formData = new FormData();
    if (this.content().trim()) formData.append('content', this.content().trim());
    const loc = this.locationInput().trim();
    if (loc && this.locationValid()) formData.append('location', loc);
    this.files().forEach(f => formData.append('media', f));

    this.feedSvc.createPost(formData).subscribe({
      next: (post) => {
        this.posted.emit(post);
        this.reset();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Erreur lors de la publication.');
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    this.content.set('');
    this.locationInput.set('');
    this.locationValid.set(false);
    this.locationError.set('');
    this.showLocationField.set(false);
    this.previews().forEach(p => URL.revokeObjectURL(p.url));
    this.files.set([]);
    this.previews.set([]);
    this.error.set('');
  }

  openFilePicker(): void {
    this.fileInputRef.nativeElement.click();
  }
}
