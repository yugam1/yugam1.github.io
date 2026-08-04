import { motion } from 'framer-motion';
import { Mail, Github, Linkedin, MapPin, ArrowUpRight } from 'lucide-react';
import { RESUME_DATA } from '../data/resume';

const { email, github, linkedin, location } = RESUME_DATA.personal;

const channels = [
  {
    label: 'Email',
    value: email,
    href: `mailto:${email}`,
    Icon: Mail,
    accent: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-300',
  },
  {
    label: 'LinkedIn',
    value: `linkedin.com/${linkedin}`,
    href: `https://linkedin.com/${linkedin}`,
    Icon: Linkedin,
    accent: 'from-sky-500/20 to-blue-500/20 border-sky-500/30 text-sky-300',
  },
  {
    label: 'GitHub',
    value: `github.com/${github}`,
    href: `https://github.com/${github}`,
    Icon: Github,
    accent: 'from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30 text-fuchsia-300',
  },
];

export default function Contact() {
  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Let&apos;s <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Connect</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4">
            Got an idea, a role, or just want to talk shop about AI side-projects? My inbox is always open.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-14">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
        </motion.div>

        {/* Channel cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-14"
        >
          {channels.map(({ label, value, href, Icon, accent }) => (
            <motion.a
              key={label}
              href={href}
              target={label === 'Email' ? undefined : '_blank'}
              rel="noopener noreferrer"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
              }}
              whileHover={{ y: -6 }}
              className="group relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
              <div className={`p-4 rounded-xl bg-gradient-to-br border ${accent}`}>
                <Icon className="w-7 h-7" />
              </div>
              <div className="text-sm font-semibold text-white uppercase tracking-wider">{label}</div>
              <div className="text-xs text-gray-400 break-all">{value}</div>
            </motion.a>
          ))}
        </motion.div>

        {/* Primary CTA */}
        <motion.a
          href={`mailto:${email}`}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_8px_30px_rgba(99,102,241,0.4)] hover:shadow-[0_8px_40px_rgba(99,102,241,0.6)] transition-shadow"
        >
          <Mail className="w-5 h-5" />
          Say Hello
        </motion.a>
      </div>
    </section>
  );
}
