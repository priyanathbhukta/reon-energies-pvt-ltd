import { Download, Zap, Sun, Factory, Home } from 'lucide-react';

export default function BrochureHero({ isPrint }) {
  return (
    <div className={`relative ${isPrint ? 'h-[297mm] pt-20' : 'min-h-screen pt-32 pb-20'} flex items-center bg-navy-900 overflow-hidden`}>
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=2000" 
          alt="Solar Plant" 
          className="w-full h-full object-cover opacity-30 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/90 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-navy-900 to-transparent"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className={`max-w-4xl ${isPrint ? '' : 'animate-fade-up'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-8">
            <Zap className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-wider uppercase">Future of Clean Energy</span>
          </div>
          
          <h1 className={`${isPrint ? 'text-5xl' : 'text-5xl md:text-7xl'} font-display font-bold text-white leading-tight mb-6`}>
            Powering India with <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-solar-400">
              Smart Renewable Energy
            </span> Solutions
          </h1>
          
          <p className={`${isPrint ? 'text-xl' : 'text-xl md:text-2xl'} text-gray-300 font-light max-w-3xl leading-relaxed mb-10`}>
            Trusted Solar EPC Partner for Residential, Commercial & Industrial Projects
          </p>

          {!isPrint && (
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => {
                  const element = document.getElementById('downloadable-brochure');
                  if (element) {
                     // We will handle the download logic in the parent component, but emit an event or call a prop
                     // For now, this is just visual, actual logic passed from parent is better.
                     document.dispatchEvent(new CustomEvent('downloadBrochure'));
                  }
                }}
                className="group flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-emerald hover:-translate-y-1"
              >
                <Download className="w-5 h-5 group-hover:animate-bounce" />
                Download Company Brochure
              </button>
            </div>
          )}

          {/* Key Pillars */}
          <div className={`grid grid-cols-3 gap-6 ${isPrint ? 'mt-20' : 'mt-24'}`}>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
              <Home className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-white font-semibold text-lg">Residential</h3>
              <p className="text-gray-400 text-sm mt-2">Smart rooftop solar solutions for homes.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
              <Factory className="w-8 h-8 text-solar-400 mb-4" />
              <h3 className="text-white font-semibold text-lg">Commercial</h3>
              <p className="text-gray-400 text-sm mt-2">High-efficiency systems for businesses.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
              <Sun className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-white font-semibold text-lg">Industrial</h3>
              <p className="text-gray-400 text-sm mt-2">Large-scale MW level solar power plants.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
