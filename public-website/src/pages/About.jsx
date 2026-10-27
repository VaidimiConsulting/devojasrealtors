import { useState } from 'react';
import { 
  Target, Compass, ShieldCheck, Award, CheckCircle2, 
  ChevronDown, ChevronUp, FileText, BadgeCheck,
  Quote, Building2, Sparkles, PhoneCall
} from 'lucide-react';
import { Link } from 'react-router-dom';
import piyushImg from '../assets/piyush_singh.jpg';

export default function About() {
  // FAQ stateful toggles
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    if (openFaq === index) {
      setOpenFaq(null);
    } else {
      setOpenFaq(index);
    }
  };

  const values = [
    {
      icon: <ShieldCheck className="h-6 w-6 text-brand-gold" />,
      title: "100% Legally Verified Land",
      description: "Our paramount rule is 100% legal compliance. Every plot layout is backed by clear titles, 30-year lineage checks, and registry mutation validation."
    },
    {
      icon: <Award className="h-6 w-6 text-brand-gold" />,
      title: "Customer-First Philosophy",
      description: "We provide complete end-to-end guidance during stamp registry, plot boundary allocation, bank loan approvals, and documentation mutation."
    },
    {
      icon: <Compass className="h-6 w-6 text-brand-gold" />,
      title: "Modern Infrastructure First",
      description: "We do not just sell raw land; we develop layouts equipped with 20 ft to 40 ft wide metalled roads, electricity networks, and gated boundary walls."
    }
  ];

  const buyingSteps = [
    {
      step: "01",
      title: "Free Guided Site Visit",
      desc: "Connect with our Varanasi sales office. We arrange a complimentary site tour of Devojas City at Kaithi Toll Plaza & Markandeya Mahadev Corridor."
    },
    {
      step: "02",
      title: "Plot Selection & Token",
      desc: "Choose your preferred plot size (1000 SF / 1600 SF). Reserve with a verified token booking directly to our official company HDFC Bank account."
    },
    {
      step: "03",
      title: "Document Verification",
      desc: "We provide official layout blueprints, registry copies, and clearance records for complete legal due diligence by your advocate."
    },
    {
      step: "04",
      title: "Stamp Registry & Mutation",
      desc: "Direct stamp registry execution at the Varanasi Registrar Office followed by immediate Khatauni mutation in your name."
    }
  ];

  const faqs = [
    {
      q: "Who is the developer of Devojas City?",
      a: "Devojas City is developed by Devojas Realtors Pvt. Ltd. under the visionary leadership of Managing Director Piyush Kumar Singh. We specialize exclusively in legally verified residential plotting in Varanasi."
    },
    {
      q: "Where is the project site exactly located?",
      a: "The project is located at Bhandaha Kalan, Kaithi, situated right on the Varanasi-Ghazipur Highway corridor near Kaithi Toll Plaza and 3.5 KM from the sacred Markandeya Mahadev Mandir (Sangam of Ganga & Gomti rivers)."
    },
    {
      q: "Is the land free from legal disputes?",
      a: "Yes, 100%. Every plot under Devojas Realtors Pvt. Ltd. undergoes rigorous legal due diligence, title verification, and official cadastral boundary mapping before being made available for purchase."
    },
    {
      q: "What is the registry and mutation (Khatauni) timeline?",
      a: "Stamp registry is executed immediately upon full payment clearance at the Sub-Registrar office in Varanasi. Khatauni mutation proceedings are filed right after and processed within standard government timelines."
    },
    {
      q: "Are bank loans available for plot purchase & construction?",
      a: "Yes. Because our projects possess complete legal titles and dispute-free registry records, leading nationalized and private banks (including HDFC, SBI, and ICICI) offer plot purchase and home construction loans."
    },
    {
      q: "What road widths are available inside the township?",
      a: "Devojas City features a grand 40 ft wide main entrance highway approach road, interconnected with 20 ft, 25 ft, and 30 ft wide internal sector roads."
    }
  ];

  return (
    <div className="page-shell pt-24 space-y-20 pb-16">
      
      {/* 1. Page Title Header */}
      <section className="relative overflow-hidden bg-brand-navy py-20 sm:py-24 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-1000 ease-out"
          style={{ backgroundImage: "url('/assets/about_hero_plots.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071A18]/75 via-[#0F2C2A]/60 to-[#071514]/85 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="section-kicker !text-white !bg-white/10 backdrop-blur-md border-white/20">
            Leadership & Corporate Profile
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-serif drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            About Devojas Realtors
          </h1>
          <p className="text-sm sm:text-base text-slate-100 max-w-2xl mx-auto font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
            Varanasi's trusted name in residential plotting, led by experienced leadership and committed to 100% verified legal land assets.
          </p>
        </div>
      </section>

      {/* 2. PROMINENT FOUNDER & MANAGING DIRECTOR SECTION (STARTING OF PAGE) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-[2rem] p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* MD Photograph & Credentials Card */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative group max-w-[320px] w-full">
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold to-yellow-500 rounded-3xl blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
                <div className="relative bg-white p-3 rounded-3xl border border-brand-gold/30 shadow-xl overflow-hidden">
                  <img 
                    src={piyushImg || "/assets/piyush_singh.jpg"} 
                    alt="Piyush Kumar Singh - Managing Director, Devojas Realtors Pvt. Ltd." 
                    className="w-full h-80 object-cover object-top rounded-2xl"
                    onError={(e) => {
                      e.currentTarget.src = "/assets/piyush_singh.jpg";
                    }}
                    loading="eager"
                  />
                  <div className="pt-4 pb-2 text-center">
                    <h3 className="text-xl font-bold font-serif text-brand-navy">Piyush Kumar Singh</h3>
                    <p className="text-xs font-bold text-brand-gold uppercase tracking-wider mt-0.5">Managing Director & Founder</p>
                    <p className="text-[11px] text-gray-500 mt-1">Devojas Realtors Pvt. Ltd.</p>
                  </div>
                </div>
              </div>

              {/* MD Quick Badges */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-[320px] mt-4">
                <div className="bg-brand-navy/5 border border-brand-navy/10 p-2.5 rounded-xl text-center">
                  <span className="block text-base font-bold text-brand-navy font-serif">13+ Yrs</span>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Real Estate Expertise</span>
                </div>
                <div className="bg-brand-gold/15 border border-brand-gold/30 p-2.5 rounded-xl text-center">
                  <span className="block text-base font-bold text-brand-navy font-serif">1000+</span>
                  <span className="text-[10px] text-brand-navy uppercase font-semibold">Plots Delivered</span>
                </div>
              </div>
            </div>

            {/* MD Vision & Leadership Profile */}
            <div className="lg:col-span-7 text-left space-y-5">
              <div className="inline-flex items-center space-x-2 bg-brand-gold/15 text-brand-navy px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-brand-gold/30">
                <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                <span>Leadership Message & Vision</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-navy font-serif leading-tight">
                "Securing Every Family's Dream with Legally Protected Land in Varanasi"
              </h2>

              <div className="relative bg-gray-50 p-5 rounded-2xl border-l-4 border-brand-gold text-gray-700 italic text-sm leading-relaxed">
                <Quote className="h-6 w-6 text-brand-gold/40 absolute top-3 right-3" />
                <p>
                  "When a person buys land, they are investing their hard-earned life savings. In Varanasi, our mission with Devojas Realtors is crystal clear: provide 100% verified, dispute-free residential land with instant registry and state-of-the-art infrastructure. At Devojas City near Kaithi Toll Plaza & Markandeya Mahadev Corridor, we have built wide roads, boundary demarcations, and legal safeguards so that every buyer can start building their dream home with absolute confidence."
                </p>
                <div className="mt-3 font-semibold text-brand-navy not-italic text-xs">
                  — Piyush Kumar Singh, <span className="text-gray-500 font-normal">Managing Director</span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm text-gray-600 leading-relaxed">
                <p>
                  Under the strategic direction of **Piyush Kumar Singh**, Devojas Realtors Pvt. Ltd. has emerged as Varanasi’s foremost residential plotting development enterprise. His vision centers on acquiring clear-titled land parcels along high-speed growth corridors, ensuring seamless Khatauni mutation, and engineering master layouts with 20 to 40 ft wide arterial roads.
                </p>
                <p>
                  His dedicated oversight guarantees that every single customer receives personalized support during site visits, bank loan applications, registrar office documentation, and physical plot handover.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/contact"
                  className="inline-flex items-center space-x-2 bg-brand-navy hover:bg-brand-navyLight text-white font-bold px-6 py-3 rounded-xl text-xs shadow-md transition-all"
                >
                  <PhoneCall className="h-4 w-4 text-brand-gold" />
                  <span>Connect With Management Office</span>
                </Link>
                <Link
                  to="/projects"
                  className="inline-flex items-center space-x-2 bg-brand-gold hover:bg-brand-goldLight text-brand-navy font-bold px-6 py-3 rounded-xl text-xs shadow-md transition-all"
                >
                  <span>Explore Devojas City Plots</span>
                </Link>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 3. ABOUT THE COMPANY SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Logo Frame */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative p-2 bg-gradient-to-tr from-brand-navy via-brand-navyLight to-brand-gold rounded-3xl shadow-xl w-full max-w-[360px]">
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-[22px] flex flex-col items-center justify-center border border-white/20 text-center">
                <img 
                  src="/assets/logo.png" 
                  alt="Devojas Realtors Pvt. Ltd. Corporate Logo" 
                  className="w-full h-auto object-contain rounded-lg"
                />
                <div className="mt-4 pt-4 border-t border-white/20 w-full text-white">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-gold block">Devojas Realtors Pvt. Ltd.</span>
                  <span className="text-[11px] text-white/70">CIN / Registration Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Company Narrative Content */}
          <div className="lg:col-span-7 text-left space-y-6">
            <span className="text-xs font-bold text-brand-gold uppercase tracking-widest block">
              Corporate Overview & Identity
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy font-serif">
              About Devojas Realtors Pvt. Ltd.
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              **Devojas Realtors Pvt. Ltd.** is a premier real estate organization incorporated in Varanasi, dedicated exclusively to the development and sale of high-potential residential land plots. We operate with a core philosophy of transparency, legal perfection, and customer security.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Unlike generic brokers, we actively acquire, master-plan, and develop organized gated townships in Varanasi's fastest expanding economic corridors. Our flagship project, **Devojas City**, is strategically situated at **Kaithi Toll Plaza & Markandeya Mahadev Corridor on the Ghazipur-Varanasi Highway**, combining unparalleled national highway connectivity with rich cultural and spiritual heritage.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white p-3.5 rounded-xl border border-gray-150 shadow-sm text-left">
                <BadgeCheck className="h-5 w-5 text-green-600 mb-1" />
                <span className="block text-xs font-bold text-brand-navy">100% Clean Title</span>
                <span className="text-[10px] text-gray-500">30-Yr Lineage Check</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-gray-150 shadow-sm text-left">
                <Building2 className="h-5 w-5 text-brand-gold mb-1" />
                <span className="block text-xs font-bold text-brand-navy">25-40 Ft Roads</span>
                <span className="text-[10px] text-gray-500">Wide Internal Network</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-gray-150 shadow-sm text-left">
                <FileText className="h-5 w-5 text-brand-navy mb-1" />
                <span className="block text-xs font-bold text-brand-navy">Instant Mutation</span>
                <span className="text-[10px] text-gray-500">Fast Khatauni Transfer</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. STEP-BY-STEP PURCHASE GUIDE */}
      <section className="bg-gray-50 py-16 border-y border-gray-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-brand-gold uppercase tracking-wider">
              Transparent Process
            </span>
            <h2 className="text-3xl font-bold text-brand-navy font-serif">
              Our 4-Step Plot Purchase Journey
            </h2>
            <p className="text-sm text-gray-500">
              We make land purchase simple, safe, and fully documented from site visit to final registry.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {buyingSteps.map((step, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md text-left relative space-y-3 hover:translate-y-[-4px] transition-transform duration-300">
                <span className="absolute top-4 right-4 text-3xl font-extrabold text-brand-gold/15 font-mono">{step.step}</span>
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-wider">Step</span>
                <h4 className="font-bold text-brand-navy text-sm font-serif">{step.title}</h4>
                <p className="text-[11px] text-gray-500 leading-normal">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. MISSION & VISION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Mission */}
          <div className="bg-white p-8 rounded-3xl border border-gray-150 shadow-md text-left space-y-4">
            <div className="bg-brand-navy/5 inline-flex p-3 rounded-xl">
              <Target className="h-8 w-8 text-brand-navy" />
            </div>
            <h3 className="text-xl font-bold text-brand-navy font-serif">Our Corporate Mission</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              To build high-value, legally sound residential townships equipped with solid physical road infrastructure, enabling families and investors to acquire verified plots with complete peace of mind and immediate possession.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-white p-8 rounded-3xl border border-gray-150 shadow-md text-left space-y-4">
            <div className="bg-brand-navy/5 inline-flex p-3 rounded-xl">
              <Compass className="h-8 w-8 text-brand-navy" />
            </div>
            <h3 className="text-xl font-bold text-brand-navy font-serif">Our Long-Term Vision</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              To be recognized as Eastern Uttar Pradesh’s most trusted real estate brand in residential plotting, known for absolute title transparency, customer-centric services, and master-planned layouts.
            </p>
          </div>

        </div>
      </section>

      {/* 6. CORE VALUES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy font-serif">Our Foundations of Trust</h2>
          <p className="text-xs text-gray-500">Every plot transaction is governed by our core principles</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((val, idx) => (
            <div 
              key={idx} 
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md text-left space-y-3"
            >
              <div className="bg-brand-navy/5 inline-block p-2 rounded-lg">
                {val.icon}
              </div>
              <h4 className="font-bold text-brand-navy font-serif text-base">{val.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{val.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. FAQ ACCORDIONS */}
      <section className="bg-gray-50 py-16 border-t border-gray-150">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold text-brand-gold uppercase tracking-wider">
              Common Questions
            </span>
            <h2 className="text-3xl font-bold text-brand-navy font-serif text-center">
              Frequently Asked Questions (FAQ)
            </h2>
            <p className="text-sm text-gray-500 text-center">
              Find answers to core legal, registry, and project location queries related to Devojas City.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-xl border border-gray-150 shadow-md overflow-hidden"
              >
                {/* Header toggle */}
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 flex items-center justify-between text-left font-bold font-serif text-sm sm:text-base text-brand-navy hover:text-brand-gold transition-colors focus:outline-none cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="h-5 w-5 text-brand-gold shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-brand-gold shrink-0 ml-4" />
                  )}
                </button>

                {/* Body Content */}
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs text-gray-600 border-t border-gray-100 leading-relaxed bg-gray-50/50 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 8. Trust Badge Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-navy text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navyLight to-brand-navy opacity-90" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-bold font-serif text-brand-gold">Trusted Developers</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              We strictly adhere to all legal requirements for residential plotting. All plot sizes, layout dimensions, and road allocations are meticulously verified.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-6">
              <span className="flex items-center space-x-2 text-xs font-semibold">
                <CheckCircle2 className="h-5 w-5 text-brand-gold" />
                <span>Immediate Khatauni Mutation</span>
              </span>
              <span className="flex items-center space-x-2 text-xs font-semibold">
                <CheckCircle2 className="h-5 w-5 text-brand-gold" />
                <span>Zero Legal Disputes</span>
              </span>
              <span className="flex items-center space-x-2 text-xs font-semibold">
                <CheckCircle2 className="h-5 w-5 text-brand-gold" />
                <span>Kaithi Toll Plaza Corridor</span>
              </span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
