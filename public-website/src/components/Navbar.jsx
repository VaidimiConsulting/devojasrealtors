import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Phone, ShieldCheck, Check, User, LogOut } from 'lucide-react';
import { enquiryService } from '../services/enquiryService';
import { authService } from '../services/authService';
import AuthModal from './AuthModal';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Auth state (NEW — doesn't affect anything existing)
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());

  const handleAuthSuccess = (user) => setCurrentUser(user);
  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Modal States
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  // Form States
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    mobile: '',
    location: 'Bhandaha Kalan (Kaithi)',
    budget: '15 - 20 Lacs',
    size: '1000 Sq. Ft.'
  });
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Projects', path: '/projects' },
    { name: 'Plot Inventory', path: '/plot-inventory' },
    { name: 'Location', path: '/location' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Contact Us', path: '/contact' },
  ];

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    try {
      await enquiryService.submitEnquiry({
        name: enquiryForm.name,
        phone: enquiryForm.mobile,
        preferredLocation: enquiryForm.location,
        budget: enquiryForm.budget,
        plotSize: enquiryForm.size,
        enquiryType: 'Navbar Callback Request'
      });
      
      setEnquirySubmitted(true);
      setTimeout(() => {
        setEnquirySubmitted(false);
        setIsEnquiryOpen(false);
        setEnquiryForm({
          name: '',
          mobile: '',
          location: 'Bhandaha Kalan (Kaithi)',
          budget: '15 - 20 Lacs',
          size: '1000 Sq. Ft.'
        });
      }, 2500);
    } catch (err) {
      console.error("Enquiry submission error:", err);
      setEnquirySubmitted(true);
    }
  };

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/98 backdrop-blur-md shadow-md py-1.5 border-b border-gray-100' 
          : 'bg-white/95 backdrop-blur-md py-2.5 sm:py-3 border-b border-gray-200/50'
      }`}>
        
        {/* Decorative Golden Gradient Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[linear-gradient(90deg,#12372a,#d7a43b,#1e5b47,#d7a43b)] bg-[length:200%_100%] opacity-90 animate-shimmer" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16 sm:h-18">
            
            {/* Logo & Brand Identity (Clean, High-Resolution, No Circular Ring) */}
            <Link to="/" className="flex items-center space-x-3 sm:space-x-3.5 group shrink-0">
              <img
                src="/assets/logo.png"
                alt="Devojas Realtors Logo"
                className="h-12 sm:h-14 md:h-15 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <div className="flex flex-col text-left">
                <span className="font-black text-brand-navy tracking-wider text-base sm:text-lg lg:text-xl font-serif leading-none">
                  DEVOJAS REALTORS
                </span>
                <span className="text-[9px] sm:text-[10px] text-brand-gold font-extrabold tracking-[0.25em] uppercase mt-1">
                  Pvt. Ltd.
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (Centered, Compact & Pass-Pass) */}
            <div className="hidden lg:flex items-center justify-center flex-1 mx-3 xl:mx-6">
              <div className="flex items-center bg-slate-100/85 border border-slate-200/70 p-1 rounded-full shadow-inner space-x-0.5 xl:space-x-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    className={({ isActive }) =>
                      `px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-[13px] font-semibold tracking-wide transition-all duration-200 whitespace-nowrap ${
                        isActive 
                          ? 'text-white bg-brand-navy shadow-sm font-bold' 
                          : 'text-brand-navy/75 hover:text-brand-navy hover:bg-white/90'
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Action Links (Anchored to Right) */}
            <div className="hidden lg:flex items-center justify-end space-x-2 xl:space-x-2.5 shrink-0">
              {/* Login / Logout */}
              {currentUser ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center space-x-1.5 text-brand-navy border border-brand-navy/20 hover:bg-brand-navy/5 px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout ({currentUser.name?.split(' ')[0]})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="flex items-center space-x-1.5 text-brand-navy border border-brand-navy/20 hover:bg-brand-navy/5 px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Login</span>
                </button>
              )}

              {/* Enquiry Now CTA */}
              <button
                type="button"
                onClick={() => setIsEnquiryOpen(true)}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-brand-gold to-brand-goldLight hover:from-brand-goldLight hover:to-brand-gold text-brand-navy px-4 xl:px-5 py-1.5 sm:py-2 rounded-full text-xs font-extrabold shadow-sm hover:shadow transition-all transform hover:-translate-y-0.5 active:scale-95 duration-200 whitespace-nowrap"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Enquiry Now</span>
              </button>
            </div>

            {/* Mobile Buttons */}
            <div className="flex lg:hidden items-center space-x-2">
              <button 
                onClick={() => setIsEnquiryOpen(true)}
                className="p-2 text-brand-navy bg-brand-navy/5 border border-brand-navy/10 rounded-lg hover:bg-brand-navy/10 active:scale-95 transition-all"
                aria-label="Enquiry Now"
              >
                <Phone className="h-4.5 w-4.5 text-brand-gold" />
              </button>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-brand-navy hover:text-brand-gold hover:bg-brand-navy/5 border border-transparent hover:border-brand-navy/10 focus:outline-none active:scale-95 transition-all"
                aria-expanded={isOpen}
              >
                {isOpen ? <X className="h-6.5 w-6.5" /> : <Menu className="h-6.5 w-6.5" />}
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile Drawer Slide-In Panel (Light Theme matching Navbar, placed outside nav for true viewport fixed positioning) */}
      <div 
        className={`lg:hidden fixed inset-y-0 right-0 z-[70] w-[85vw] max-w-xs sm:max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-brand-navy/10 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Golden Border Left on mobile drawer */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-brand-gold via-yellow-400 to-brand-goldLight opacity-80" />

        {/* Drawer Header - solid background */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-brand-navy/10 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <img src="/assets/logo.png" alt="Logo" className="h-10 w-auto object-contain shrink-0" />
            <div className="text-left">
              <span className="text-brand-navy font-black text-xs tracking-wider font-serif block leading-none">DEVOJAS REALTORS</span>
              <span className="text-[8px] text-brand-gold font-extrabold uppercase tracking-widest mt-0.5 block">Varanasi</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-brand-navy hover:text-brand-gold bg-brand-navy/5 hover:bg-brand-navy/10 focus:outline-none transition-all active:scale-95"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Drawer Scrollable Links Container */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5 overscroll-contain">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-brand-gold to-yellow-500 text-brand-navy shadow-md font-extrabold' 
                    : 'text-brand-navy hover:bg-brand-navy/5 hover:text-brand-gold'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
          
          <div className="pt-4 space-y-3">
            {/* Mobile Login/Signup button */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => { setIsOpen(false); handleLogout(); }}
                className="flex items-center justify-center space-x-3 w-full border border-brand-navy/20 text-brand-navy py-3 rounded-xl font-bold active:scale-95 transition-all text-xs"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>Logout ({currentUser.name?.split(' ')[0]})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setIsOpen(false); setIsAuthOpen(true); }}
                className="flex items-center justify-center space-x-3 w-full border border-brand-navy/20 text-brand-navy py-3 rounded-xl font-bold active:scale-95 transition-all text-xs"
              >
                <User className="h-4.5 w-4.5" />
                <span>Login</span>
              </button>
            )}

            {/* Mobile Enquiry button */}
            <button 
              type="button"
              onClick={() => { setIsOpen(false); setIsEnquiryOpen(true); }}
              className="flex items-center justify-center space-x-3 w-full bg-gradient-to-r from-brand-gold to-yellow-500 text-brand-navy py-3 rounded-xl font-bold hover:bg-brand-goldLight active:scale-95 transition-all text-xs shadow-lg"
            >
              <Phone className="h-4.5 w-4.5" />
              <span>Enquiry Now</span>
            </button>

            <div className="bg-brand-navy/5 border border-brand-navy/10 p-3.5 rounded-xl flex items-center space-x-3 text-left">
              <ShieldCheck className="h-5 w-5 text-brand-gold shrink-0" />
              <span className="text-[9px] text-brand-navy/70 leading-relaxed">Verified residential plotting township documentation & maps.</span>
            </div>
            
            <p className="text-[10px] text-center text-gray-400 pt-2 pb-6">
              © {new Date().getFullYear()} Devojas Realtors Pvt. Ltd.
            </p>
          </div>
        </div>
      </div>

      {/* Overlay backdrop for Mobile Menu (Placed outside nav with proper z-index) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* ========================================================================= */}
      {/* ENQUIRY NOW POPUP MODAL */}
      {/* ========================================================================= */}
      {isEnquiryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setIsEnquiryOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          
          {/* Modal Container */}
          <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 max-w-md w-full z-[110] transform transition-all animate-in fade-in duration-300">
            {/* Decorative Gold top line */}
            <div className="h-[4px] bg-gradient-to-r from-brand-gold via-yellow-400 to-brand-goldLight" />
            
            <div className="p-6 sm:p-8 text-left relative">
              <button 
                onClick={() => setIsEnquiryOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>

              {enquirySubmitted ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 stroke-[3]" />
                  </div>
                  <h3 className="text-2xl font-bold text-brand-navy font-serif">Callback Requested!</h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Thank you, <strong>{enquiryForm.name}</strong>. We have received your plot details. Our team will contact you on <strong>{enquiryForm.mobile}</strong> shortly.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-brand-navy font-serif mb-1">Request a Callback</h3>
                  <p className="text-xs text-gray-500 mb-6">Enter your details and our team will get in touch with you.</p>

                  <form onSubmit={handleEnquirySubmit} className="space-y-4">
                    {/* Name field */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                        Name
                      </label>
                      <input 
                        type="text" 
                        required
                        value={enquiryForm.name}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                        placeholder="Enter your full name" 
                        className="w-full px-3.5 py-2.5 border border-gray-300 bg-gray-50 text-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
                      />
                    </div>

                    {/* Mobile field */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                        Mobile Number
                      </label>
                      <input 
                        type="tel" 
                        required
                        pattern="[0-9]{10}"
                        value={enquiryForm.mobile}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, mobile: e.target.value })}
                        placeholder="Enter 10-digit number" 
                        className="w-full px-3.5 py-2.5 border border-gray-300 bg-gray-50 text-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
                      />
                    </div>

                    {/* Preferred Location */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                        Preferred Location
                      </label>
                      <select 
                        value={enquiryForm.location}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, location: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-300 bg-gray-50 text-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
                      >
                        <option value="Bhandaha Kalan (Kaithi)">Bhandaha Kalan (Kaithi) - Varanasi</option>
                        <option value="Kaithi Mandir Area">Kaithi Mandir Area - Varanasi</option>
                        <option value="Varanasi - Ghazipur Road Corridor">Ghazipur Road Corridor</option>
                      </select>
                    </div>

                    {/* Budget & Size */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                          Budget Limit
                        </label>
                        <select 
                          value={enquiryForm.budget}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, budget: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-gray-300 bg-gray-50 text-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
                        >
                          <option value="Under 15 Lacs">Under 15 Lacs</option>
                          <option value="15 - 20 Lacs">15 - 20 Lacs</option>
                          <option value="20 - 30 Lacs">20 - 30 Lacs</option>
                          <option value="30+ Lacs">30+ Lacs</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                          Plot Size
                        </label>
                        <select 
                          value={enquiryForm.size}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, size: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-gray-300 bg-gray-50 text-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
                        >
                          <option value="1000 Sq. Ft.">1000 Sq. Ft.</option>
                          <option value="1600 Sq. Ft.">1600 Sq. Ft.</option>
                        </select>
                      </div>
                    </div>

                    {/* Submit button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full bg-brand-navy hover:bg-brand-navyLight text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2 active:scale-95"
                      >
                        <span>Request a Callback</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login/Signup Modal (NEW) */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={handleAuthSuccess} />
    </>
  );
}
