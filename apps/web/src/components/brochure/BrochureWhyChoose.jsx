import { CheckCircle2 } from 'lucide-react';

export default function BrochureWhyChoose({ isPrint }) {
  const reasons = [
    "Trusted Renewable Energy Partner",
    "High ROI Solar Solutions",
    "Premium Technology Brands",
    "Experienced Installation Team",
    "End-to-End EPC Support",
    "Smart Energy Management",
    "Government Subsidy Assistance",
    "Net Metering Support",
    "Low Maintenance Systems",
    "Sustainable & Green Future"
  ];

  return (
    <div className={`relative bg-navy-900 text-white overflow-hidden ${isPrint ? 'h-[297mm] pt-20' : 'py-24'}`}>
      <div className="absolute top-0 right-0 -mr-48 -mt-48 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-96 h-96 rounded-full bg-solar-500/20 blur-3xl"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-emerald-400 font-semibold tracking-wider uppercase mb-2">Why Choose REON</h2>
          <h3 className="text-3xl md:text-5xl font-display font-bold mb-6">
            The Smart Choice for Solar
          </h3>
          <p className="text-gray-400 text-lg">
            We deliver exceptional value through our commitment to quality, innovation, and unmatched customer service.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {reasons.map((reason, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="bg-emerald-500/20 rounded-full p-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="font-semibold text-lg">{reason}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
