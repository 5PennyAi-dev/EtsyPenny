import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

const Accordion = ({ 
    title, 
    children, 
    headerActions, 
    defaultOpen = true,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={clsx("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
            {/* Header */}
            <div 
                className={clsx(
                    "px-6 py-4 bg-slate-50/50 flex justify-between items-center cursor-pointer transition-colors hover:bg-slate-100/80",
                    !isOpen && "border-b-0",
                    isOpen && "border-b border-slate-100"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 flex-1">
                    {typeof title === 'string' ? (
                        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                    ) : (
                        title // Allow passing complex React nodes as title
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Header Actions - Disabled when collapsed */}
                    {headerActions && (
                        <div 
                            className={clsx(
                                "flex items-center gap-4 transition-opacity duration-200",
                                !isOpen && "opacity-50 pointer-events-none grayscale"
                            )}
                            onClick={(e) => e.stopPropagation()} // Prevent accordion toggle when clicking actions
                        >
                            {headerActions}
                        </div>
                    )}

                    {/* Chevron Toggle */}
                    <div className="text-slate-400">
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div>
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Accordion;
