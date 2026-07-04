import { MapPin, Phone, Mail, Globe, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export default function BrochureFooter({ isPrint }) {
  return (
    <div className={`bg-navy-900 text-gray-300 ${isPrint ? 'py-12' : 'py-20'} border-t border-navy-800`}>
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-display font-bold text-white mb-2">
                REON <span className="text-emerald-500">ENERGIES</span>
              </h2>
              <p className="text-gray-400 text-sm">PRIVATE LIMITED</p>
            </div>
            
            <p className="max-w-md mb-8 leading-relaxed">
              Accelerating India's transition toward green energy by providing reliable, high-performance, and affordable solar solutions.
            </p>

            {!isPrint && (
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            )}
          </div>

          <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-6">Contact Information</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                <span>Singur, Hooghly, West Bengal, India</span>
              </li>
              <li className="flex items-center gap-4">
                <Phone className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <span>+91 8436649991</span>
              </li>
              <li className="flex items-center gap-4">
                <Mail className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <span>support@reonenergy.in</span>
              </li>
              <li className="flex items-center gap-4">
                <Globe className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <span>reonenergy.in</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-navy-800 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} REON ENERGIES PRIVATE LIMITED. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
