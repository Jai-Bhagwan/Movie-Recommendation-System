import React, { useState, useEffect } from 'react';
import { PlayIcon, InfoIcon } from './Icons';
import { Movie } from '../types';

interface HeroProps {
  movie: Movie | null;
  onPlay?: () => void;
}

const Hero: React.FC<HeroProps> = ({ movie, onPlay }) => {
  const [bgSrc, setBgSrc] = useState<string>('');

  useEffect(() => {
    if (movie) {
        if (movie.backdrop_path && movie.backdrop_path.startsWith('/')) {
            setBgSrc(`https://image.tmdb.org/t/p/original${movie.backdrop_path}`);
        } else if (movie.backdrop_path && movie.backdrop_path.startsWith('http')) {
            setBgSrc(movie.backdrop_path);
        } else {
            setBgSrc(`https://picsum.photos/seed/${movie.id + 'backdrop'}/1920/1080`);
        }
    }
  }, [movie]);

  if (!movie) return (
      <div className="w-full h-[80vh] bg-zinc-900 animate-pulse flex items-center justify-center">
        <span className="text-zinc-700">Loading Featured Movie...</span>
      </div>
  );

  return (
    <div className="relative w-full h-[85vh]">
      {/* Background Image - optimized for LCP */}
      <div className="absolute inset-0">
        <img 
            src={bgSrc} 
            className="w-full h-full object-cover"
            alt="Hero Background"
            onError={() => setBgSrc(`https://picsum.photos/seed/${movie.id + 'backdrop'}/1920/1080`)}
            loading="eager"
            // @ts-ignore
            fetchpriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-16 w-full md:w-1/2 pt-20">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg leading-tight">
          {movie.title}
        </h1>
        
        <div className="flex items-center space-x-4 mb-6 text-sm md:text-base font-medium text-gray-300">
            <span className="text-green-400 font-bold">98% Match</span>
            <span>{movie.release_date.split('-')[0]}</span>
            <span className="border border-gray-500 px-1 text-xs">4K Ultra HD</span>
        </div>

        <p className="text-gray-200 text-sm md:text-lg mb-8 line-clamp-3 drop-shadow-md max-w-xl">
          {movie.overview}
        </p>

        <div className="flex space-x-4">
          <button 
            onClick={onPlay}
            className="bg-white text-black px-6 py-3 rounded flex items-center gap-2 hover:bg-opacity-80 transition font-bold text-lg"
          >
            <PlayIcon className="fill-black" />
            Play
          </button>
          <button className="bg-gray-500/50 text-white px-6 py-3 rounded flex items-center gap-2 hover:bg-gray-500/70 transition font-bold text-lg backdrop-blur-sm">
            <InfoIcon />
            More Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;