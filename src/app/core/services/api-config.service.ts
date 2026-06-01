import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  readonly baseUrl = environment.apiUrl;
  readonly authUrl = `${this.baseUrl}/auth`;
  readonly postsUrl = `${this.baseUrl}/posts`;
  readonly commentsUrl = `${this.baseUrl}/comments`;
}
