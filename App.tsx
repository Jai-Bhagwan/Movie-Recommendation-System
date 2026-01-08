import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, BellIcon, BotIcon, MicIcon } from './components/Icons';
import Hero from './components/Hero';
import MovieCard from './components/MovieCard';
import { fetchTrendingMoviesAI, fetchCategoryContent, searchMoviesAI, chatWithMovieBot } from './services/geminiService';
import { Movie, ChatMessage, User } from './types';

type Category = 'home' | 'tv' | 'movies' | 'new' | 'web';

function App() {
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [categoryContent, setCategoryContent] = useState<Movie[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category>('home');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true); // Default to true for initial load
  
  // User Authentication & Data State
  const [user, setUser] = useState<User | null>(null);
  const [watchHistory, setWatchHistory] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  
  // UI View States
  const [showFavorites, setShowFavorites] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');

  // Voice Search State
  const [isListening, setIsListening] = useState(false);
  
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hi! I am the MOVISTORE AI. Ask me for recommendations or tell me your mood!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial Load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingContent(true);
      const movies = await fetchTrendingMoviesAI();
      if (movies.length > 0) {
        setCategoryContent(movies);
        setFeaturedMovie(movies[0]);
      }
      setIsLoadingContent(false);
    };
    loadInitialData();

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Category Navigation Logic
  const handleCategoryChange = async (category: Category) => {
    setCurrentCategory(category);
    setShowFavorites(false);
    setShowProfileModal(false);
    setSearchResults([]);
    setSearchQuery('');
    
    setIsLoadingContent(true);
    
    let movies: Movie[] = [];
    if (category === 'home') {
        movies = await fetchTrendingMoviesAI();
    } else {
        movies = await fetchCategoryContent(category);
    }

    if (movies.length > 0) {
        setCategoryContent(movies);
        setFeaturedMovie(movies[0]);
    }
    setIsLoadingContent(false);
  };

  // Favorites Logic
  const toggleFavorite = (movie: Movie) => {
    setFavorites(prev => {
        if (prev.some(m => m.id === movie.id)) {
            return prev.filter(m => m.id !== movie.id);
        }
        return [...prev, movie];
    });
  };

  const isFavorite = (movieId: number) => favorites.some(m => m.id === movieId);

  // Watch History Logic
  const handlePlayMovie = () => {
    if (featuredMovie) {
        setWatchHistory(prev => {
            // Remove if already exists to move to top
            const filtered = prev.filter(m => m.id !== featuredMovie.id);
            return [featuredMovie, ...filtered];
        });
        alert(`Now Playing: ${featuredMovie.title}`);
    }
  };

  // Auth Logic
  const handleLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (loginName && loginEmail) {
          const newUser: User = {
              id: Date.now().toString(),
              name: loginName,
              email: loginEmail,
              favorites: [],
              history: [],
              preferences: []
          };
          setUser(newUser);
          setShowLoginModal(false);
          setLoginName('');
          setLoginEmail('');
          setShowProfileModal(true); // Open profile immediately after login as per implied flow
      }
  };

  const handleLogout = () => {
      setUser(null);
      setShowProfileModal(false);
      setShowFavorites(false);
      setWatchHistory([]);
  };

  const handleUserIconClick = () => {
      if (user) {
          setShowProfileModal(true);
      } else {
          setShowLoginModal(true);
      }
  };

  // Search Logic
  const handleSearch = async (e: React.FormEvent, overrideQuery?: string) => {
    e.preventDefault();
    const query = overrideQuery || searchQuery;
    if (!query.trim()) return;
    
    setIsSearching(true);
    setShowFavorites(false);
    setShowProfileModal(false);
    // We don't change category state here, just show search overlay
    const results = await searchMoviesAI(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  // Voice Search Logic
  const handleVoiceSearch = () => {
    if (isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
    };

    recognition.onspeechend = () => {
      recognition.stop();
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  // Chat Logic
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setIsThinking(true);

    const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const responseText = await chatWithMovieBot(history, newMsg.text);
    
    setIsThinking(false);
    setChatMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'model', text: responseText }]);
  };

  // Helper to get category title
  const getCategoryTitle = () => {
      switch(currentCategory) {
          case 'tv': return "Trending TV Shows";
          case 'movies': return "Top Movies";
          case 'new': return "New & Popular Releases";
          case 'web': return "Popular Web Series";
          default: return "Trending Now";
      }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans selection:bg-red-600 selection:text-white">
      
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/70 to-transparent'}`}>
        <div className="px-4 md:px-16 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-red-600 text-2xl md:text-3xl font-bold tracking-tighter cursor-pointer" onClick={() => handleCategoryChange('home')}>MOVISTORE</h1>
            <ul className="hidden xl:flex gap-4 text-sm font-medium text-gray-300">
              <li className={`hover:text-white cursor-pointer transition ${currentCategory === 'home' ? 'font-bold text-white' : ''}`} onClick={() => handleCategoryChange('home')}>Home</li>
              <li className={`hover:text-white cursor-pointer transition ${currentCategory === 'tv' ? 'font-bold text-white' : ''}`} onClick={() => handleCategoryChange('tv')}>TV Shows</li>
              <li className={`hover:text-white cursor-pointer transition ${currentCategory === 'movies' ? 'font-bold text-white' : ''}`} onClick={() => handleCategoryChange('movies')}>Movies</li>
              <li className={`hover:text-white cursor-pointer transition ${currentCategory === 'new' ? 'font-bold text-white' : ''}`} onClick={() => handleCategoryChange('new')}>New & Popular</li>
              <li className={`hover:text-white cursor-pointer transition ${currentCategory === 'web' ? 'font-bold text-white' : ''}`} onClick={() => handleCategoryChange('web')}>Web Series</li>
              <li className={`cursor-pointer transition ${showFavorites ? 'text-white font-bold' : 'hover:text-white'}`} onClick={() => { setShowFavorites(true); setSearchResults([]); setShowProfileModal(false); }}>My List</li>
            </ul>
          </div>

          <div className="flex items-center gap-6">
            <form onSubmit={handleSearch} className="relative hidden sm:block">
               <input 
                 type="text" 
                 placeholder="Mood, Genre, or Title..."
                 className="bg-black/50 border border-gray-600 rounded-full py-1 px-4 pl-10 pr-10 text-sm focus:outline-none focus:border-white transition-all w-64 focus:w-80"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
               <SearchIcon className="absolute left-3 top-1.5 w-4 h-4 text-gray-400" />
               <button
                 type="button"
                 onClick={handleVoiceSearch}
                 className={`absolute right-3 top-1.5 transition-all ${isListening ? 'text-red-500 scale-110 animate-pulse' : 'text-gray-400 hover:text-white'}`}
                 title="Voice Search"
               >
                 <MicIcon className="w-4 h-4" />
               </button>
            </form>
            <BellIcon className="w-5 h-5 cursor-pointer hover:text-gray-300" />
            
            {/* User Icon */}
            <div 
                className="w-8 h-8 rounded-md bg-red-600 cursor-pointer flex items-center justify-center font-bold hover:bg-red-700 transition"
                onClick={handleUserIconClick}
                title={user ? user.name : "Login"}
            >
                {user ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation (Simple overflow) */}
        <div className="xl:hidden flex gap-4 px-4 pb-2 overflow-x-auto text-sm text-gray-300 font-medium hide-scrollbar bg-[#141414] md:bg-transparent">
             <span className={`flex-shrink-0 cursor-pointer ${currentCategory === 'home' ? 'text-white' : ''}`} onClick={() => handleCategoryChange('home')}>Home</span>
             <span className={`flex-shrink-0 cursor-pointer ${currentCategory === 'tv' ? 'text-white' : ''}`} onClick={() => handleCategoryChange('tv')}>TV Shows</span>
             <span className={`flex-shrink-0 cursor-pointer ${currentCategory === 'movies' ? 'text-white' : ''}`} onClick={() => handleCategoryChange('movies')}>Movies</span>
             <span className={`flex-shrink-0 cursor-pointer ${currentCategory === 'new' ? 'text-white' : ''}`} onClick={() => handleCategoryChange('new')}>New & Popular</span>
             <span className={`flex-shrink-0 cursor-pointer ${currentCategory === 'web' ? 'text-white' : ''}`} onClick={() => handleCategoryChange('web')}>Web Series</span>
             <span className={`flex-shrink-0 cursor-pointer ${showFavorites ? 'text-white' : ''}`} onClick={() => { setShowFavorites(true); setSearchResults([]); }}>My List</span>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Profile Modal Overlay */}
        <AnimatePresence>
            {showProfileModal && user && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 overflow-y-auto"
                >
                    <div className="bg-[#181818] w-full max-w-4xl rounded-xl shadow-2xl border border-zinc-800 p-8 relative">
                        <button 
                            onClick={() => setShowProfileModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        
                        <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                            <div className="w-32 h-32 bg-red-600 rounded-md flex items-center justify-center text-6xl font-bold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-4xl font-bold mb-2">{user.name}</h2>
                                <p className="text-gray-400 mb-6">{user.email}</p>
                                <div className="flex gap-4">
                                    <button onClick={() => { setShowFavorites(true); setShowProfileModal(false); }} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded text-sm font-bold">
                                        My List ({favorites.length})
                                    </button>
                                    <button onClick={handleLogout} className="border border-gray-600 hover:border-white px-4 py-2 rounded text-sm font-bold">
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Watching History</h3>
                            {watchHistory.length === 0 ? (
                                <p className="text-gray-500 italic">You haven't watched any movies yet. Go click Play!</p>
                            ) : (
                                <div className="flex overflow-x-auto hide-scrollbar pb-4 -ml-2">
                                     <div className="flex">
                                        {watchHistory.map(movie => (
                                            <div key={movie.id + '-history'} className="relative group mx-2 w-[150px]">
                                                <img 
                                                    src={movie.poster_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : movie.poster_path || ''} 
                                                    alt={movie.title}
                                                    className="w-full h-[225px] object-cover rounded-md opacity-75 hover:opacity-100 transition"
                                                />
                                                <p className="text-xs mt-2 text-gray-400 truncate">{movie.title}</p>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Login Modal Overlay */}
        <AnimatePresence>
            {showLoginModal && !user && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-[#181818] w-full max-w-md p-12 rounded-lg shadow-2xl relative"
                    >
                         <button 
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <h2 className="text-3xl font-bold mb-8">Sign In</h2>
                        <form onSubmit={handleLoginSubmit} className="space-y-6">
                            <div>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Name"
                                    className="w-full bg-[#333] rounded px-4 py-3 focus:outline-none focus:bg-[#454545] text-white placeholder-gray-500"
                                    value={loginName}
                                    onChange={(e) => setLoginName(e.target.value)}
                                />
                            </div>
                            <div>
                                <input 
                                    type="email" 
                                    required
                                    placeholder="Email or phone number"
                                    className="w-full bg-[#333] rounded px-4 py-3 focus:outline-none focus:bg-[#454545] text-white placeholder-gray-500"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded mt-4 transition"
                            >
                                Sign In
                            </button>
                            <div className="flex justify-between text-sm text-gray-400 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="accent-gray-500" />
                                    Remember me
                                </label>
                                <span className="hover:underline cursor-pointer">Need help?</span>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {searchResults.length > 0 ? (
           <div className="pt-24 px-4 md:px-16 min-h-screen">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold">Search Results for "{searchQuery}"</h2>
                   <button 
                    onClick={() => handleCategoryChange('home')}
                    className="text-gray-400 hover:text-white text-sm"
                   >
                    Clear Search
                   </button>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                   {searchResults.map(movie => (
                       <div key={movie.id} className="relative group">
                            <MovieCard 
                                movie={movie} 
                                onSelect={(m) => setFeaturedMovie(m)} 
                                isFavorite={isFavorite(movie.id)}
                                onToggleFavorite={toggleFavorite}
                            />
                       </div>
                   ))}
               </div>
           </div>
        ) : showFavorites ? (
            <div className="pt-24 px-4 md:px-16 min-h-screen">
               <h2 className="text-2xl font-bold mb-6">My List</h2>
               {favorites.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                       <p>Your list is empty.</p>
                       <button onClick={() => handleCategoryChange('home')} className="mt-4 text-white hover:underline">Browse Movies</button>
                   </div>
               ) : (
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                       {favorites.map(movie => (
                           <div key={movie.id} className="relative group">
                                <MovieCard 
                                    movie={movie} 
                                    onSelect={(m) => setFeaturedMovie(m)} 
                                    isFavorite={true}
                                    onToggleFavorite={toggleFavorite}
                                />
                           </div>
                       ))}
                   </div>
               )}
           </div>
        ) : (
            <>
                <Hero movie={featuredMovie} onPlay={handlePlayMovie} />
                
                <div className="relative z-10 -mt-32 pb-20 space-y-12">
                    
                    {/* Main Category Row */}
                    <div className="pl-4 md:pl-16">
                        <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">
                            {isLoadingContent ? 'Loading...' : getCategoryTitle()}
                        </h2>
                        {isLoadingContent ? (
                             <div className="flex overflow-x-hidden pb-10">
                                {[1,2,3,4,5].map(i => (
                                    <div key={i} className="w-[200px] h-[300px] bg-zinc-800 rounded-md mx-2 flex-shrink-0 animate-pulse"></div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex overflow-x-scroll hide-scrollbar pb-10 -ml-2">
                                <div className="flex">
                                    {categoryContent.map(movie => (
                                        <MovieCard 
                                            key={movie.id} 
                                            movie={movie} 
                                            onSelect={(m) => setFeaturedMovie(m)} 
                                            isFavorite={isFavorite(movie.id)}
                                            onToggleFavorite={toggleFavorite}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Secondary Row (Static for now, but contextual) */}
                    <div className="pl-4 md:pl-16 opacity-50 pointer-events-none grayscale">
                        <h2 className="text-xl md:text-2xl font-semibold mb-4 text-white">Watch It Again</h2>
                        <div className="flex overflow-x-hidden pb-10">
                            {/* Placeholders */}
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className="w-[200px] h-[300px] bg-zinc-800 rounded-md mx-2 flex-shrink-0 animate-pulse"></div>
                            ))}
                        </div>
                    </div>

                </div>
            </>
        )}
      </main>

      {/* Chat Bot Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110"
        >
            <BotIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Chat Bot Interface */}
      <AnimatePresence>
        {isChatOpen && (
            <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-24 right-6 w-96 h-[500px] bg-[#1a1a1a] border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden z-50"
            >
                <div className="bg-zinc-800 p-4 border-b border-zinc-700 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        MOVISTORE Assistant
                    </h3>
                    <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-gray-200'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                             <div className="bg-zinc-700 p-3 rounded-lg text-xs text-gray-400 animate-pulse">
                                 Thinking...
                             </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="p-4 bg-zinc-800 border-t border-zinc-700 flex gap-2">
                    <input 
                        className="flex-1 bg-black border border-zinc-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                        placeholder="Ask for a movie..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button type="submit" className="bg-white text-black p-2 rounded-md hover:bg-gray-200">
                        <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                    </button>
                </form>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default App;