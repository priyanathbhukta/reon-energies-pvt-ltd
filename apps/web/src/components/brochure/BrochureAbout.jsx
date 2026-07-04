import { Target, Leaf, ShieldCheck, Cpu } from 'lucide-react';

export default function BrochureAbout({ isPrint }) {
  return (
    <div className={`relative bg-white ${isPrint ? 'h-[297mm] pt-20' : 'py-24'}`}>
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className={`${isPrint ? '' : 'animate-fade-in'}`}>
            <h2 className="text-emerald-600 font-semibold tracking-wider uppercase mb-2">Company Overview</h2>
            <h3 className="text-4xl md:text-5xl font-display font-bold text-navy-900 mb-8 leading-tight">
              Leading the Transition to <span className="text-emerald-500">Green Energy</span>
            </h3>
            
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              <strong>REON ENERGIES PRIVATE LIMITED</strong> is a fast-growing renewable energy and solar EPC company dedicated to delivering innovative, sustainable, and cost-effective solar energy solutions across India.
            </p>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              We specialize in solar panel distribution, solar power plant installation, battery energy storage systems, inverters, and complete end-to-end EPC services for residential, commercial, industrial, and institutional projects.
            </p>

            <div className="bg-navy-50 p-8 rounded-2xl border-l-4 border-emerald-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Target className="w-32 h-32 text-emerald-500" />
              </div>
              <h4 className="text-xl font-bold text-navy-900 mb-3 flex items-center gap-2">
                <Target className="w-6 h-6 text-emerald-500" /> Our Mission
              </h4>
              <p className="text-gray-700 italic relative z-10">
                "To accelerate India's transition toward green energy by providing reliable, high-performance, and affordable solar solutions backed by trusted technology partners."
              </p>
            </div>
          </div>

          <div className={`relative ${isPrint ? '' : 'animate-fade-up'}`}>
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-solar-400 rounded-3xl transform rotate-3 opacity-20 blur-lg"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1592833159155-c62df1b65634?auto=format&fit=crop&q=80&w=1000" 
                alt="Industrial Solar Installation" 
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent flex items-end p-8">
                <div className="text-white">
                  <div className="flex gap-4 mb-4">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                      <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                      <Cpu className="w-6 h-6 text-solar-400" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                      <Leaf className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <p className="font-semibold text-lg">Engineered for Maximum Efficiency</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
