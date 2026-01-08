export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null; // URL or null
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids?: number[];
  genres?: string[];
  reason?: string; // AI Explanation
}

export interface User {
  id: string;
  name: string;
  email: string;
  favorites: Movie[];
  history: Movie[];
  preferences: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  movies?: Movie[]; // If the bot recommends movies in a chat bubble
}

export type FetchState = 'idle' | 'loading' | 'success' | 'error';

export interface SectionProps {
  title: string;
  movies: Movie[];
}
