import { Component, signal, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
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
import { TrackingService } from '../../core/services/tracking.service';
import { AudioRecorderService, RecordingState } from '../../core/services/audio-recorder.service';
import { ParsedAudioAlertDto } from '../../core/models/parsed-audio-alert.dto';

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './post-form.component.html',
  styleUrls: ['./post-form.component.css'],
})
export class PostFormComponent implements OnInit, OnDestroy {
  IsScreenShort = false;
  ngOnInit() {
    this.tailler();
  }
  ngOnDestroy() {
    // Libère le micro si le composant est détruit pendant un enregistrement
    if (this.recordingState() === 'recording') {
      this.audioRecorder.cancelRecording();
    }
    if (this.recordingTimerRef) clearInterval(this.recordingTimerRef);
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

  // Rapport de notification push reçu après la création du post
  notifReport = signal<{ sent: number; failed: number; totalTokens: number; error: string | null } | null>(null);

  // Image state
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  dragOver = signal(false);
  imageError = signal('');
  analysisStatus = signal<'idle' | 'analyzing' | 'done'>('idle');

  // ── Audio recorder state ────────────────────────────────────────
  recordingState = signal<RecordingState>('idle');
  recordingError = signal('');
  recordingSeconds = signal(0);
  private recordingTimerRef: any = null;

  // ── Location autocomplete state ─────────────────────────────────
  locationInput = signal('');
  locationSuggestions = signal<string[]>([]);
  locationValidating = signal(false);
  locationError = signal('');
  locationValid = signal(false);
  showSuggestions = signal(false);

  readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
  readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

  postTypes: PostType[] = [
    'Disparition',
    'Abus',
    'Prevention',
    "Appel à l'aide",
  ];

  postTypeDescriptions: Record<string, string> = {
    Disparition: 'Personne disparue - enfant, adulte, personne âgée',
    Abus: 'Maltraitance, exploitation, violence sur mineur ou personne vulnérable',
    Prevention: 'Sensibilisation, guide, information utile à la communauté',
    "Appel à l'aide":
      "Personne à l'hôpital sans famille identifiée, personne en détresse, famille introuvable",
  };

  camerounCities = [
    'National',
    'abong mbang',
    'aiyomojok',
    'akom ii',
    'akono',
    'akonolinga',
    'ambam',
    'ayos',
    'baba i',
    'bafang',
    'bafanji',
    'bafia',
    'bafou',
    'bafoussam',
    'bafut',
    'baham',
    'balikumbat',
    'bambalang',
    'bamenda',
    'bamendjou',
    'bamessi',
    'bamessing',
    'bamukumbit',
    'bamumkumbit',
    'bangangté',
    'bangolan',
    'barnaké',
    'batcha',
    'batouri',
    'bertoua',
    'bibémi',
    'biwong',
    'bogo',
    'bokito',
    'buea',
    'bélabo',
    'diang',
    'douala',
    'dschang',
    'edéa',
    'eséka',
    'figuil',
    'foumban',
    'foumbot',
    'garoua',
    'garoua boulaï',
    'guider',
    'kaelé',
    'kalfou',
    'kekem',
    'kontcha',
    'kousséri',
    'kribi',
    'kumba',
    'kumbo',
    'lagdo',
    'limbe',
    'loum',
    'maga',
    'mamfe',
    'manjo',
    'maroua',
    'mbalmayo',
    'mbandjok',
    'mbanga',
    'mbouda',
    'melong',
    'messaména',
    'meïganga',
    'mfou',
    'mokolo',
    'monatélé',
    'mora',
    'nanga eboko',
    'ndom',
    'ngaoundal',
    'ngaoundéré',
    'ngok mapoubi',
    'ngou',
    'ngoulemakong',
    'nguti',
    'nkongsamba',
    'nkoteng',
    'obala',
    'olamzé',
    'pitoa',
    'sangmélima',
    'tefam',
    'tibati',
    'tiko',
    'touboro',
    'widekum',
    'wum',
    'yagoua',
    'yaoundé',
    'yokadouma',
    'yoko',
    'ébolowa',
  ];

  // [
  //   'Yaoundé',
  //   'Douala',
  //   'Bamenda',
  //   'Bafoussam',
  //   'Garoua',
  //   'Maroua',
  //   'Ngaoundéré',
  //   'Bertoua',
  //   'Ebolowa',
  //   'Kribi',
  //   'Limbe',
  //   'Kumba',
  //   'Edéa',
  //   'Loum',
  //   'Nkongsamba',
  //   'National',
  // ];

  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private router: Router,
    private tracking: TrackingService,
    public audioRecorder: AudioRecorderService,
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
    this.analysisStatus.set('analyzing');
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const airesponse = await this.postService.analyzeImage(file);
      this.form.patchValue({
        publicationType: airesponse.completion.publicationType,
        title: airesponse.completion.alertTitle,
        content: airesponse.completion.detailedDescription,
        location: airesponse.completion.cityName,
        type: airesponse.completion.publicationType,
      });
      this.analysisStatus.set('done');
    } catch (error) {
      console.error('Erreur pendant l’analyse IA de l’image :', error);
      this.analysisStatus.set('idle');
    }
  }

  removeImage() {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.imageError.set('');
    this.analysisStatus.set('idle');
  }

  getFileSizeLabel(): string {
    const size = this.selectedFile()?.size || 0;
    return size > 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)} Mo`
      : `${Math.round(size / 1024)} Ko`;
  }

  // ── Méthodes localisation ───────────────────────────────────────

  onLocationInput(value: string): void {
    this.locationInput.set(value);
    this.locationError.set('');
    this.locationValid.set(false);
    this.form.get('location')?.setValue(''); // invalide jusqu'à sélection/validation

    const q = value.trim().toLowerCase();
    if (q.length < 2) {
      this.locationSuggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }

    const matches = this.camerounCities
      .filter(c => c.toLowerCase().includes(q))
      .slice(0, 8);

    this.locationSuggestions.set(matches);
    this.showSuggestions.set(matches.length > 0);
  }

  selectLocationSuggestion(city: string): void {
    this.locationInput.set(city);
    this.form.get('location')?.setValue(city);
    this.locationValid.set(true);
    this.locationError.set('');
    this.showSuggestions.set(false);
  }

  hideSuggestions(): void {
    // Délai pour permettre le click sur une suggestion
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  async validateFreeCity(): Promise<void> {
    const city = this.locationInput().trim();
    if (!city) return;

    // Si la ville est déjà dans la liste, accepter directement
    const inList = this.camerounCities.some(c => c.toLowerCase() === city.toLowerCase());
    if (inList) {
      this.selectLocationSuggestion(city.toLowerCase());
      return;
    }

    this.locationValidating.set(true);
    this.locationError.set('');
    try {
      const result = await this.postService.validateCity(city);
      if (result.valid && result.normalizedName) {
        this.locationInput.set(result.normalizedName);
        this.form.get('location')?.setValue(result.normalizedName.toLowerCase());
        this.locationValid.set(true);
        this.locationError.set('');
      } else {
        this.locationValid.set(false);
        this.locationError.set(`"${city}" ne semble pas être une localité du Cameroun. Veuillez vérifier ou choisir une ville dans la liste.`);
        this.form.get('location')?.setValue('');
      }
    } catch {
      this.locationError.set('Impossible de valider la ville. Veuillez réessayer.');
    } finally {
      this.locationValidating.set(false);
    }
  }

  // ── Méthodes enregistrement vocal ──────────────────────────────

  get recordingLabel(): string {
    const s = this.recordingSeconds();
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  async startVoiceRecording(): Promise<void> {
    this.recordingError.set('');
    try {
      await this.audioRecorder.startRecording();
      this.recordingState.set('recording');
      this.recordingSeconds.set(0);
      this.recordingTimerRef = setInterval(() => {
        this.recordingSeconds.update(s => s + 1);
        // Sécurité : limite à 2 minutes
        if (this.recordingSeconds() >= 120) this.stopVoiceRecording();
      }, 1000);
    } catch (err: any) {
      this.recordingError.set(err?.message || 'Impossible d\'accéder au microphone.');
      this.recordingState.set('idle');
    }
  }

  async stopVoiceRecording(): Promise<void> {
    if (this.recordingTimerRef) {
      clearInterval(this.recordingTimerRef);
      this.recordingTimerRef = null;
    }
    this.recordingState.set('processing');
    this.recordingError.set('');

    try {
      const audioBlob = await this.audioRecorder.stopRecording();
      const parsed: ParsedAudioAlertDto = await this.postService.parseAudio(audioBlob);
      this.applyAudioResult(parsed);
    } catch (err: any) {
      this.recordingError.set(err?.message || 'Erreur lors de l\'analyse vocale. Veuillez réessayer.');
    } finally {
      this.recordingState.set('idle');
    }
  }

  async cancelVoiceRecording(): Promise<void> {
    if (this.recordingTimerRef) {
      clearInterval(this.recordingTimerRef);
      this.recordingTimerRef = null;
    }
    await this.audioRecorder.cancelRecording();
    this.recordingState.set('idle');
    this.recordingError.set('');
  }

  private applyAudioResult(parsed: ParsedAudioAlertDto): void {
    const patch: any = {};
    if (parsed.type)    patch['type']    = parsed.type;
    if (parsed.title)   patch['title']   = parsed.title;
    if (parsed.content) patch['content'] = parsed.content;
    if (parsed.isAnonymous !== null && parsed.isAnonymous !== undefined) {
      patch['isAnonymous'] = parsed.isAnonymous;
    }
    if (Object.keys(patch).length > 0) this.form.patchValue(patch);

    // Localisation : pré-remplir le champ texte et tenter la sélection
    if (parsed.location) {
      const loc = parsed.location.toLowerCase();
      this.locationInput.set(loc);
      const inList = this.camerounCities.some(c => c.toLowerCase() === loc);
      if (inList) {
        this.form.get('location')?.setValue(loc);
        this.locationValid.set(true);
      } else {
        // Lancer la validation IA en arrière-plan
        this.validateFreeCity();
      }
    }
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
            this.loading.set(false);
            this.error.set(post.reasoning);
          } else {
            this.loading.set(false);
            this.success.set(true);
            // Stocker le rapport de notification si présent
            if (post.notificationReport) {
              this.notifReport.set(post.notificationReport);
            }
            this.tracking.trackEvent('post_created');
            // Rediriger après 2s pour laisser le temps de voir le rapport
            setTimeout(() => this.router.navigate(['/posts', post._id]), 2000);
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
