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
    <div className="min-h-screen bg-background text-white selection:bg-accent/30 selection:text-accent">
      <NavBar />
      <main>
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Skills />
        <Awards />
        <Contact />
      </main>
    </div>
  )
}

export default App
