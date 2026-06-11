import { Component, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PostService } from '../../core/services/post.service';
import { PostType } from '../../core/models/post.model';

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './post-form.component.html',
  styleUrls: ['./post-form.component.css'],
})
export class PostFormComponent implements OnInit {
  IsScreenShort = false;
  ngOnInit() {
    this.tailler();
  }
  @HostListener('window:resize', [])
  tailler() {
    window.innerWidth > 900
      ? (this.IsScreenShort = false)
      : (this.IsScreenShort = true);
  }
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  success = signal(false);

  // Image state
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  dragOver = signal(false);
  imageError = signal('');

  readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
  readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

  postTypes: PostType[] = [
    'Disparition',
    'Abus',
    'Prevention',
    "Appel à l'aide",
  ];

  postTypeDescriptions: Record<string, string> = {
    Disparition: 'Personne disparue — enfant, adulte, personne âgée',
    Abus: 'Maltraitance, exploitation, violence sur mineur ou personne vulnérable',
    Prevention: 'Sensibilisation, guide, information utile à la communauté',
    "Appel à l'aide":
      "Personne à l'hôpital sans famille identifiée, personne en détresse, famille introuvable",
  };

  camerounCities = [
    'Yaoundé',
    'Douala',
    'Bamenda',
    'Bafoussam',
    'Garoua',
    'Maroua',
    'Ngaoundéré',
    'Bertoua',
    'Ebolowa',
    'Kribi',
    'Limbe',
    'Kumba',
    'Edéa',
    'Loum',
    'Nkongsamba',
    'National',
  ];

  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(150),
        ],
      ],
      content: ['', [Validators.required, Validators.minLength(30)]],
      type: ['Disparition', Validators.required],
      location: ['', Validators.required],
      isAnonymous: [false],
    });
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(true);
  }
  onDragLeave() {
    this.dragOver.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  async processFile(file: File) {
    this.imageError.set('');
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      this.imageError.set(
        'Format non supporté. Utilisez JPG ou PNG uniquement.',
      );
      return;
    }
    if (file.size > this.MAX_SIZE) {
      this.imageError.set(
        "L'image dépasse 5 Mo. Veuillez choisir une image plus légère.",
      );
      return;
    }
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
    const airesponse = await this.postService.analyzeImage(file);
    this.form.patchValue({
      publicationType: airesponse.completion.publicationType,
      title: airesponse.completion.alertTitle,
      content: airesponse.completion.detailedDescription,
      location: airesponse.completion.cityName,
      type: airesponse.completion.publicationType,
    });
  }

  removeImage() {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.imageError.set('');
  }

  getFileSizeLabel(): string {
    const size = this.selectedFile()?.size || 0;
    return size > 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)} Mo`
      : `${Math.round(size / 1024)} Ko`;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.postService
      .createPost(this.form.value, this.selectedFile() || undefined)
      .subscribe({
        next: (post: any) => {
          if (post.decision == 'BAN' && post.confidence >= 0.9) {
            this.error.set(post.reasoning);
          } else {
            this.loading.set(false);
            this.success.set(true);
            this.router.navigate(['/posts', post._id]);
          }
        },
        error: (err) => {
          this.loading.set(false);
          console.log(err);

          this.error.set(
            err ||
              'Une erreur est survenue. Vérifiez votre texte et réessayez.',
          );
        },
      });
  }

  hasError(field: string, error?: string): boolean {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.touched) return false;
    return error ? ctrl.hasError(error) : ctrl.invalid;
  }
}
