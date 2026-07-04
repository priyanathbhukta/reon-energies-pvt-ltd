export default function BrochurePartners({ isPrint }) {
  const partners = [
    {
      name: "UTL Solar",
      desc: "Advanced solar inverters, batteries, and complete solar power solutions.",
      color: "from-blue-500 to-indigo-600"
    },
    {
      name: "Loom Solar",
      desc: "Innovative high-efficiency solar panels and lithium battery technologies.",
      color: "from-emerald-500 to-green-600"
    },
    {
      name: "Tata Power Solar",
      desc: "One of India's most trusted solar energy companies delivering high-quality solar modules and EPC solutions.",
      color: "from-blue-600 to-blue-800"
    },
    {
      name: "Adani Solar",
      desc: "Integrated solar manufacturing and large-scale renewable energy solutions.",
      color: "from-orange-500 to-red-600"
    },
    {
      name: "Waaree Energies",
      desc: "India's leading solar panel manufacturer with high-performance PV modules.",
      color: "from-cyan-500 to-blue-500"
    },
    {
      name: "Eastman",
      desc: "Reliable energy storage systems, solar batteries, and power backup technologies.",
      color: "from-red-500 to-pink-600"
    }
  ];

  return (
    <div className={`relative bg-navy-900 text-white ${isPrint ? 'h-[297mm] pt-20' : 'py-24'}`}>
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80')] opacity-5 mix-blend-overlay"></div>
      <div className="container mx-auto px-6 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-emerald-400 font-semibold tracking-wider uppercase mb-2">Technology Partners</h2>
          <h3 className="text-3xl md:text-5xl font-display font-bold mb-6">
            Our Trusted Brand Partners
          </h3>
          <p className="text-gray-400 text-lg">
            We collaborate with industry leaders to bring you the highest quality, most reliable solar technology available in the market.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner, idx) => (
            <div 
              key={idx} 
              className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group"
            >
              <div className="h-20 mb-6 flex items-center justify-center bg-white rounded-xl overflow-hidden p-4">
                {/* Premium Text-Based Logo Placeholder since we don't have SVGs */}
                <span className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${partner.color} uppercase tracking-tighter`}>
                  {partner.name}
                </span>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">{partner.name}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                {partner.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
