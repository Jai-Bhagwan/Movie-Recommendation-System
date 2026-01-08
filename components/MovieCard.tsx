import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Movie } from '../types';
import { PlayIcon, InfoIcon, HeartIcon } from './Icons';

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelect, isFavorite = false, onToggleFavorite }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    // Priority: TMDB path > Absolute URL > Fallback
    if (movie.poster_path && movie.poster_path.startsWith('/')) {
        setImgSrc(`https://image.tmdb.org/t/p/w500${movie.poster_path}`);
    } else if (movie.poster_path && movie.poster_path.startsWith('http')) {
        setImgSrc(movie.poster_path);
    } else {
        setImgSrc(`https://picsum.photos/seed/${movie.id}/300/450`);
    }
  }, [movie]);

  const handleImageError = () => {
    // If TMDB path fails (hallucinated), fall back to generated image
    setImgSrc(`https://picsum.photos/seed/${movie.id}/300/450`);
  };

  return (
    <motion.div
      className="relative flex-shrink-0 w-[200px] h-[300px] rounded-md cursor-pointer transition-all duration-300 mx-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(movie)}
      layoutId={`movie-${movie.id}`}
    >
      <img
        src={imgSrc}
        alt={movie.title}
        onError={handleImageError}
        className="w-full h-full object-cover rounded-md"
        loading="lazy"
      />
      
      {/* AI Explainability Badge */}
      {movie.reason && (
        <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm shadow-lg border border-purple-400/30">
            AI Pick
        </div>
      )}

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1.1, zIndex: 10 }}
            exit={{ opacity: 0, scale: 0.9, zIndex: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 -top-10 -left-6 -right-6 -bottom-10 bg-zinc-900 rounded-lg shadow-2xl overflow-hidden z-20 flex flex-col"
            style={{ width: '140%', height: '140%' }} // Expanded card
          >
             <div className="relative h-1/2 w-full">
                <img
                    src={imgSrc}
                    alt={movie.title}
                    onError={handleImageError}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
             </div>
             
             <div className="p-4 flex flex-col justify-between h-1/2">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex gap-2">
                            <button className="bg-white text-black p-2 rounded-full hover:bg-gray-200">
                                <PlayIcon className="w-4 h-4 fill-black" />
                            </button>
                            <button 
                                className="border border-gray-400 text-white p-2 rounded-full hover:border-white hover:bg-gray-800/50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleFavorite?.(movie);
                                }}
                                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                            >
                                <HeartIcon className={`w-4 h-4 ${isFavorite ? "fill-red-600 text-red-600" : ""}`} filled={isFavorite} />
                            </button>
                            <button className="border border-gray-400 text-white p-2 rounded-full hover:border-white">
                                <InfoIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <span className="text-green-500 font-bold text-sm">{Math.round(movie.vote_average * 10)}% Match</span>
                    </div>
                    
                    <h3 className="text-white font-bold text-sm mb-1 line-clamp-1">{movie.title}</h3>
                    <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 mb-2">
                        {movie.genres?.slice(0, 3).map(g => (
                            <span key={g} className="border border-gray-700 px-1 rounded">{g}</span>
                        ))}
                    </div>
                </div>
                
                {movie.reason && (
                    <p className="text-[10px] text-purple-300 italic line-clamp-2">
                        "{movie.reason}"
                    </p>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MovieCard;