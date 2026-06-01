// User model
export interface User {
  _id: string;
  email: string;
  pseudo: string;
  role: 'Standard' | 'Moderateur' | 'Admin';
  createdAt?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  pseudo: string;
}
