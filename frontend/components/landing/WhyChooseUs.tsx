import { Clock, ShieldCheck, Package, RefreshCw } from 'lucide-react';

const BENEFITS = [
  {
    icon: Clock,
    stat: '5+ hrs',
    statLabel: 'saved per week',
    title: 'No more grocery runs',
    description: 'Skip the queues, parking, and weekend hauls. Order in 60 seconds.',
    bg: '#FBEEE8',
    color: '#C15F3C',
  },
  {
    icon: ShieldCheck,
    stat: '100%',
    statLabel: 'fresh promise',
    title: 'Or full refund',
    description: 'Not happy with your produce? We refund — no questions asked.',
    bg: '#FFF8E7',
    color: '#D4960F',
  },
  {
    icon: Package,
    stat: '25%',
    statLabel: 'bulk savings',
    title: 'Family-Size Packs',
    description: 'Curated bundles built for households of 2 to 6 — at lower per-kg prices.',
    bg: '#FBEEE8',
    color: '#C15F3C',
  },
  {
    icon: RefreshCw,
    stat: '1-tap',
    statLabel: 'reorder',
    title: 'Repeat your basics',
    description: 'Re-order last week’s essentials in a single tap — never run out again.',
    bg: '#FFFDE7',
    color: '#F9A825',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="text-center mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold text-dark mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Why busy families <span className="text-primary">love ZestStar</span>
          </h2>
          <p className="text-muted max-w-lg mx-auto">
            We&apos;re built for households where every minute counts — and every meal matters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map(({ icon: Icon, stat, statLabel, title, description, bg, color }) => (
            <div
              key={title}
              className="rounded-2xl p-6 border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ backgroundColor: bg }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${color}25` }}
              >
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <p className="text-3xl font-bold leading-none mb-1" style={{ color, fontFamily: 'var(--font-serif)' }}>{stat}</p>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">{statLabel}</p>
              <h3 className="font-bold text-dark mb-1.5">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
