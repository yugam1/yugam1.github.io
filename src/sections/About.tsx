import { motion, useInView, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

const AnimatedNumber = ({ value }: { value: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView && ref.current) {
      const controls = animate(0, value, {
        duration: 2,
        ease: "easeOut",
        onUpdate: (latest) => {
          if (ref.current) {
            ref.current.textContent = Math.floor(latest).toString();
          }
        }
      });
      return () => controls.stop();
    }
  }, [isInView, value]);

  return <span ref={ref}>0</span>;
};

const StatCard = ({ label, prefix = "", value, suffix = "", textValue }: { label: string, prefix?: string, value?: number, suffix?: string, textValue?: string }) => {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
      }}
      className="flex flex-col items-center justify-center p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:bg-white/10 hover:border-white/20 transition-all duration-300 group hover:-translate-y-2"
    >
      <div className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-purple-400 mb-3 group-hover:scale-110 transition-transform duration-300">
        {textValue ? (
            textValue
        ) : (
          <div className="flex items-center justify-center">
            {prefix}
            <AnimatedNumber value={value ?? 0} />
            {suffix}
          </div>
        )}
      </div>
      <div className="text-sm md:text-base text-gray-400 font-medium text-center uppercase tracking-wider">{label}</div>
    </motion.div>
  );
};

export default function About() {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Me</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left Column: Stat Cards */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.15
                }
              }
            }}
            className="grid grid-cols-2 gap-4 md:gap-6"
          >
            <StatCard value={6} suffix="+" label="Years Exp" />
            <StatCard textValue="IIT KGP" label="Alumnus" />
            <StatCard value={15} suffix="+" label="Members Led" />
            <StatCard value={52} prefix="1st / " label="Teams Beaten" />
          </motion.div>

          {/* Right Column: Bio & Passion */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8 text-gray-300 text-lg leading-relaxed"
          >
            <p>
              I am a Software Development Engineer with a strong foundation in building scalable backend architectures and dynamic user interfaces. Over the last 6+ years, I've had the privilege of leading cross-functional teams and architecting robust solutions that serve millions of users. My journey started at IIT Kharagpur, fueling a lifelong passion for complex problem-solving.
            </p>
            <p>
              Currently at <span className="text-white font-medium">DP World</span>, I focus on optimizing core microservices and driving significant performance improvements. Whether it's crafting an elegant React frontend or deploying resilient Spring Boot services, I thrive in environments where technology meets real-world impact.
            </p>
            
            {/* Passion Statement */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="mt-10 p-8 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 backdrop-blur-sm relative overflow-hidden group shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 ease-in-out" />
              <div className="relative z-10">
                <h3 className="text-2xl font-semibold text-white mb-3 flex items-center gap-3">
                  <span className="text-3xl">🚀</span> Building the Future
                </h3>
                <p className="text-indigo-100/80 leading-relaxed">
                  <span className="font-semibold text-white">I build something new every weekend using AI.</span> From vision-powered digital wardrobes to voice-based logistics platforms, I constantly push the boundaries of large language models to create functional, delightful products.
                </p>
              </div>
            </motion.div>
            
          </motion.div>

        </div>
      </div>
    </section>
  );
}
