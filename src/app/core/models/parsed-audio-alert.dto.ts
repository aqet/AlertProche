/**
 * Interface partagée — résultat de l'analyse audio par Gemini.
 * Miroir exact du ParsedAudioAlertDto côté backend.
 */
export interface ParsedAudioAlertDto {
  type: 'Disparition' | 'Abus' | 'Prevention' | "Appel à l'aide" | null;
  title: string | null;
  content: string | null;
  location: string | null;
  isAnonymous: boolean | null;
}
