import { MapPin, Building, Droplets, Zap } from 'lucide-react';

export default function BrochureProjects({ isPrint }) {
  const clients = [
    {
      name: "SM HOOGHLY BEVERAGES",
      desc: "Delivering sustainable and energy-efficient renewable solutions for large-scale beverage manufacturing.",
      icon: Building,
      img: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&q=80&w=800"
    },
    {
      name: "NATIONAL WATER PROCESSING",
      desc: "High-capacity industrial rooftop installation ensuring consistent clean energy for water processing facilities.",
      icon: Droplets,
      img: "https://images.unsplash.com/photo-1584061445763-99b8ce2798e2?auto=format&fit=crop&q=80&w=800"
    }
  ];

  return (
    <div className={`relative bg-gray-50 ${isPrint ? 'h-[297mm] pt-20' : 'py-24'}`}>
      <div className="container mx-auto px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-emerald-600 font-semibold tracking-wider uppercase mb-2">Showcase</h2>
          <h3 className="text-3xl md:text-5xl font-display font-bold text-navy-900 mb-6">
            Projects & Trusted Customers
          </h3>
          <p className="text-gray-600 text-lg">
            Empowering businesses across sectors with robust, scalable, and efficient solar power installations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {clients.map((client, idx) => (
            <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 group">
              <div className="relative h-64 overflow-hidden">
                <div className="absolute inset-0 bg-navy-900/40 group-hover:bg-navy-900/20 transition-all z-10"></div>
                <img 
                  src={client.img} 
                  alt={client.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                  <client.icon className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-navy-900">Industrial Project</span>
                </div>
              </div>
              <div className="p-8">
                <h4 className="text-2xl font-bold text-navy-900 mb-4">{client.name}</h4>
                <p className="text-gray-600 mb-6 line-clamp-2">{client.desc}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Zap className="w-4 h-4 text-emerald-500" /> Energy Cost Optimization
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 text-emerald-500" /> West Bengal, India
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
