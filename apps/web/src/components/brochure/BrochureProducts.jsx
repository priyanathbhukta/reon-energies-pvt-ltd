import { Package, Battery, Cpu, Layers, Link, Zap, Settings2 } from 'lucide-react';

const products = [
  { icon: Package, title: "Solar Panels", desc: "Monocrystalline, Polycrystalline & TOPCon high-efficiency modules." },
  { icon: Cpu, title: "Solar Inverters", desc: "String, Central & Micro inverters for optimal power conversion." },
  { icon: Battery, title: "Lithium Battery Storage Systems", desc: "High-density LiFePO4 batteries for reliable energy storage." },
  { icon: Zap, title: "Hybrid Systems", desc: "Integrated inverter & battery systems for seamless backup." },
  { icon: Layers, title: "Solar Accessories", desc: "Premium cables, connectors, and electrical components." },
  { icon: Settings2, title: "ACDB/DCDB Systems", desc: "High-quality distribution boxes for system protection." },
  { icon: Link, title: "Structure & Mounting Solutions", desc: "Galvanized iron and aluminum mounting structures." },
];

export default function BrochureProducts({ isPrint }) {
  return (
    <div className={`relative bg-white ${isPrint ? 'h-[297mm] pt-20' : 'py-24'}`}>
      <div className="container mx-auto px-6">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-16">
          <div className="max-w-2xl">
            <h2 className="text-emerald-600 font-semibold tracking-wider uppercase mb-2">Products & Distribution</h2>
            <h3 className="text-3xl md:text-5xl font-display font-bold text-navy-900 mb-6">
              Premium Solar Components
            </h3>
            <p className="text-gray-600 text-lg">
              We are authorized distributors and solution providers for premium solar panels, inverters, lithium battery systems, and renewable energy products.
            </p>
          </div>
          <div className="mt-6 md:mt-0">
            <div className="bg-navy-50 px-6 py-3 rounded-full border border-navy-100 font-semibold text-navy-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-500" /> Authorized Distributors
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, idx) => (
            <div 
              key={idx} 
              className="group flex gap-6 p-6 rounded-2xl border border-gray-100 bg-white hover:bg-navy-900 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <product.icon className="w-6 h-6 text-emerald-600 group-hover:text-emerald-400" />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold text-navy-900 mb-2 group-hover:text-white transition-colors">{product.title}</h4>
                <p className="text-gray-600 group-hover:text-gray-300 transition-colors leading-relaxed">
                  {product.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
