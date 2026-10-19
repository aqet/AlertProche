import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-post-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img *ngIf="src" [src]="src" [alt]="alt" [class]="cssClass">
  `
})
export class PostImageComponent {
  @Input() src = '';
  @Input() alt = '';
  @Input() cssClass = '';
}
