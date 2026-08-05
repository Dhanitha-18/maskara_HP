import React, { useState, useEffect, useMemo } from 'react';
import { usePayment } from '../../context/PaymentContext';
import { useAuth } from '../../context/AuthContext';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { FEEDBACK_HERO_IMAGE } from '../../assets/heroBanners';
import { 
  CheckCircle2, 
  Send, 
  Sparkles,
  AlertCircle,
  Lock,
  ExternalLink
} from 'lucide-react';

const isValidGoogleUrl = (raw: string): boolean => {
  if (!raw || !raw.trim()) return false;
  const u = raw.trim();
  if (u.includes('Cjjjj') || u.includes('-default') || u.includes('1FAIpQLSeGj_HFh1FvceJCVuQhY7L4dY74CjjjjHccehN69MDOg6-Egw')) {
    return false;
  }
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Convert any Google Form URL to the proper embeddable format.
 * Handles:
 *   - /viewform -> /viewform?embedded=true
 *   - already has ?embedded=true -> no change
 *   - raw form URL without /viewform -> append /viewform?embedded=true
 */
const toEmbedUrl = (raw: string): string => {
  if (!isValidGoogleUrl(raw)) return '';
  let url = raw.trim().replace(/\/+$/, '');
  if (url.includes('embedded=true')) return url;
  if (url.includes('/viewform')) {
    return url.includes('?') ? `${url}&embedded=true` : `${url}?embedded=true`;
  }
  if (url.includes('docs.google.com/forms')) {
    return `${url}/viewform?embedded=true`;
  }
  return url;
};

/** Extract the original (non-embedded) form URL for "Open in New Tab" */
const toDirectUrl = (raw: string): string => {
  if (!isValidGoogleUrl(raw)) return '';
  let url = raw.trim().replace(/\/+$/, '');
  url = url.replace(/[?&]embedded=true/, '').replace(/[?&]$/, '');
  if (!url.includes('/viewform') && url.includes('docs.google.com/forms')) {
    url = `${url}/viewform`;
  }
  return url;
};

export const Feedback: React.FC = () => {
  const { student } = usePayment();
  const { studentName: authName, studentUsn: authUsn } = useAuth();

  const [formConfig, setFormConfig] = useState<{ googleFormUrl: string; enabled: boolean }>({
    googleFormUrl: '',
    enabled: true
  });

  const [hasResponded, setHasResponded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const studentName = student.name || authName || 'Student';
  const studentUsn = student.usn || authUsn || '1BM22CS001';

  // Compute embed & direct URLs from admin-provided URL
  const embedUrl = useMemo(() => toEmbedUrl(formConfig.googleFormUrl), [formConfig.googleFormUrl]);
  const directUrl = useMemo(() => toDirectUrl(formConfig.googleFormUrl), [formConfig.googleFormUrl]);

  // Fetch Google Form config from Admin backend
  useEffect(() => {
    fetch('http://localhost:5000/api/feedback/config')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setFormConfig({
            googleFormUrl: data.googleFormUrl || '',
            enabled: data.enabled !== false
          });
        }
      })
      .catch(() => {});

    // Check if student already responded in localStorage
    const saved = localStorage.getItem(`feedback_responded_${studentUsn}`);
    if (saved === 'true') {
      setHasResponded(true);
    }
  }, [studentUsn]);

  const handleConfirmResponse = async () => {
    setIsSubmitting(true);
    try {
      await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          usn: studentUsn,
          rating: 5,
          message: 'Google Form feedback submitted'
        })
      });

      localStorage.setItem(`feedback_responded_${studentUsn}`, 'true');
      setHasResponded(true);
      setIsSuccessToast(true);
    } catch {
      alert('Failed to record feedback status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans pb-16">
      
      {/* Toast Alert */}
      {isSuccessToast && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between text-xs font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>Thank you! Your feedback submission has been recorded in the Admin Portal.</span>
          </div>
          <button onClick={() => setIsSuccessToast(false)} className="text-white hover:opacity-80">✕</button>
        </div>
      )}

      {/* Hero Banner */}
      <HeroBanner 
        image={FEEDBACK_HERO_IMAGE} 
        title="Monthly Student Feedback Form" 
        subtitle="Share your hostel experience directly with administration." 
      />

      {/* Main Container */}
      {!formConfig.enabled ? (
        /* Disabled State */
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-md text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800">Feedback Form Currently Disabled</h3>
          <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-md mx-auto">
            The monthly feedback collection form is currently turned off by hostel administration. It will open when the warden activates the schedule.
          </p>
        </div>
      ) : (
        /* Enabled State: Embed Google Form */
        <div className="bg-white border border-border rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Hostel Feedback Form
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Complete the official feedback form below and click confirm to submit.
              </p>
            </div>

            {hasResponded && (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Feedback Response Recorded
              </span>
            )}
          </div>

          {/* Open in New Tab Button - Always visible when URL is configured */}
          {directUrl && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-indigo-900">
                  Having trouble viewing the form below? Open it directly in a new tab.
                </p>
                <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                  If the embedded form shows an error or blank page, use the button to open the Google Form in a new window.
                </p>
              </div>
              <a
                href={directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                Open Google Form in New Tab
              </a>
            </div>
          )}

          {/* Embedded Google Form Container */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner min-h-[600px] relative">
            {embedUrl ? (
              <>
                {iframeError && (
                  <div className="absolute inset-0 z-10 bg-white/95 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-amber-500" />
                    <h4 className="text-sm font-black text-slate-800">Unable to load the form in this window</h4>
                    <p className="text-xs text-slate-600 font-semibold max-w-md">
                      This Google Form may require sign-in or has restrictions that prevent it from loading inside the portal. Please use the button above to open the form directly.
                    </p>
                    <a
                      href={directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Google Form in New Tab
                    </a>
                  </div>
                )}
                <iframe
                  src={embedUrl}
                  title="Student Feedback Google Form"
                  className="w-full h-[650px] border-0"
                  onError={() => setIframeError(true)}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                />
              </>
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="font-bold text-xs">No Google Form URL configured by Admin yet.</p>
              </div>
            )}
          </div>

          {/* Confirm Submission Action Bar */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black text-slate-800">Done responding to the form?</h4>
              <p className="text-[11px] text-slate-500 font-semibold">
                Clicking confirm records your feedback status in the Admin Portal under Student Controls.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConfirmResponse}
              disabled={isSubmitting || hasResponded}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{hasResponded ? 'Response Recorded ✓' : isSubmitting ? 'Recording...' : 'Confirm Feedback Submitted'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};