import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const moderatorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  if (user && (user.role === 'Moderateur' || user.role === 'Admin')) return true;
  router.navigate(['/dashboard']);
  return false;
};
