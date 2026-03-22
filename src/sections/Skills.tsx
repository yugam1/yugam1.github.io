import { motion } from "framer-motion";
import { RESUME_DATA } from "../data/resume";
import { Code, Server, Cloud, Brain, Terminal } from "lucide-react";
import SectionHeading from "../components/SectionHeading";

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Frontend":
      return <Code className="w-6 h-6 text-blue-400" />;
    case "Backend":
      return <Server className="w-6 h-6 text-green-400" />;
    case "DevOps & Cloud":
      return <Cloud className="w-6 h-6 text-purple-400" />;
    case "AI & Data":
      return <Brain className="w-6 h-6 text-orange-400" />;
    default:
      return <Terminal className="w-6 h-6 text-gray-400" />;
  }
};

export default function Skills() {
  return (
    <section id="skills" className="py-20 relative z-10">
      <div className="container mx-auto px-4 md:px-8">
        <SectionHeading title="Technical Arsenal" subtitle="Skills & Technologies" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {RESUME_DATA.skills.map((category, idx) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white/10 rounded-lg">
                  {getCategoryIcon(category.category)}
                </div>
                <h3 className="text-xl font-semibold text-white">{category.category}</h3>
              </div>

              <div className="space-y-5">
                {category.items.map((skill, skillIdx) => (
                  <div key={skill.name}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">{skill.name}</span>
                      <span className="text-sm font-medium text-gray-400">{skill.proficiency}/10</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.proficiency * 10}%` }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1, delay: 0.2 + skillIdx * 0.1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
