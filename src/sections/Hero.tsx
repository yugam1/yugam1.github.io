import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Github, Linkedin, Mail, ChevronDown } from 'lucide-react';
import { Link } from 'react-scroll';
import { RESUME_DATA } from '../data/resume';

const subtitles = [
  "SDE2 @ DP World",
  "IIT KGP Alumnus",
  "AI Weekend Builder",
  "Hackathon Winner"
];

export default function Hero() {
  const [currentSubtitle, setCurrentSubtitle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubtitle((prev) => (prev + 1) % subtitles.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const nameLetters = Array.from(RESUME_DATA.personal.name);

  // Animation variants
  const containerVars: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const letterVars: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <section id="hero" className="bg-mesh-container relative min-h-screen flex items-center justify-center pt-20">
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        
        {/* Typewriter Name */}
        <motion.h1 
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6"
          variants={containerVars}
          initial="hidden"
          animate="visible"
        >
          {nameLetters.map((char, index) => (
            <motion.span key={index} variants={letterVars} className="inline-block">
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.h1>

        {/* Cycling Subtitle */}
        <div className="h-8 md:h-12 mb-6 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentSubtitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-2xl md:text-3xl font-light text-gray-300"
            >
              {subtitles[currentSubtitle]}
            </motion.h2>
          </AnimatePresence>
        </div>

        {/* One-liner */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
        >
          {RESUME_DATA.tagline}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="flex items-center justify-center space-x-6"
        >
          <a href={`https://github.com/${RESUME_DATA.personal.github}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors group">
            <Github className="w-6 h-6 text-gray-300 group-hover:text-white" />
          </a>
          <a href={`https://linkedin.com/${RESUME_DATA.personal.linkedin}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors group">
            <Linkedin className="w-6 h-6 text-gray-300 group-hover:text-white" />
          </a>
          <a href={`mailto:${RESUME_DATA.personal.email}`} className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors group">
            <Mail className="w-6 h-6 text-gray-300 group-hover:text-white" />
          </a>
        </motion.div>

      </div>

      {/* Bouncing Chevron */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
      >
        <Link to="about" smooth={true} duration={500} className="cursor-pointer">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronDown className="w-8 h-8 text-gray-500 hover:text-white transition-colors" />
          </motion.div>
        </Link>
      </motion.div>
    </section>
  );
}
