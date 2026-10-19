import { Component, signal, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PostService } from '../../core/services/post.service';
import { PostType } from '../../core/models/post.model';
import { TrackingService } from '../../core/services/tracking.service';
import { AudioRecorderService, RecordingState } from '../../core/services/audio-recorder.service';
import { ParsedAudioAlertDto } from '../../core/models/parsed-audio-alert.dto';
import { OfflineService } from '../../core/services/offline.service';

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
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
  offlineQueued = signal(false);

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

  private translateSvc = inject(TranslateService);

  getTypeDescription(type: string): string {
    const keyMap: Record<string, string> = {
      'Disparition':    'POST.TYPE_DESC_DISPARITION',
      'Abus':           'POST.TYPE_DESC_ABUS',
      'Prevention':     'POST.TYPE_DESC_PREVENTION',
      "Appel à l'aide": 'POST.TYPE_DESC_APPEL',
    };
    const key = keyMap[type];
    return key ? this.translateSvc.instant(key) : '';
  }

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
    private offlineService: OfflineService,
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
        this.translateSvc.instant('POST.IMAGE_FORMAT'),
      );
      return;
    }
    if (file.size > this.MAX_SIZE) {
      this.imageError.set(
        this.translateSvc.instant('POST.IMAGE_SIZE'),
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

      // Synchroniser le signal locationInput qui pilote l'input affiché
      if (airesponse.completion.cityName) {
        const city = airesponse.completion.cityName;
        this.locationInput.set(city);
        // Vérifier si la ville est dans la liste locale
        const inList = this.camerounCities.some(
          c => c.toLowerCase() === city.toLowerCase()
        );
        if (inList) {
          this.form.get('location')?.setValue(city.toLowerCase());
          this.locationValid.set(true);
        } else {
          // Lancer la validation IA en arrière-plan
          this.validateFreeCity();
        }
      }
      // console.log(this.form);
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
        this.locationError.set(this.translateSvc.instant('POST.LOCATION_INVALID', { city }));
        this.form.get('location')?.setValue('');
      }
    } catch {
      this.locationError.set(this.translateSvc.instant('POST.LOCATION_VALIDATE_ERR'));
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
      this.recordingError.set(err?.message || this.translateSvc.instant('AUDIO.MIC_ACCESS_ERROR'));
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
      this.recordingError.set(err?.message || this.translateSvc.instant('POST.VOICE_ERR'));
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

    // Mode hors-ligne : mettre le post (image comprise) en file d'attente
    if (!this.offlineService.online()) {
      this.enqueueOffline();
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

          // Perte de connexion en cours d'envoi : basculer en file d'attente
          if (err?.status === 0) {
            this.enqueueOffline();
            return;
          }

          this.error.set(
            err?.error?.message ||
              err?.message ||
              this.translateSvc.instant('POST.ERR_SUBMIT'),
          );
        },
      });
  }

  /** Met le post en file d'attente hors-ligne (image stockée en IndexedDB) */
  private enqueueOffline(): void {
    const v = this.form.value;
    this.offlineService
      .queueCasePost({
        title: v.title,
        content: v.content,
        location: v.location,
        type: v.type,
        isAnonymous: v.isAnonymous ?? false,
        image: this.selectedFile() ?? undefined,
        createdAt: new Date().toISOString(),
      })
      .then(() => {
        this.offlineQueued.set(true);
        this.error.set('');
        setTimeout(() => this.router.navigate(['/']), 2500);
      })
      .catch(() => {
        this.error.set(this.translateSvc.instant('OFFLINE.STORAGE_ERROR'));
      });
  }

  hasError(field: string, error?: string): boolean {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.touched) return false;
    return error ? ctrl.hasError(error) : ctrl.invalid;
  }
}
