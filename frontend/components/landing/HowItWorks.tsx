import { Search, Clock, Heart } from 'lucide-react';

const STEPS = [
  {
    icon: Search,
    title: 'Browse & Pick',
    description: '1,000+ fresh products at your fingertips — daily essentials to weekly groceries.',
  },
  {
    icon: Clock,
    title: 'Pick a Slot',
    description: '30-minute express or scheduled delivery — when it suits your family.',
  },
  {
    icon: Heart,
    title: 'Family Time',
    description: 'We deliver to your door. You spend time on what truly matters.',
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-cream py-14 md:py-20">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="text-center mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold text-dark mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Groceries done, in <span className="text-primary">3 simple steps</span>
          </h2>
          <p className="text-muted max-w-md mx-auto">
            From your couch to your kitchen — without leaving home.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px border-t-2 border-dashed border-[#E8B89A] z-0" />

          {STEPS.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="relative z-10 flex flex-col items-center text-center bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="relative mb-4">
                <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-white text-sm font-bold rounded-full flex items-center justify-center shadow-md">
                  {i + 1}
                </span>
              </div>

              <h3
                className="font-bold text-dark mb-2 text-lg"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
