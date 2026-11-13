import React, { useEffect } from 'react';
import { RotateCcw, ShieldCheck, X, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ReturnPolicyModal: React.FC = () => {
  const {
    isReturnPolicyModalOpen,
    setIsReturnPolicyModalOpen,
    returnPolicy,
    language,
    setActiveView,
  } = useApp();

  useEffect(() => {
    if (!isReturnPolicyModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsReturnPolicyModalOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isReturnPolicyModalOpen, setIsReturnPolicyModalOpen]);

  if (!isReturnPolicyModalOpen) return null;

  const title = language === 'bn' ? (returnPolicy.titleBn || returnPolicy.titleEn) : (returnPolicy.titleEn || returnPolicy.titleBn);
  const summary = language === 'bn' ? (returnPolicy.summaryBn || returnPolicy.summaryEn) : (returnPolicy.summaryEn || returnPolicy.summaryBn);
  const steps = language === 'bn'
    ? (returnPolicy.stepsBn?.length ? returnPolicy.stepsBn : returnPolicy.stepsEn)
    : (returnPolicy.stepsEn?.length ? returnPolicy.stepsEn : returnPolicy.stepsBn);
  const eligibilityNotes = language === 'bn'
    ? (returnPolicy.eligibilityNotesBn || returnPolicy.eligibilityNotesEn)
    : (returnPolicy.eligibilityNotesEn || returnPolicy.eligibilityNotesBn);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-policy-modal-title"
      onClick={() => setIsReturnPolicyModalOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#111217] border border-[#262632] rounded-2xl shadow-2xl p-5 sm:p-8 space-y-5 sm:space-y-6 my-4 sm:my-8 text-[#F3F4F6] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#1E1E26] pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                LUXORA BD PROTECTION
              </span>
              <h2 id="return-policy-modal-title" className="text-lg sm:text-xl font-semibold text-white">
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsReturnPolicyModalOpen(false)}
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close return policy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Overview */}
        <div className="p-4 rounded-xl bg-[#16171E] border border-[#22232D] text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
          {summary}
        </div>

        {/* Step-by-step Instructions */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37] font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{language === 'bn' ? 'ধাপে ধাপে রিটার্ন নির্দেশনা' : 'Step-by-Step Return Instructions'}</span>
          </h3>

          <ol className="space-y-2.5">
            {steps.map((step, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#0D0E12] border border-[#1E1E26] text-xs sm:text-sm text-neutral-300 leading-relaxed"
              >
                <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono tabular-nums">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Eligibility Notes */}
        {eligibilityNotes && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{eligibilityNotes}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#1E1E26] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{language === 'bn' ? 'অফিসিয়াল সাপোর্ট: ০১৮৭১-৬৯৩০৫০' : 'Hotline: 01871-693050'}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setIsReturnPolicyModalOpen(false);
                setActiveView('support');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-xl border border-white/15 hover:border-[#D4AF37]/50 text-neutral-200 hover:text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{language === 'bn' ? 'সহায়তা কেন্দ্র' : 'Contact Support'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReturnPolicyModalOpen(false)}
              className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'বুঝেছি' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
