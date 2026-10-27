import { Phone, MessageSquare } from 'lucide-react';

export default function FloatingCTA() {
  const phoneNumber = "9278317284";
  const whatsappNumber = "919278317284";
  const whatsappMessage = "Hi, I am interested in Devojas City residential plots. Please send me more details.";
  
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="fixed bottom-4 right-3.5 sm:bottom-6 sm:right-6 z-40 flex flex-col space-y-2.5 sm:space-y-3 pointer-events-none">
      
      {/* WhatsApp Button */}
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto flex items-center justify-center space-x-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold p-3 sm:px-4 sm:py-3 rounded-full shadow-2xl hover:shadow-[0_10px_20px_rgba(37,211,102,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 duration-300"
        aria-label="WhatsApp Us"
      >
        <MessageSquare className="h-5 w-5 fill-current" />
        <span className="hidden sm:inline text-xs tracking-wider uppercase font-sans">WhatsApp Us</span>
      </a>

      {/* Call Button */}
      <a 
        href={`tel:${phoneNumber}`}
        className="pointer-events-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-brand-gold to-brand-goldLight hover:from-brand-goldLight hover:to-brand-gold text-brand-navy font-extrabold p-3 sm:px-4 sm:py-3 rounded-full shadow-2xl hover:shadow-[0_10px_20px_rgba(200,155,60,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 duration-300 border border-brand-goldLight/20"
        aria-label="Call Us"
      >
        <Phone className="h-5 w-5 fill-current" />
        <span className="hidden sm:inline text-xs tracking-wider uppercase font-sans">Call Us</span>
      </a>

    </div>
  );
}
