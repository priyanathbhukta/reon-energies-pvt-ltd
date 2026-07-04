import { 
  Home, Factory, Building2, BatteryCharging, 
  SunMedium, Activity, Settings, Zap, 
  Wrench, Car, Plug, Shield
} from 'lucide-react';

const services = [
  { icon: Home, title: "Residential Solar Installation", desc: "Turnkey rooftop solutions for homes with high ROI." },
  { icon: Building2, title: "Commercial Solar Solutions", desc: "Reduce operational costs with high-efficiency systems." },
  { icon: Factory, title: "Industrial Solar Projects", desc: "MW level power plants for manufacturing units." },
  { icon: Settings, title: "Solar EPC Services", desc: "End-to-end engineering, procurement, and construction." },
  { icon: BatteryCharging, title: "Battery Energy Storage", desc: "Advanced lithium-ion storage solutions for 24/7 power." },
  { icon: Activity, title: "Hybrid Solar Systems", desc: "Combining grid reliability with battery backup." },
  { icon: Zap, title: "On-Grid & Off-Grid Systems", desc: "Flexible solutions tailored to location power availability." },
  { icon: Car, title: "EV Charging Infrastructure", desc: "Future-ready EV charging stations powered by solar." },
  { icon: Plug, title: "Net Metering Support", desc: "Seamless grid integration and approval assistance." },
  { icon: Wrench, title: "Solar Maintenance & AMC", desc: "Comprehensive after-sales service and monitoring." },
];

export default function BrochureServices({ isPrint }) {
  return (
    <div className={`relative bg-gray-50 ${isPrint ? 'h-[297mm] pt-20' : 'py-24'}`}>
      <div className="container mx-auto px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-emerald-600 font-semibold tracking-wider uppercase mb-2">Our Services</h2>
          <h3 className="text-3xl md:text-5xl font-display font-bold text-navy-900 mb-6">
            Comprehensive Energy Solutions
          </h3>
          <p className="text-gray-600 text-lg">
            We provide a complete spectrum of solar and renewable energy services, tailored to meet the exact requirements of every sector.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {services.map((service, idx) => (
            <div 
              key={idx} 
              className="bg-white p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-gray-100 group"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 transition-colors duration-300">
                <service.icon className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h4 className="font-bold text-navy-900 mb-3 text-lg leading-snug">{service.title}</h4>
              <p className="text-sm text-gray-500">{service.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
