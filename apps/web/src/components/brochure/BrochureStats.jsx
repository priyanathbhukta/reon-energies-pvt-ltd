import { Zap, Users, ShieldCheck, CheckSquare, Leaf } from 'lucide-react';

export default function BrochureStats({ isPrint }) {
  const stats = [
    { number: "10+", label: "MW Solar Capacity Installed", icon: Zap },
    { number: "500+", label: "Happy Customers", icon: Users },
    { number: "15+", label: "Partner Brands", icon: ShieldCheck },
    { number: "800+", label: "Projects Completed", icon: CheckSquare },
    { number: "5K+", label: "Tons CO₂ Reduced", icon: Leaf },
  ];

  return (
    <div className={`relative bg-emerald-600 text-white ${isPrint ? 'py-16' : 'py-24'}`}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-emerald-100 font-semibold tracking-wider uppercase mb-2">Our Impact</h2>
          <h3 className="text-3xl md:text-5xl font-display font-bold">
            Driving the Future of Power
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 text-center">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <stat.icon className="w-8 h-8 text-white" />
              </div>
              <div className="text-4xl font-bold font-display mb-2">{stat.number}</div>
              <div className="text-emerald-100 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className={`mt-24 text-center max-w-4xl mx-auto bg-navy-900/40 p-10 rounded-3xl backdrop-blur-md ${isPrint ? 'hidden' : 'block'}`}>
           <h3 className="text-2xl font-bold mb-4">Vision & Mission</h3>
           <p className="text-emerald-50 mb-6 italic">
             "To become one of India's most trusted clean energy companies driving the future of smart power generation."
           </p>
           <p className="text-emerald-50 italic">
             "To make renewable energy affordable, accessible, and sustainable for every home and business."
           </p>
        </div>
      </div>
    </div>
  );
}
