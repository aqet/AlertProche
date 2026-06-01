import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageStorageService } from '../../core/services/image-storage.service';

@Component({
  selector: 'app-post-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img *ngIf="resolvedUrl()" [src]="resolvedUrl()" [alt]="alt" [class]="cssClass">
  `
})
export class PostImageComponent implements OnInit {
  @Input() src = '';
  @Input() alt = '';
  @Input() cssClass = '';

  resolvedUrl = signal('');

  constructor(private imageStorage: ImageStorageService) {}

  ngOnInit(): void {
    if (!this.src) return;
    this.imageStorage.resolveImageUrl(this.src).subscribe(url => {
      this.resolvedUrl.set(url);
    });
  }
}
