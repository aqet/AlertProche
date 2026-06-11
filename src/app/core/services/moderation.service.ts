import { Injectable } from '@angular/core';

export interface ModerationResult {
  isClean: boolean;
  reason?: string;
  flaggedWord?: string;
}

@Injectable({ providedIn: 'root' })
export class ModerationService {

  // Dictionnaire lexical — termes interdits (insultes, haine, violence)
  private readonly BANNED_WORDS = [
    // Insultes françaises
    'idiot', 'imbécile', 'connard', 'salaud', 'ordure', 'bâtard', 'putain',
    'merde', 'enculé', 'fils de pute', 'va te faire', 'nègre', 'bamboula',
    'macaque', 'singe', 'sauvage', 'sous-homme',
    // Incitations à la violence
    'tuer', 'assassiner', 'lyncher', 'brûler vif', 'égorger', 'massacrer',
    'exterminer', 'éliminer', 'descendre', 'flinguer',
    // Termes haineux contextuels
    'justice populaire', 'faites lui la peau', 'règlement de compte',
    // Insultes en langues locales courantes
    'abruti', 'crétin'
  ];

  // Regex anti-doxxing — numéros de téléphone camerounais et identifiants
  // private readonly PHONE_PATTERNS = [
  //   /\b(6[5-9]\d{7})\b/g,           // Mobile Cameroun (65x à 69x, 8 chiffres)
  //   /\b(2[23]\d{7})\b/g,             // Fixe Cameroun
  //   /\b(\+237\s?\d{8,9})\b/g,        // Format international +237
  //   /\b(00237\s?\d{8,9})\b/g,        // Format 00237
  //   /\b(\d{3}[\s\-\.]\d{3}[\s\-\.]\d{3,4})\b/g, // Format xxx-xxx-xxxx
  // ];

  private readonly ID_PATTERNS = [
    /\b([A-Z]{1,3}\d{6,10}[A-Z]?)\b/g,  // CNI camerounaise
    /\b(passport[e]?\s*:?\s*[A-Z0-9]{6,12})\b/gi, // Passeport
    /\b(cni\s*:?\s*[A-Z0-9]{6,15})\b/gi,           // CNI explicite
  ];

  checkText(text: string): ModerationResult {
    if (!text || text.trim().length === 0) {
      return { isClean: true };
    }

    const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Filtre lexical
    for (const word of this.BANNED_WORDS) {
      const normalizedWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normalizedWord)) {
        return {
          isClean: false,
          reason: 'lexical',
          flaggedWord: word
        };
      }
    }

    // // 2. Filtre anti-doxxing — téléphones
    // for (const pattern of this.PHONE_PATTERNS) {
    //   pattern.lastIndex = 0;
    //   if (pattern.test(text)) {
    //     return {
    //       isClean: false,
    //       reason: 'phone',
    //       flaggedWord: 'numéro de téléphone'
    //     };
    //   }
    // }

    // 3. Filtre anti-doxxing — identifiants officiels
    for (const pattern of this.ID_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        return {
          isClean: false,
          reason: 'id',
          flaggedWord: 'identifiant officiel'
        };
      }
    }

    return { isClean: true };
  }

  getModerationMessage(text: string): string {
    
    const result: ModerationResult = this.checkText(text) 


    if (result.isClean) return '';
    switch (result.reason) {
      case 'lexical':
        return `Votre texte contient un terme non autorisé ("${result.flaggedWord}"). Veuillez reformuler votre message en restant respectueux.`;
      case 'phone':
        return 'Votre texte contient un numéro de téléphone. Pour protéger la vie privée, les coordonnées personnelles ne sont pas autorisées. Reformulez sans inclure de numéro.';
      case 'id':
        return 'Votre texte contient un identifiant officiel (CNI, passeport). Pour protéger la vie privée, ces informations ne sont pas autorisées.';
      default:
        return 'Votre texte contient du contenu non autorisé. Veuillez le reformuler.';
    }
  }
}
