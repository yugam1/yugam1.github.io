import { motion } from "framer-motion";
import { RESUME_DATA } from "../data/resume";
import {
  Activity,
  Bot,
  Brain,
  Cloud,
  Code,
  Database,
  FlaskConical,
  Layout,
  Network,
  Server,
  Terminal,
  Users,
  Workflow,
} from "lucide-react";
import SectionHeading from "../components/SectionHeading";

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Languages":
      return <Code className="w-5 h-5 text-blue-400" />;
    case "Backend":
      return <Server className="w-5 h-5 text-green-400" />;
    case "Frontend":
      return <Layout className="w-5 h-5 text-cyan-400" />;
    case "Databases & Search":
      return <Database className="w-5 h-5 text-amber-400" />;
    case "Messaging & Workflow":
      return <Workflow className="w-5 h-5 text-pink-400" />;
    case "Cloud & DevOps":
      return <Cloud className="w-5 h-5 text-purple-400" />;
    case "Observability & Quality":
      return <Activity className="w-5 h-5 text-emerald-400" />;
    case "AI / LLM":
      return <Brain className="w-5 h-5 text-orange-400" />;
    case "Agentic AI":
      return <Bot className="w-5 h-5 text-indigo-400" />;
    case "Architecture":
      return <Network className="w-5 h-5 text-sky-400" />;
    case "Data Science & NLP":
      return <FlaskConical className="w-5 h-5 text-rose-400" />;
    case "Ways of Working":
      return <Users className="w-5 h-5 text-teal-400" />;
    default:
      return <Terminal className="w-5 h-5 text-gray-400" />;
  }
};

export default function Skills() {
  return (
    <section id="skills" className="py-20 relative z-10">
      <div className="container mx-auto px-4 md:px-8">
        <SectionHeading title="Technical Arsenal" subtitle="Skills & Technologies" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {RESUME_DATA.skills.map((category, idx) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: (idx % 3) * 0.1, duration: 0.5 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-white/10 rounded-lg">
                  {getCategoryIcon(category.category)}
                </div>
                <h3 className="text-lg font-semibold text-white">{category.category}</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {category.items.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 text-sm rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
