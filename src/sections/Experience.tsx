import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { RESUME_DATA, type WorkExperience } from "../data/resume";
import { ChevronDown, ChevronUp, MapPin, Calendar } from "lucide-react";

const getCompanyInitialStyle = (companyName: string) => {
  if (companyName.toLowerCase().includes("dp world")) {
    return "bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_15px_rgba(168,85,247,0.4)]";
  }
  
  const colors = [
    "bg-gradient-to-br from-blue-500 to-cyan-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-rose-500 to-red-600",
    "bg-gradient-to-br from-amber-500 to-orange-600",
  ];
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const ExperienceCard = ({
  experience,
  index,
}: {
  experience: WorkExperience;
  index: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLeft = index % 2 === 0;
  const isDPWorld = experience.company.toLowerCase().includes("dp world");

  const cardVariants: Variants = {
    hidden: { opacity: 0, x: isLeft ? -50 : 50, y: 20 },
    visible: { 
      opacity: 1, 
      x: 0, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut", delay: 0.1 }
    }
  };

  return (
    <div className={`mb-12 flex flex-col md:flex-row justify-between items-center w-full ${isLeft ? 'md:flex-row-reverse' : ''}`}>
      {/* Space to push the card to the correct side on desktop */}
      <div className="hidden md:block w-5/12"></div>
      
      {/* Timeline Node */}
      <div className="z-20 flex items-center justify-center w-12 h-12 rounded-full absolute left-4 md:left-1/2 -translate-x-[24px] md:-translate-x-1/2 border-4 border-[#0a0a0a] shrink-0">
        <div className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold text-lg ${getCompanyInitialStyle(experience.company)}`}>
          {experience.company.charAt(0)}
        </div>
      </div>
      
      {/* Card Content */}
      <motion.div 
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className={`w-full md:w-5/12 pl-16 md:pl-0 mt-2 md:mt-0 ${isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12 text-left'}`}
      >
        <div className={`
          p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300
          ${isDPWorld 
            ? 'hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] border-purple-500/30' 
            : 'hover:border-accent/50 hover:shadow-[0_0_25px_rgba(56,189,248,0.1)]'}
        `}>
          <div className={`flex flex-col ${isLeft ? 'md:items-end' : 'md:items-start'}`}>
             <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{experience.role}</h3>
             <h4 className={`text-lg font-medium mb-4 ${isDPWorld ? 'text-purple-400' : 'text-accent'}`}>
               {experience.company}
             </h4>
             
             <div className={`flex flex-wrap gap-4 text-sm text-gray-400 mb-5 ${isLeft ? 'md:justify-end' : 'md:justify-start'}`}>
                <div className="flex items-center gap-1.5">
                  <Calendar size={15} className={isDPWorld ? 'text-purple-500/70' : 'text-accent/70'} />
                  <span>{experience.period}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={15} className={isDPWorld ? 'text-purple-500/70' : 'text-accent/70'} />
                  <span>{experience.location}</span>
                </div>
             </div>

             {/* Tech Stack initially visible as pills */}
             <div className={`flex flex-wrap gap-2 mb-5 ${isLeft ? 'md:justify-end' : 'md:justify-start'}`}>
               {experience.techStack.map((tech, i) => (
                 <span key={i} className={`px-3 py-1 text-xs font-medium rounded-full bg-white/5 border ${isDPWorld ? 'border-purple-500/20 text-purple-200' : 'border-white/10 text-gray-300'} hover:bg-white/10 transition-colors`}>
                   {tech}
                 </span>
               ))}
             </div>

             <button 
               onClick={() => setIsExpanded(!isExpanded)}
               className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDPWorld ? 'text-purple-400 hover:text-purple-300' : 'text-accent hover:text-accent/80'}`}
             >
               {isExpanded ? 'Hide Details' : 'View Details'}
               {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>

             <AnimatePresence>
               {isExpanded && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: "auto", opacity: 1, marginTop: "1.25rem" }}
                   exit={{ height: 0, opacity: 0, marginTop: 0 }}
                   className="overflow-hidden w-full"
                 >
                   <ul className={`text-gray-300 space-y-3 text-sm text-left ${isLeft ? 'md:text-right' : ''}`}>
                     {experience.bullets.map((bullet, i) => (
                       <li key={i} className={`relative pl-6 ${isLeft ? 'md:pl-0 md:pr-6' : ''} leading-relaxed`}>
                         {/* Mobile dot (left) */}
                         <span className={`absolute left-0 top-2 w-1.5 h-1.5 rounded-full ${isLeft ? 'md:hidden' : ''} ${isDPWorld ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-accent shadow-[0_0_8px_rgba(56,189,248,0.6)]'}`}></span>
                         
                         {/* Desktop dot (right) for left-aligned cards */}
                         {isLeft && (
                           <span className={`hidden md:block absolute right-0 top-2 w-1.5 h-1.5 rounded-full ${isDPWorld ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-accent shadow-[0_0_8px_rgba(56,189,248,0.6)]'}`}></span>
                         )}
                         
                         {bullet}
                       </li>
                     ))}
                   </ul>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function Experience() {
  return (
    <section id="experience" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Where I've <span className="text-accent">Worked</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            My professional journey so far.
          </p>
        </motion.div>

        <div className="relative wrap overflow-hidden p-0 h-full">
          {/* Vertical Timeline Line */}
          <div className="absolute border-opacity-20 border-white h-full border-l-2 left-10 md:left-1/2 md:-translate-x-1/2 top-0"></div>
          
          <div className="flex flex-col relative w-full pt-4">
            {RESUME_DATA.workExperience.map((exp, index) => (
              <ExperienceCard key={index} experience={exp} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
