import { motion } from 'framer-motion';
import { Github, Trophy, Rocket } from 'lucide-react';
import { RESUME_DATA } from '../data/resume';

const gradients = [
  "from-pink-500 via-purple-500 to-indigo-500",
  "from-cyan-400 via-blue-500 to-purple-600",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-orange-400 via-red-500 to-pink-500"
];

const statusColors = {
  "In Progress": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Built": "bg-green-500/20 text-green-300 border-green-500/30",
  "Exploring": "bg-purple-500/20 text-purple-300 border-purple-500/30"
};

const getTechColor = (tech: string) => {
  const t = tech.toLowerCase();
  if (t.includes('react') || t.includes('next')) return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
  if (t.includes('python') || t.includes('ai') || t.includes('openai') || t.includes('diffusion') || t.includes('lora') || t.includes('vision')) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (t.includes('java') || t.includes('spring') || t.includes('kafka') || t.includes('redis')) return 'bg-orange-500/10 text-orange-300 border-orange-500/20';
  if (t.includes('node')) return 'bg-green-500/10 text-green-300 border-green-500/20';
  return 'bg-gray-500/10 text-gray-300 border-gray-500/20';
};

export default function Projects() {
  return (
    <section id="projects" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-3 mb-12"
        >
          <Rocket className="w-8 h-8 text-accent" />
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            What I Built Last Weekend
          </h2>
        </motion.div>

        {/* Mobile Horizontal Scroll / Desktop Grid */}
        <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-6 pb-8 md:pb-0 snap-x snap-mandatory hide-scrollbar">
          {RESUME_DATA.weekendProjects.map((project, index) => {
            const gradient = gradients[index % gradients.length];
            
            return (
              <motion.div
                key={project.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="snap-center shrink-0 w-[85vw] sm:w-[350px] md:w-auto relative group"
              >
                {/* Gradient Border Wrapper */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300 blur-[2px]`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl group-hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-shadow duration-300`} />
                
                {/* Card Content */}
                <div className="relative h-full bg-background/95 backdrop-blur-xl m-[1px] p-6 rounded-[15px] flex flex-col border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                      {project.award && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {project.award}
                        </span>
                      )}
                    </div>
                    <a 
                      href={`https://github.com/${RESUME_DATA.personal.github}`}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="text-white/50 hover:text-white transition-colors"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent transition-colors">
                    {project.name}
                  </h3>
                  
                  <p className="text-white/60 text-sm mb-6 flex-grow">
                    {project.desc}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {project.tech.map(tech => (
                      <span 
                        key={tech}
                        className={`text-[11px] px-2 py-1 rounded-md border ${getTechColor(tech)}`}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Hide scrollbar styles directly applied using a custom class or inline style if preferred */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </section>
  );
}
