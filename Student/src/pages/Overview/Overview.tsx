import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePayment } from "../../context/PaymentContext";

import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sparkles,
  Receipt,
  UtensilsCrossed,
} from "lucide-react";

import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = 'http://localhost:5000';

const SLIDE_IMAGES = [
  {
    url: "/facilities/hero1.jpg",
    title: 'Sri Shyla Nilaya',
    subtitle: 'Sri Shyla Nilaya — A premium, modern residence partnered with BMSIT&M'
  },
  {
    url: "/facilities/hero_building2.png",
    title: 'SVS Nilaya Branch',
    subtitle: 'Fully furnished rooms designed for academic focus and comfort'
  },
  {
    url: "/facilities/hero_building3.png",
    title: 'Vista Branch',
    subtitle: 'High-speed Wi-Fi zones, modern amenities, and 24/7 security'
  }
];

const PG_FEATURE_SECTIONS: Array<{
  id: string;
  title: string;
  description: string;
  mainImage: string;
  subImage: string;
  route: string;
  mainImageStyle?: React.CSSProperties;
  subImageStyle?: React.CSSProperties;
}> = [
  {
    id: 'dining',
    title: 'Hygienic Dining & Quality Food',
    description: 'We prioritize student health and nutrition with a rich four-meal daily menu. Our in-house kitchen serves hot, freshly prepared vegetarian meals under strict hygiene standards. All cooking water undergoes multi-stage filtration to ensure 100% purity.',
    mainImage: '/facilities/hygiene_food.jpg',
    subImage: '/facilities/block2.jpeg',
    route: '/mess'
  },
  {
    id: 'rooms',
    title: 'Furnished Rooms & Study Spaces',
    description: 'Designed for academic concentration and peaceful living, our rooms come equipped with individual study desks, comfortable mattresses, spacious wardrobes, and high-speed Wi-Fi. Quiet lounge spaces are available on every floor for group discussions.',
    mainImage: '/facilities/block1.jpeg',
    subImage: '/facilities/room_desks.png',
    route: '/facilities'
  },
  {
    id: 'security',
    title: '24/7 Security & Safety Protocols',
    description: 'Student safety is our top priority. We enforce round-the-clock CCTV surveillance across all corridors and entry points, night curfew checks, and on-site resident warden support coordinated with BMSIT&M hostel administration.',
    mainImage: '/facilities/cctv.jpeg',
    subImage: '/facilities/block4.jpeg',
    route: '/facilities'
  },
  {
    id: 'housekeeping',
    title: 'Housekeeping & Laundry Services',
    description: 'Enjoy hassle-free residential living with daily room sweeping, bathroom sanitization, and scheduled laundry pickup. Continuous RO drinking water units and 100kVA generator power backups ensure zero interruptions to your daily routine.',
    mainImage: '/facilities/cleaning2.jpeg',
    mainImageStyle: { objectPosition: 'center 0%' },
    subImage: '/facilities/washingmachine.jpeg',
    route: '/facilities'
  }
];

export const Overview: React.FC = () => {
  const { applicationState, student, hostel, paymentStatus, refreshStatus } = usePayment();
  const { isLoggedIn, studentUsn } = useAuth();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Payment form states
  const [utr, setUtr] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-carousel timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDE_IMAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotFile) {
      alert('Payment screenshot is mandatory!');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Upload screenshot
      const formData = new FormData();
      formData.append('photo', screenshotFile);

      const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Screenshot upload failed. Please try again.');
      }

      const uploadData = await uploadRes.json();
      const screenshotUrl = uploadData.imageUrl;

      // 2. Submit payment details
      await apiRequest('/api/student/payment', {
        method: 'POST',
        body: JSON.stringify({
          studentName: student.name,
          studentUsn: studentUsn || student.usn,
          utrNumber: utr,
          paymentDate: paymentDate,
          hostelName: hostel.hostel || 'OM SAI PG',
          block: hostel.block || 'A',
          floor: String(hostel.floor || '1'),
          roomNumber: hostel.room || '101',
          screenshotUrl,
        })
      });
      alert('Payment details submitted successfully! Awaiting verification.');
      refreshStatus();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-16 animate-fadeIn pb-16">
      
      {/* 1. HERO SECTION — Split Showcase Layout */}
      <div className="relative overflow-hidden mb-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
        
        {/* Soft ambient gradient accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center relative z-10 h-full" style={{ minHeight: 'calc(100vh - 100px)' }}>
          
          {/* Left Content Column — compact */}
          <div className="lg:col-span-5 space-y-4 text-left pl-1">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                Affiliated With — BMSIT&M
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight uppercase leading-[1.1]">
                OM SAI LUXURY PGS
              </h1>
              <p className="text-base sm:text-lg font-extrabold text-primary uppercase tracking-wider">
                {SLIDE_IMAGES[currentSlide].title}
              </p>
            </div>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              {SLIDE_IMAGES[currentSlide].subtitle} — Premium off-campus student residence partnered with BMSIT&M. Fully furnished rooms, 24/7 security, 4-meal daily dining, and high-speed Wi-Fi.
            </p>

          

            {/* Action Buttons */}
            {/* Action Buttons */}
