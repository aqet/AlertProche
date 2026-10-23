// Post model
export type PostType = 'Disparition' | 'Abus' | 'Prevention' | 'Appel à l\'aide';

/**
 * Badge de confiance d'un compte.
 * Jamais de score brut affiché au public : uniquement un niveau discret.
 */
export type TrustBadge = 'none' | 'new' | 'confirmed' | 'reference';

export interface Post {
  _id: string;
  author_id: string;
  authorPseudo?: string;
  /** Badge de confiance de l'auteur (null si l'alerte est anonyme). */
  authorBadge?: TrustBadge;
  isAnonymous?: boolean;
  title: string;
  content: string;
  location: string;
  type: PostType;
  image_url?: string;
  isActive?: boolean;
  isResolved?: boolean;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  commentCount?: number;
  reportReasons?: any;

  /* ── Confiance communautaire ─────────────────────────────────── */
  /** Nombre de votes de confirmation. */
  trustVoteCount?: number;
  /** Nombre de votes venant de comptes « Confirmés » (credibility >= 30). */
  trustedVoteCount?: number;
  /** L'alerte a été cautionnée par la communauté. */
  communityConfirmed?: boolean;
  /** Le visiteur connecté a déjà confirmé cette alerte. */
  hasConfirmed?: boolean;
  /** Le visiteur connecté a déjà signalé cette alerte. */
  hasReported?: boolean;
  /** Nombre de signalements distincts. */
  reportCount?: number;
  /** L'alerte est en cours de vérification par la modération. */
  underReview?: boolean;
  /** Nombre de vues. */
  viewsCount?: number;
  /** L'alerte a été jugée fausse par la modération. */
  isFalseAlert?: boolean;
}

export interface CreatePostDto {
  title: string;
  content: string;
  location: string;
  type: PostType;
  isAnonymous?: boolean;
}

/** Réponse de l'endpoint de vote de confirmation. */
export interface ConfirmResponse {
  success: boolean;
  hasConfirmed: boolean;
  trustVoteCount: number;
  trustedVoteCount: number;
  communityConfirmed: boolean;
  viewsCount: number;
  reportCount: number;
  underReview: boolean;
}
