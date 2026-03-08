import { motion } from "framer-motion";
import { RESUME_DATA } from "../data/resume";
import { Trophy, Medal, Star, Shield } from "lucide-react";
import SectionHeading from "../components/SectionHeading";

const icons = [Trophy, Medal, Star, Shield];

export default function Awards() {
  return (
    <section id="awards" className="py-20 relative z-10">
      <div className="container mx-auto px-4 md:px-8">
        <SectionHeading title="Recognitions" subtitle="Awards & Achievements" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {RESUME_DATA.awards.map((award, idx) => {
            const Icon = icons[idx % icons.length];
            return (
              <motion.div
                key={award.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                className="group relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors duration-300"
              >
                {/* Shimmer effect inside the card */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none" />
                
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-xl border border-yellow-500/30 flex-shrink-0">
                    <Icon className="w-8 h-8 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors">{award.name}</h3>
                    <p className="text-gray-400 text-sm">{award.context}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