<div className="flex flex-wrap items-center gap-3.5 pt-1">
  <button
    onClick={() => navigate('/facilities')}
    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider border border-slate-200 transition-all flex items-center gap-2"
    type="button"
  >
    <Building2 className="w-4 h-4 text-primary" />
    <span>Facilities</span>
  </button>

  <button
    onClick={() => navigate('/mess')}
    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider border border-slate-200 transition-all flex items-center gap-2"
    type="button"
  >
    <UtensilsCrossed className="w-4 h-4 text-primary" />
    <span>Mess Menu</span>
  </button>
</div>
          </div>

          {/* Right Building Showcase — Almost full screen height */}
          <div className="lg:col-span-7 relative flex items-stretch lg:pl-8">
            <div className="w-full rounded-2xl bg-slate-100 shadow-lg relative overflow-hidden border border-slate-200 group" style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}>
              
              {/* Building Image Showcase */}
              <div className="relative z-10 w-full h-full">
                {SLIDE_IMAGES.map((slide, index) => (
                  <img
                    key={slide.url}
                    src={slide.url}
                    alt={slide.title}
                    className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                      index === currentSlide ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'
                    }`}
                  />
                ))}
              </div>

              {/* Slider Controls */}
              <button
                onClick={() => setCurrentSlide(prev => (prev === 0 ? SLIDE_IMAGES.length - 1 : prev - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white backdrop-blur-md text-slate-800 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 z-20 border border-slate-200 shadow-md"
                aria-label="Previous Slide"
                type="button"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentSlide(prev => (prev + 1) % SLIDE_IMAGES.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white backdrop-blur-md text-slate-800 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 z-20 border border-slate-200 shadow-md"
                aria-label="Next Slide"
                type="button"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Slide Indicators */}
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-20">
                {SLIDE_IMAGES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`transition-all duration-300 ${
                      index === currentSlide ? 'bg-primary w-6 h-2 rounded-full' : 'bg-slate-300/80 hover:bg-slate-400 w-2 h-2 rounded-full'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                    type="button"
                  />
                ))}
              </div>

              {/* Building Branch Tag */}
              <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md text-slate-800 px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>{SLIDE_IMAGES[currentSlide].title}</span>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* 2. ABOUT US SECTION — Concise Left-Aligned Single Block */}
      <section className="space-y-4 text-left px-2">
        <div>
          <span className="text-xs font-black text-primary uppercase tracking-[0.25em] block mb-1">
            Quality Housing Partner
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-slate-900 tracking-wide uppercase">
            ABOUT US
          </h2>
        </div>

        <p className="text-slate-700 text-base sm:text-lg leading-[1.85] font-normal max-w-full">
          <strong>OM SAI LUXURY PGS</strong> is a premier off-campus student accommodation officially affiliated with <strong>BMS Institute of Technology & Management (BMSIT&M)</strong>, offering fully furnished twin and triple sharing rooms. We provide a wholesome 4-meal daily dining service prepared under strict hygiene standards, 24/7 CCTV surveillance, continuous 100kVA power backup, commercial RO-purified drinking water, daily housekeeping, and high-speed Wi-Fi on every floor. With full-time warden support from Mr. Raghu and Ms. Harika, our residents enjoy a safe, disciplined, and comfortable living environment just minutes from the BMSIT&M campus.
        </p>
      </section>

      {/* 3. APPLICATION OVERVIEW / ALLOCATION / APPLY NOW CONDITIONAL SECTION */}
      {!isLoggedIn ? (
        /* State 1: NOT LOGGED IN -> Show APPLY NOW CTA */
        <section className="bg-white border border-border p-6 sm:p-8 rounded-2xl shadow-soft flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-card transition-all">
          <div className="space-y-4 w-full md:w-auto">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Ready to Secure Your Accommodation?
            </h3>
            <div className="flex flex-wrap gap-2 sm:gap-3 text-xs font-bold text-slate-700">
              <span className="bg-blue-50 text-primary border border-blue-100 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" /> FCFS Allotment
              </span>
              <span className="bg-blue-50 text-primary border border-blue-100 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" /> Affiliated with BMSIT&M
              </span>
              <span className="bg-blue-50 text-primary border border-blue-100 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" /> Safe Environment
              </span>
              <span className="bg-blue-50 text-primary border border-blue-100 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Hygienic Accommodation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/apply')}
              className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md group whitespace-nowrap cursor-pointer"
              type="button"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </section>
      ) : (applicationState === 'room_allotted' || applicationState === 'paid') && hostel?.room && hostel.room !== '-' && hostel.room !== 'Unassigned' ? (
        /* State 2: LOGGED IN & BED ALLOTTED -> Show Exact Card from Image */
        <section className="bg-white border border-indigo-100 p-6 sm:p-8 rounded-3xl shadow-soft space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-4 flex-1 w-full">
              <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-50 pb-3">
                <Receipt className="w-4.5 h-4.5 text-indigo-600" />
                YOUR APPLICATION OVERVIEW & STATUS
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">STUDENT NAME</p>
                  <p className="font-extrabold text-slate-800 text-sm truncate">{student.name || 'Student'}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">USN</p>
                  <p className="font-extrabold text-slate-800 text-sm uppercase truncate">{student.usn || studentUsn || '-'}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">DEPARTMENT</p>
                  <p className="font-extrabold text-slate-800 text-sm truncate">{student.department || 'General'}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">CONTACT</p>
                  <p className="font-extrabold text-slate-800 text-sm truncate">{student.phone || '-'}</p>
                </div>
              </div>
            </div>

            <div className="shrink-0 self-start md:self-center">
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4.5 h-4.5 text-blue-600" />
                HOSTEL ROOM ALLOTTED
              </span>
            </div>
          </div>

          {/* Inner Room Allocation Box */}
          <div className="bg-[#f0f7ff] border border-blue-100 p-5 rounded-2xl space-y-2 text-xs shadow-xs">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5 mb-2">
              <span>🏢 ALLOCATED ROOM DETAILS</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 font-extrabold text-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Hostel</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{hostel?.hostel || 'OM SAI PG'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Block</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">{hostel?.block || 'Block A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Floor</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {hostel?.floor ? (String(hostel.floor).toLowerCase().includes('floor') ? hostel.floor : `Floor ${hostel.floor}`) : 'Floor 1'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Room No</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {hostel?.room ? (String(hostel.room).toLowerCase().includes('room') ? hostel.room : `Room ${hostel.room}`) : 'Room 101'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Bed No</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {hostel?.bed ? (String(hostel.bed).toLowerCase().includes('bed') ? hostel.bed : `Bed ${hostel.bed}`) : 'Bed 1'}
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* State 3: LOGGED IN & APPLICATION UNDER VERIFICATION */
        <section className="bg-white border border-indigo-100 p-6 sm:p-8 rounded-2xl shadow-soft relative overflow-hidden group space-y-5 animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-4 w-full md:w-auto flex-1">
              <h3 className="text-base font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-50 pb-3">
                <Receipt className="w-5 h-5 text-indigo-500" />
                Your Application Overview & Status
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm">
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Student Name</p>
                   <p className="font-bold text-slate-800 truncate">{student.name || '-'}</p>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">USN</p>
                   <p className="font-bold text-slate-800 uppercase truncate">{student.usn || studentUsn || '-'}</p>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                   <p className="font-bold text-slate-800 truncate">{student.department || '-'}</p>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Contact</p>
                   <p className="font-bold text-slate-800 truncate">{student.phone || '-'}</p>
                 </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm inline-flex">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                Application Under Verification
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 4. ALTERNATING FEATURE SECTIONS (Matching Reference Images with Overlapping Images) */}
      <section className="space-y-16 py-4">
        {PG_FEATURE_SECTIONS.map((feature, idx) => {
          const isEven = idx % 2 === 0;

          return (
            <div
              key={feature.id}
              className={`flex flex-col ${
                isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
              } items-center gap-10 lg:gap-14`}
            >
              {/* Text Side */}
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-650 leading-relaxed font-normal">
                  {feature.description}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => navigate(feature.route)}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-7 rounded-full text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2 group"
                    type="button"
                  >
                    <span>See More</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>

              {/* Stacked Overlapping Image Side */}
              <div className="flex-1 w-full max-w-lg lg:max-w-none">
                <div className="relative w-full aspect-[4/3]">
                  {/* Main Background Image */}
                  <div className={`w-[85%] h-[82%] overflow-hidden rounded-2xl shadow-lg border border-slate-200 ${!isEven ? 'ml-auto' : ''}`}>
                    <img
                      src={feature.mainImage}
                      alt={feature.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      style={feature.mainImageStyle}
                    />
                  </div>
                  {/* Overlapping Inset Secondary Image */}
                  <div className={`absolute bottom-0 ${isEven ? 'right-0' : 'left-0'} w-[58%] h-[58%] overflow-hidden rounded-2xl border-4 border-white shadow-2xl z-10`}>
                    <img
                      src={feature.subImage}
                      alt={feature.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      style={feature.subImageStyle}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 5. CONTACT ADMINISTRATION SECTION */}
      <section className="bg-white border border-border p-6 sm:p-8 rounded-2xl shadow-soft space-y-6">
        <div>
          <h3 className="text-lg font-black text-text uppercase tracking-wider">Contact Administration</h3>
          <p className="text-xs text-text-muted mt-1 uppercase font-semibold">Get in touch with OM SAI PG management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm font-semibold text-text">
          
          <div className="flex gap-3.5 items-start">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-primary shrink-0 border border-slate-200">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">PG Authorities</h4>
              <p className="text-slate-800 font-bold mt-1">Mr. Raghu (Owner / Management)</p>
              <p className="text-text-muted text-[11px] font-medium mt-0.5">Ms. Harika (Hostel Warden)</p>
            </div>
          </div>

          <div className="flex gap-3.5 items-start">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-primary shrink-0 border border-slate-200">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Contact Numbers</h4>
              <p className="text-slate-800 font-bold mt-1">+91 88616 60259 (Mr. Raghu)</p>
              <p className="text-text-muted text-[11px] font-medium mt-0.5">+91 99163 77391 (Ms. Harika - Warden)</p>
            </div>
          </div>

          <div className="flex gap-3.5 items-start">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-primary shrink-0 border border-slate-200">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Official Email</h4>
              <p className="text-slate-800 font-bold mt-1">admissions@omsailodge.com</p>
              <p className="text-text-muted text-[11px] font-medium mt-0.5">support@omsailodge.com</p>
            </div>
          </div>

        </div>
      </section>

      {/* 6. FIND US — Boys PG & Girls PG Locations Side by Side */}
      <section className="bg-white border border-border p-6 sm:p-8 rounded-2xl shadow-soft space-y-6">
        <div>
          <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
            Our Locations
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
            Find Us / Our Locations
          </h2>
          <p className="text-xs text-text-muted mt-1 font-medium">Conveniently located within walking distance of BMSIT&M campus.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Boys PG Map */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-primary border border-blue-200">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Boys PG</h4>
                <p className="text-[10px] text-text-muted font-semibold">Om Sai Luxury Boy PG Elite</p>
              </div>
            </div>
            <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-border shadow-inner relative">
              <iframe
                title="Boys PG Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.0!2d77.5645!3d13.1345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOm+sai+luxury+boy+pg+Elite!5e0!3m2!1sen!2sin!4v1720000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                className="-mt-14 h-[calc(100%+65px)] w-full"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <button
              onClick={() => window.open('https://maps.app.goo.gl/NL1b3J3YrqfUAZTg7', '_blank', 'noopener,noreferrer')}
              className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm group"
              type="button"
            >
              <span>Open in Google Maps</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Girls PG Map */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 border border-pink-200">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Girls PG</h4>
                <p className="text-[10px] text-text-muted font-semibold">Om Sai Luxury Ladies PG</p>
              </div>
            </div>
            <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-border shadow-inner relative">
              <iframe
                title="Girls PG Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.0!2d77.564!3d13.134!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOm+sai+luxury+ladies+PG!5e0!3m2!1sen!2sin!4v1720000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                className="-mt-14 h-[calc(100%+65px)] w-full"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <button
              onClick={() => window.open('https://maps.app.goo.gl/NQ9do2pSTdSCysLU8', '_blank', 'noopener,noreferrer')}
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm group"
              type="button"
            >
              <span>Open in Google Maps</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};