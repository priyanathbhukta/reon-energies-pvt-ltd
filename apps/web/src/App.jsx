import { Routes, Route } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ROICalculator from './components/ROICalculator'
import Services from './components/Services'
import About from './components/About'
import Products from './components/Products'
import Schemes from './components/Schemes'
import Testimonials from './components/Testimonials'
import Contact from './components/Contact'
import Footer from './components/Footer'

function PublicSite() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <ROICalculator />
        <About />
        <Products />
        <Schemes />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<PublicSite />} />
      </Routes>
      <SpeedInsights />
    </>
  )
}

export default App

