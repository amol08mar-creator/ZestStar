import { Zap, Clock, ShieldCheck, Truck } from 'lucide-react';

export default function DeliveryBanner() {
  const stats = [
    { icon: Zap, label: '30-Min Delivery', sub: 'Guaranteed' },
    { icon: ShieldCheck, label: '100% Fresh', sub: 'Quality assured' },
    { icon: Clock, label: '7am – 10pm', sub: 'Delivery hours' },
    { icon: Truck, label: 'Free Delivery', sub: 'Orders above ₹300' },
  ];

  return (
    <section className="bg-primary-light border-y border-[#E8B89A]">
      <div className="max-w-[1200px] mx-auto px-4 py-5">
        <div className="flex flex-wrap items-center justify-center md:justify-between gap-4">
          {stats.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary-dark">{label}</p>
                <p className="text-xs text-primary">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
