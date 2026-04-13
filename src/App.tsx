import NavBar from './components/NavBar'
import Hero from './sections/Hero'
import About from './sections/About'
import Projects from './sections/Projects'
import Experience from './sections/Experience'
import Skills from './sections/Skills'
import Awards from './sections/Awards'
import Contact from './sections/Contact'

function App() {
  return (
    <div className="min-h-screen bg-background text-white selection:bg-accent/30 selection:text-accent flex flex-col">
      <NavBar />
      <main className="flex-grow">
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Skills />
        <Awards />
        <Contact />
      </main>
      <footer className="text-center py-10 px-5 text-gray-400 text-[13px] border-t border-white/5 relative z-10">
        made with <span className="text-[#ff4d94]">♥</span><br />
        <small className="opacity-60 text-[11px] mt-1 inline-block">&copy; 2026 yugam1.github.io &middot; all rights reserved</small>
      </footer>
    </div>
  )
}

export default App
