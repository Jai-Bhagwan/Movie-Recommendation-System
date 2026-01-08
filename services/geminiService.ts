import { GoogleGenAI, Type } from "@google/genai";
import { Movie } from "../types";

// Cache Configuration
const CACHE_PREFIX = 'movistore_cache_v1_';
const CACHE_TTL = 1000 * 60 * 60; // 1 Hour Cache

// Helper to access LocalStorage safely
const getCachedData = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;
    
    const { data, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data as T;
  } catch (e) {
    console.warn("Error reading from cache", e);
    return null;
  }
};

const setCachedData = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("Error writing to cache", e);
  }
};

// Helper to ensure we have a key
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key missing");
    throw new Error("API Key is missing. Please set it in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

// Schema for structured movie output
const movieSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.INTEGER },
      title: { type: Type.STRING },
      overview: { type: Type.STRING },
      release_date: { type: Type.STRING },
      vote_average: { type: Type.NUMBER },
      genres: { type: Type.ARRAY, items: { type: Type.STRING } },
      reason: { type: Type.STRING, description: "Why this movie fits the criteria" },
      poster_path: { type: Type.STRING, description: "The specific TMDB poster filename (e.g. /1E5baAaEse26fej7uHcjOgEE2t2.jpg)." },
      backdrop_path: { type: Type.STRING, description: "The specific TMDB backdrop filename (e.g. /2LL5lyC454CCXv05tf.jpg)." },
    },
    required: ["id", "title", "overview", "vote_average"],
  },
};

export const fetchTrendingMoviesAI = async (): Promise<Movie[]> => {
  const cacheKey = 'trending_movies';
  const cached = getCachedData<Movie[]>(cacheKey);
  if (cached) return cached;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a list of 10 currently trending or highly rated movies (mix of Action, Sci-Fi, Drama) released in the last 5 years. You MUST include valid TMDB poster_path and backdrop_path strings for each movie (e.g., starting with '/'). Provide JSON.",
      config: {
        responseMimeType: "application/json",
        responseSchema: movieSchema,
        systemInstruction: "You are a movie database API. Return accurate movie data including real TMDB image paths. Do not hallucinate paths; if unknown, leave empty.",
      },
    });

    const data = JSON.parse(response.text || "[]");
    setCachedData(cacheKey, data);
    return data as Movie[];
  } catch (error) {
    console.error("AI Fetch Error:", error);
    return [];
  }
};

export const fetchCategoryContent = async (category: string): Promise<Movie[]> => {
  const cacheKey = `category_${category}`;
  const cached = getCachedData<Movie[]>(cacheKey);
  if (cached) return cached;

  let prompt = "";
  switch (category) {
    case 'tv':
      prompt = "Generate a list of 10 trending TV Shows and Series from the last 3 years. Ensure they are TV shows, not movies.";
      break;
    case 'movies':
      prompt = "Generate a list of 10 highly acclaimed Movies from various genres (Action, Drama, Comedy) released recently.";
      break;
    case 'new':
      prompt = "Generate a list of 10 New & Popular releases (Movies or TV) that are currently creating buzz globally.";
      break;
    case 'web':
      prompt = "Generate a list of 10 popular Web Series (Netflix Originals, Amazon Prime Originals, etc.) that are trending.";
      break;
    default:
      prompt = "Generate a list of 10 trending movies.";
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${prompt} You MUST include valid TMDB poster_path and backdrop_path strings for each item.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: movieSchema,
        systemInstruction: "You are a movie and TV database API. Return accurate data including real TMDB image paths. Do not hallucinate paths.",
      },
    });

    const data = JSON.parse(response.text || "[]");
    setCachedData(cacheKey, data);
    return data as Movie[];
  } catch (error) {
    console.error("AI Category Fetch Error:", error);
    return [];
  }
};

export const searchMoviesAI = async (query: string): Promise<Movie[]> => {
  // We typically don't cache search heavily unless it's identical queries, 
  // but for speed, let's cache exact queries for a short time.
  const cacheKey = `search_${query.toLowerCase().trim()}`;
  const cached = getCachedData<Movie[]>(cacheKey);
  if (cached) return cached;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User Query: "${query}". Suggest 8 movies that match this query. It could be a mood, a genre, a specific actor, or a plot description. Include valid TMDB poster_path and backdrop_path strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: movieSchema,
        systemInstruction: "You are an intelligent movie recommendation engine. Understand nuance (e.g., 'sad movies' -> drama, 'mind bending' -> thriller). Include a 'reason' for the recommendation. Ensure image paths are accurate real TMDB paths.",
      },
    });

    const data = JSON.parse(response.text || "[]");
    setCachedData(cacheKey, data); // Searches cached same way
    return data as Movie[];
  } catch (error) {
    console.error("AI Search Error:", error);
    return [];
  }
};

export const chatWithMovieBot = async (history: { role: string, parts: { text: string }[] }[], newMessage: string) => {
    try {
        const ai = getAI();
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            history: history,
            config: {
                systemInstruction: "You are 'Movistore AI', a helpful movie enthusiast assistant. Keep answers short, witty, and engaging. If user asks for recommendations, list titles clearly.",
            }
        });

        const result = await chat.sendMessage({ message: newMessage });
        return result.text;
    } catch (e) {
        console.error(e);
        return "I'm having trouble connecting to the server. Try again later.";
    }
}