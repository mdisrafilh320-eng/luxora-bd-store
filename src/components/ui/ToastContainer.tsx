import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, language } = useApp();

  return (
    <div 
      id="luxora-toast-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const title = language === 'bn' ? toast.titleBn : toast.titleEn;
          const desc = language === 'bn' ? toast.descriptionBn : toast.descriptionEn;

          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />,
            info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
            warning: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
            error: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto bg-[#141418] border border-[#D4AF37]/30 text-[#EDEDED] p-4 rounded-sm shadow-xl shadow-black/60 flex items-start gap-3 backdrop-blur-md relative overflow-hidden"
            >
              {/* Subtle top gold accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-75" />

              <div className="mt-0.5">{icons[toast.type]}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-[#EDEDED] tracking-wide font-sans">{title}</h4>
                {desc && <p className="text-xs text-[#A0A0AA] mt-0.5 leading-relaxed font-sans">{desc}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#7A7A85] hover:text-[#EDEDED] p-1 rounded transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
