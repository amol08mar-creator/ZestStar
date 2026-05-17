import { MapPin, Phone, Mail } from 'lucide-react';

const LINKS = {
  'Quick Links': ['Home', 'Shop', 'Delivery Zones', 'Returns', 'FAQs'],
  Support: ['Contact Us', 'Help & Support', 'Track Order', 'Refund Policy'],
};

export default function Footer() {
  return (
    <footer className="bg-dark text-white">
      <div className="max-w-[1200px] mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <span
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                ZestStar
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Fresh Produce, Delivered Fast. Your trusted grocery partner in Navi Mumbai &
              Panvel region.
            </p>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Panvel, Navi Mumbai, Maharashtra</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>support@zeststar.in</span>
              </div>
            </div>
          </div>

          {/* Quick Links & Support */}
          {Object.entries(LINKS).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="font-bold text-white mb-4">{heading}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-gray-400 hover:text-primary transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Social */}
          <div>
            <h4 className="font-bold text-white mb-4">Follow Us</h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { label: 'Facebook', icon: 'f', color: '#1877F2' },
                { label: 'Instagram', icon: '◈', color: '#E1306C' },
                { label: 'Twitter', icon: '𝕏', color: '#1DA1F2' },
                { label: 'LinkedIn', icon: 'in', color: '#0A66C2' },
              ].map(({ label, icon, color }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  {icon}
                </a>
              ))}
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-2 font-semibold">Download App</p>
              <div className="flex gap-2">
                <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors border border-white/10">
                  🍎 App Store
                </button>
                <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors border border-white/10">
                  ▶ Play Store
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© 2026 ZestStar. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
