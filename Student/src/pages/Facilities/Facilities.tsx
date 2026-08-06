import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { FACILITIES_HERO_IMAGE } from '../../assets/heroBanners';
import { 
  Wifi, 
  WashingMachine,
  LucideFilter,
  Power,
  LucideCylinder,
  CctvIcon,
  SportShoe,
  BrushCleaningIcon,
  FireExtinguisher,
  ShirtIcon,
  BathIcon,
  ArrowUpDownIcon,
  X,
  Building2
} from 'lucide-react';

const PG_FACILITIES = [
  { 
    name: 'High-Speed Wi-Fi', 
    desc: 'Commercial gigabit bandwidth across all lounge and study areas.', 
    icon: Wifi,
    image: "/facilities/wifib.jpeg"
  },
  { 
    name: 'Laundry Services', 
    desc: 'Washing machines and professional dry cleaning schedules twice a week.', 
    icon: WashingMachine,
    image: "/facilities/washingmachine.jpeg"
  },
  { 
    name: 'RO Purified Water', 
    desc: 'Continuous RO water dispensers on every floor checked for TDS levels.', 
    icon: LucideFilter,
    image: "/facilities/rowater.jpeg"
  },
  { 
    name: 'Power Backup', 
    desc: 'Silent diesel generator backup ensuring 24/7 electricity coverage.', 
    icon: Power,
    image: "/facilities/power.jpeg"
  },
  { 
    name: 'Biometric Security', 
    desc: 'Secure biometric fingerprint access points on main entry gates.', 
    icon: LucideCylinder,
    image: "/facilities/tanker.jpeg"
  },
  { 
    name: 'CCTV Surveillance', 
    desc: '60+ CCTV high definition cameras covering lobbies, corridors, and perimeters.', 
    icon: CctvIcon,
    image: "/facilities/cctv.jpeg"
  },
  { 
    name: 'Two-Wheeler Parking', 
    desc: 'Dedicated basement parking spots with security guard patrols.', 
    icon: SportShoe,
    image: "/facilities/shoerack.jpeg"
  },
  { 
    name: 'Daily Housekeeping', 
    desc: 'Professional sweeping and garbage disposal in all rooms every morning.', 
    icon: BrushCleaningIcon,
    image: "/facilities/cleaning2.jpeg"
  },
  { 
    name: 'Indoor Games Arena', 
    desc: 'Table tennis, carrom boards, and chess in the recreation lounge.', 
    icon: FireExtinguisher,
    image: "/facilities/FireExtinguisher.jpeg"
  },
  { 
    name: 'Quiet Study Area', 
    desc: 'Separate soundproof cabins equipped with desk lights and ports.', 
    icon: ShirtIcon,
    image: "/facilities/dryarea.jpeg"
  },
  { 
    name: 'Hot Water Supply', 
    desc: 'Solar heaters backed by instant geysers in all restrooms.', 
    icon: BathIcon,
    image: "/facilities/tanker.jpeg"
  },
  { 
    name: 'Modern Lift Access', 
    desc: 'Reliable 8-passenger automatic elevator with ARD safety triggers.', 
    icon: ArrowUpDownIcon,
    image: "/facilities/lift.jpeg"
  }
];

interface AdminFacility {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
}

export const Facilities: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<string[] | null>(null);
  const [adminFacilities, setAdminFacilities] = useState<AdminFacility[]>([]);

  // Fetch admin-managed facilities from backend with auto-refresh & socket sync
  useEffect(() => {
    let active = true;
    const fetchFacilities = () => {
      fetch('http://localhost:5000/api/facilities', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (active && Array.isArray(data)) {
            setAdminFacilities(data);
          }
        })
        .catch(() => {});
    };
    fetchFacilities();

    const socket = io('http://localhost:5000');
    socket.on('facilities_updated', fetchFacilities);
    socket.on('data_updated', fetchFacilities);

    return () => { 
      active = false; 
      socket.off('facilities_updated', fetchFacilities);
      socket.off('data_updated', fetchFacilities);
      socket.disconnect();
    };
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <HeroBanner 
        image={FACILITIES_HERO_IMAGE}
        title="Hostel Facilities & Services"
      />

      {/* All Facilities in One Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-black text-text uppercase tracking-wider">Explore Services</h3>
          <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed font-semibold">Premium services bundled in your hostel fee components.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Display facilities fetched from MySQL database */}
          {(adminFacilities.length > 0 ? adminFacilities : PG_FACILITIES.map((f, i) => ({ id: `default-${i}`, title: f.name, description: f.desc, imageUrl: f.image }))).map((facility: any) => {
            const imageSrc = facility.imageUrl || facility.image || '';
            const fullImageSrc = imageSrc.startsWith('http') || imageSrc.startsWith('/') ? imageSrc : `http://localhost:5000${imageSrc}`;
            const title = facility.title || facility.name;
            const desc = facility.description || facility.desc;

            return (
              <div 
                key={facility.id || title} 
                onClick={() => fullImageSrc ? setSelectedImages([fullImageSrc]) : null}
                className="relative aspect-[3.2/3.3] rounded-2xl overflow-hidden shadow-soft border border-border group cursor-pointer"
              >
                {fullImageSrc ? (
                  <img 
                    src={fullImageSrc}
                    alt={title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-indigo-300" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col justify-end p-5 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0">
                  <div className="text-white space-y-1">
                    <h4 className="text-sm font-black tracking-wide uppercase text-primary-light">{title}</h4>
                    <p className="text-xs text-slate-200 font-semibold leading-relaxed">{desc}</p>
                    {fullImageSrc && (
                      <span className="text-[10px] text-slate-400 font-bold block pt-1.5 uppercase tracking-wider">Click to view full image &rarr;</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImages && (
        <div 
          className="fixed inset-0 bg-slate-900/15 backdrop-blur-xl z-50 flex items-center justify-center p-4 sm:p-6 no-print"
          onClick={() => setSelectedImages(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center">
            <div className="relative inline-block overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xl bg-white/60 backdrop-blur-md">
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedImages(null); }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-all hover:scale-110 z-50 border border-slate-200"
                aria-label="Close"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
              <img 
                src={selectedImages[0]} 
                alt="Facility View" 
                className="max-w-full max-h-[78vh] object-contain rounded-2xl block"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
