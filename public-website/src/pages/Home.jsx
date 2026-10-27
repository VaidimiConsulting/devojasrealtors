import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import ProjectCard from '../components/ProjectCard';
import ContactForm from '../components/ContactForm';
import { projectsData } from '../projectsData';
import {
  ShieldCheck, Compass, FileText, CheckCircle2, ArrowRight,
  Star, Award, TrendingUp, MapPin, Sparkles
} from 'lucide-react';

export default function Home() {
  const featuredProject = projectsData[0];

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Plot Owner, Block B",
      review: "Devojas Realtors showed me the registry papers and helped mutate my khatauni within 3 weeks. Excellent road access!",
      stars: 5
    },
    {
      name: "Rajesh Kumar",
      role: "Investment Buyer, Block A",
      review: "Perfect location for high return, just 3.5 KM from Markandey Mahadev temple. Transparent process throughout.",
      stars: 5
    },
    {
      name: "Amit Patel",
      role: "NRI Plot Owner, Block C",
      review: "Hassle-free registry process. The team was transparent and arranged multiple free site visits for my family.",
      stars: 5
    },
    {
      name: "Vikram Singh",
      role: "Plot Owner, Phase 1",
      review: "Excellent infrastructure. The 40ft road is built exactly as promised on the layout map.",
      stars: 5
    },
    {
      name: "Sunita Devi",
      role: "Residential Buyer",
      review: "Safe and secure gated society. Very happy with the immediate registry process.",
      stars: 5
    },
    {
      name: "Ramesh Tiwari",
      role: "Investment Buyer",
      review: "Best plotting project in Varanasi. The return on investment here is incredible.",
      stars: 5
    }
  ];

  const whyChooseUsData = [
    {
      icon: <ShieldCheck className="h-7 w-7 text-brand-gold" />,
      title: "100% Verified Land Plots",
      description: "Every plot comes with clean legal titles, complete land surveys, and verified documentation."
    },
    {
      icon: <Compass className="h-7 w-7 text-brand-gold" />,
      title: "Prime Strategic Locations",
      description: "Located near Varanasi-Ghazipur Highway, with direct connectivity to Varanasi Cantt and Airport."
    },
    {
      icon: <FileText className="h-7 w-7 text-brand-gold" />,
      title: "Immediate Registry & Mutation",
      description: "Hassle-free documentation with immediate registry and mutation upon purchase."
    },
    {
      icon: <CheckCircle2 className="h-7 w-7 text-brand-gold" />,
      title: "Modern Infrastructure",
      description: "20 ft to 40 ft wide roads, electricity setup, and secure boundary walls."
    }
  ];

  return (
    <div className="page-shell pb-16">
      <Hero />

      <section className="relative mt-2 sm:-mt-10 z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-[2rem] p-5 sm:p-7 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeUp">
          {[
            ['100%', 'Verified Land'],
            ['25-40 Ft', 'Wide Roads'],
            ['0', 'Brokerage'],
            ['Daily', 'Site Visits'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-white/70 border border-brand-navy/10 px-4 py-5 text-center">
              <span className="block font-display text-2xl sm:text-3xl font-black text-brand-navy">{value}</span>
              <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <div className="relative animate-floatSlow">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-gold/30 to-brand-navy/20 blur-2xl" />
              <div className="relative rounded-[2rem] overflow-hidden shadow-glow border border-white/60 bg-white">
                <img src="/assets/logo.png" alt="Devojas Realtors Pvt. Ltd. Official Logo" className="w-full max-w-sm mx-auto p-10 object-contain" />
                <div className="bg-brand-navy text-white px-6 py-5 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-[0.22em] text-brand-gold">Devojas Realtors</span>
                  <Award className="h-5 w-5 text-brand-gold" />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 text-left space-y-6">
            <span className="section-kicker">Welcome To Devojas Realtors</span>
            <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight text-brand-navy">
              Varanasi's Leading Residential Plotting Specialist
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-slate-600 max-w-lg">
              Delivering safe, verified, and high-return residential plots to secure your future.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="lift-card rounded-2xl border border-brand-navy/10 bg-white/80 p-5">
                <Award className="h-7 w-7 text-brand-gold mb-3" />
                <span className="font-bold text-brand-navy">Transparent Deals</span>
              </div>
              <div className="lift-card rounded-2xl border border-brand-navy/10 bg-white/80 p-5">
                <TrendingUp className="h-7 w-7 text-brand-gold mb-3" />
                <span className="font-bold text-brand-navy">High Return Potential</span>
              </div>
            </div>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-6 py-3 text-sm font-extrabold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-navyLight"
            >
              <span>Read Complete Background</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white/70 border-y border-brand-navy/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div className="max-w-3xl text-left">
              <span className="section-kicker">Project Launch</span>
              <h2 className="mt-4 font-display text-3xl sm:text-5xl font-black text-brand-navy">
                Our Featured Residential Layout
              </h2>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600">
                Premium ready-to-construct plots with multi-lane connectivity.
              </p>
            </div>
            <div className="rounded-2xl bg-brand-gold/15 border border-brand-gold/30 px-5 py-4 text-left">
              <MapPin className="h-5 w-5 text-brand-navy mb-2" />
              <p className="text-xs font-bold text-brand-navy">Kaithi Toll Plaza & Markandeya Mahadev Corridor</p>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            <ProjectCard project={featuredProject} />
          </div>
        </div>
      </section>

      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/assets/plot_site_wide.jpg" alt="Devojas City residential plots aerial view" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark/95 via-brand-navy/88 to-brand-navyLight/72" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12 text-left">
            <span className="section-kicker !text-white !bg-white/10">Trust & Security</span>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-black text-white">
              Why Devojas Realtors is the Best Choice
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Complete legal compliance and premium support for a simplified land-buying experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {whyChooseUsData.map((item, idx) => (
              <div key={idx} className="lift-card rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-6 text-left text-white">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                  {item.icon}
                </div>
                <h3 className="font-display font-extrabold text-lg leading-snug">{item.title}</h3>
                <p className="mt-3 text-xs leading-6 text-white/70">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="section-kicker">Customer Reviews</span>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl font-black text-brand-navy">
            What Our Verified Plot Owners Say
          </h2>
        </div>

        <div className="overflow-hidden relative w-full pb-10">
          <div className="flex w-max animate-marquee space-x-6 hover:[animation-play-state:paused]">
            {[...testimonials, ...testimonials].map((t, idx) => (
              <div key={idx} className="w-[320px] sm:w-[380px] shrink-0 rounded-[1.5rem] border border-brand-navy/10 bg-white p-6 sm:p-8 text-left shadow-xl hover:-translate-y-1 transition-transform">
                <div className="flex gap-1">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-brand-gold fill-current" />
                  ))}
                </div>
                <p className="mt-5 text-sm sm:text-base leading-relaxed text-slate-600 italic">"{t.review}"</p>
                <div className="mt-6 pt-5 border-t border-brand-navy/10 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-navy to-brand-navyLight text-brand-gold flex items-center justify-center font-black text-lg uppercase shadow-md">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-brand-navy leading-none">{t.name}</h4>
                    <span className="text-xs text-slate-500 block mt-1.5 font-semibold uppercase tracking-wider">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Gradient Masks for smooth scroll edge fading */}
          <div className="absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-[#FAFAFA] to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-[#FAFAFA] to-transparent pointer-events-none" />
        </div>
      </section>

      <section className="bg-brand-navy py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 text-left space-y-6">
              <span className="section-kicker !bg-white/10 !text-white">Sales & Bookings</span>
              <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight">
                Secure Your Residential Plot in Devojas City Today
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-white/80 max-w-md">
                Book a free site visit today. Fast, transparent, and seamless registry process.
              </p>

              <div className="grid sm:grid-cols-3 gap-3 pt-2">
                {['Zero Brokerage', 'Instant Ownership', 'Loan Support'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <Sparkles className="h-4 w-4 text-brand-gold mb-2" />
                    <span className="text-xs font-extrabold">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <ContactForm projectName="Devojas City" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
