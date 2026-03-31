import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Check, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

// ─── Tags Diff Helper ────────────────────────────────────

function computeTagsDiff(originalTags = [], optimizedTags = []) {
  const origSet = new Set(originalTags.map(t => t.toLowerCase().trim()));
  const optSet = new Set(optimizedTags.map(t => t.toLowerCase().trim()));
  return {
    removed: originalTags.filter(t => !optSet.has(t.toLowerCase().trim())),
    added: optimizedTags.filter(t => !origSet.has(t.toLowerCase().trim())),
    unchanged: optimizedTags.filter(t => origSet.has(t.toLowerCase().trim())),
  };
}

// ─── Single Listing Field Card ───────────────────────────

function FieldCard({ field, label, info, checked, onToggle, children }) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    onToggle();
    setExpanded(prev => !prev);
  };

  return (
    <div
      className={`border rounded-lg transition-colors cursor-pointer ${
        checked ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3"
        onClick={handleClick}
      >
        {/* Checkbox */}
        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
          checked ? 'bg-indigo-600' : 'border-2 border-slate-300'
        }`}>
          {checked && <Check size={12} className="text-white" strokeWidth={3} />}
        </div>

        {/* Label + Info */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {info && <span className="text-xs text-slate-400 ml-2">{info}</span>}
        </div>

        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
        )}
      </div>

      {/* Expanded preview */}
      {expanded && children && (
        <div className="px-4 pb-3 border-t border-slate-100">
          <div className="pt-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tags Diff Preview ──────────────────────────────────

function TagsDiffPreview({ originalTags, optimizedTags }) {
  const diff = useMemo(() => computeTagsDiff(originalTags, optimizedTags), [originalTags, optimizedTags]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {diff.removed.map(tag => (
          <span key={`rm-${tag}`} className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 line-through">
            {tag}
          </span>
        ))}
        {diff.unchanged.map(tag => (
          <span key={`uc-${tag}`} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {tag}
          </span>
        ))}
        {diff.added.map(tag => (
          <span key={`ad-${tag}`} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {tag}
          </span>
        ))}
      </div>
      <div className="flex gap-3 text-[10px]">
        {diff.removed.length > 0 && <span className="text-rose-500">● {diff.removed.length} removed</span>}
        {diff.added.length > 0 && <span className="text-emerald-600">● {diff.added.length} new</span>}
        {diff.unchanged.length > 0 && <span className="text-slate-400">● {diff.unchanged.length} unchanged</span>}
      </div>
    </div>
  );
}

// ─── Text Diff Preview (Title / Description) ────────────

function TextDiffPreview({ before, after, maxHeight }) {
  return (
    <div className="space-y-2">
      {before && (
        <div>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Before</span>
          <p className={`text-xs text-slate-400 line-through mt-0.5 ${maxHeight || ''}`}>
            {before}
          </p>
        </div>
      )}
      <div>
        <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">After</span>
        <p className={`text-xs text-slate-700 bg-emerald-50 rounded px-2 py-1 mt-0.5 ${maxHeight || ''}`}>
          {after}
        </p>
      </div>
    </div>
  );
}

// ─── Batch Mode Pill ─────────────────────────────────────

function FieldPill({ label, active, override, onClick }) {
  let classes = 'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ';

  if (override === 'added') {
    classes += 'bg-amber-50 text-amber-700 border-amber-300';
  } else if (override === 'removed') {
    classes += 'bg-rose-50 text-rose-700 border-rose-300';
  } else if (active) {
    classes += 'bg-indigo-50 text-indigo-700 border-indigo-300';
  } else {
    classes += 'bg-transparent text-slate-500 border-slate-200';
  }

  return (
    <button className={classes} onClick={onClick}>
      {label}{active && !override ? ' ✓' : ''}{override ? ' ⚡' : ''}
    </button>
  );
}

// ─── Main Modal Component ────────────────────────────────

const ExportToEtsyModal = ({ isOpen, onClose, onSuccess, listings = [], user }) => {
  const isSingle = listings.length === 1;

  // Global defaults (batch mode)
  const [globals, setGlobals] = useState({ tags: true, title: true, description: false });

  // Per-listing field selection
  const [localFields, setLocalFields] = useState(() =>
    listings.map(() => ({ tags: true, title: true, description: false }))
  );

  const [isExporting, setIsExporting] = useState(false);

  // Single mode: expanded state for each field card
  const [expandedField, setExpandedField] = useState(null);

  if (!isOpen) return null;

  // ── Helpers ──────────────────────────────────────────

  const toggleSingleField = (field) => {
    setLocalFields(prev => {
      const next = [...prev];
      next[0] = { ...next[0], [field]: !next[0][field] };
      return next;
    });
  };

  const toggleGlobal = (field) => {
    const newVal = !globals[field];
    setGlobals(prev => ({ ...prev, [field]: newVal }));
    setLocalFields(prev => prev.map(lf => ({ ...lf, [field]: newVal })));
  };

  const toggleLocalField = (index, field) => {
    setLocalFields(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: !next[index][field] };
      return next;
    });
  };

  const getOverrideType = (index, field) => {
    const local = localFields[index]?.[field];
    const global = globals[field];
    if (local && !global) return 'added';
    if (!local && global) return 'removed';
    return null;
  };

  // ── Computed values ──────────────────────────────────

  const totalFieldCount = localFields.reduce((sum, lf) =>
    sum + (lf.tags ? 1 : 0) + (lf.title ? 1 : 0) + (lf.description ? 1 : 0), 0
  );

  const activeListingCount = localFields.filter(lf => lf.tags || lf.title || lf.description).length;

  const pushButtonText = isExporting
    ? 'Pushing...'
    : isSingle
      ? totalFieldCount === 0
        ? 'Select at least 1 field'
        : `Push ${totalFieldCount} field${totalFieldCount > 1 ? 's' : ''} to Etsy`
      : totalFieldCount === 0
        ? 'Select at least 1 field'
        : 'Push to Etsy';

  const summaryText = isSingle
    ? `Push ${totalFieldCount} field${totalFieldCount > 1 ? 's' : ''}`
    : `${totalFieldCount} field updates across ${activeListingCount} listing${activeListingCount > 1 ? 's' : ''}`;

  // ── Export handler ───────────────────────────────────

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const payload = {
        user_id: user?.id,
        listings: listings.map((listing, i) => ({
          etsy_listing_id: listing.etsy_listing_id,
          listing_id: listing.listing_id,
          fields: Object.entries(localFields[i])
            .filter(([, v]) => v)
            .map(([k]) => k),
        })).filter(item => item.fields.length > 0),
      };

      if (payload.listings.length === 0) {
        toast.error('Select at least one field to export');
        setIsExporting(false);
        return;
      }

      const { data } = await axios.post('/api/etsy/export-listings', payload);

      if (data.summary.errors === 0) {
        toast.success(`Successfully pushed to Etsy`);
        onSuccess?.();
      } else if (data.summary.success > 0) {
        toast.warning(`Pushed ${data.summary.success}/${data.summary.total} listings. ${data.summary.errors} failed — check and retry.`);
        onSuccess?.();
      } else {
        const firstError = data.results?.find(r => r.error)?.error || 'Unknown error';
        toast.error(`Failed to push to Etsy: ${firstError}`);
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Unknown error';
      toast.error(`Failed to push to Etsy: ${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Single Mode Content ──────────────────────────────

  const renderSingleMode = () => {
    const listing = listings[0];
    const fields = localFields[0];

    return (
      <div className="space-y-3">
        {/* Listing preview bar */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          {listing.image_url && (
            <img
              src={listing.image_url}
              alt=""
              className="w-10 h-10 rounded object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">
              {listing.display_title || listing.optimized_title || 'Untitled'}
            </p>
            <p className="text-xs text-slate-400">Etsy #{listing.etsy_listing_id}</p>
          </div>
        </div>

        {/* Tags field card */}
        <FieldCard
          field="tags"
          label="Tags"
          info={listing.optimized_tags?.length ? `${listing.optimized_tags.length} keywords` : null}
          checked={fields.tags}
          onToggle={() => toggleSingleField('tags')}
        >
          {listing.optimized_tags?.length > 0 && (
            <TagsDiffPreview
              originalTags={listing.tags}
              optimizedTags={listing.optimized_tags}
            />
          )}
        </FieldCard>

        {/* Title field card */}
        <FieldCard
          field="title"
          label="Title"
          info={listing.optimized_title ? `${listing.optimized_title.length}/140 chars` : null}
          checked={fields.title}
          onToggle={() => toggleSingleField('title')}
        >
          {listing.optimized_title && (
            <TextDiffPreview
              before={listing.title}
              after={listing.optimized_title}
            />
          )}
        </FieldCard>

        {/* Description field card */}
        <FieldCard
          field="description"
          label="Description"
          info={listing.optimized_description ? 'Updated' : null}
          checked={fields.description}
          onToggle={() => toggleSingleField('description')}
        >
          {listing.optimized_description && (
            <TextDiffPreview
              before={listing.description}
              after={listing.optimized_description}
              maxHeight="max-h-[80px] overflow-y-auto"
            />
          )}
        </FieldCard>
      </div>
    );
  };

  // ── Batch Mode Content ───────────────────────────────

  const renderBatchMode = () => {
    const fields = ['tags', 'title', 'description'];
    const fieldLabels = { tags: 'Tags', title: 'Title', description: 'Desc' };

    return (
      <div className="space-y-3">
        {/* Global default pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Fields:</span>
          {fields.map(f => (
            <FieldPill
              key={f}
              label={fieldLabels[f]}
              active={globals[f]}
              onClick={() => toggleGlobal(f)}
            />
          ))}
        </div>

        {/* Per-listing rows */}
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          {listings.map((listing, i) => (
            <div key={listing.etsy_listing_id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
              {listing.image_url && (
                <img src={listing.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
              )}
              <p className="text-xs text-slate-700 truncate flex-1 min-w-0">
                {listing.display_title || listing.optimized_title || 'Untitled'}
              </p>
              <div className="flex gap-1 flex-shrink-0">
                {fields.map(f => (
                  <FieldPill
                    key={f}
                    label={fieldLabels[f]}
                    active={localFields[i]?.[f]}
                    override={getOverrideType(i, f)}
                    onClick={() => toggleLocalField(i, f)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-[10px]">
          <span className="text-amber-600">⚡ added vs global</span>
          <span className="text-rose-600">⚡ removed vs global</span>
        </div>

        {/* Summary */}
        <p className="text-xs text-slate-500">{summaryText}</p>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 pb-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-[#F56400] text-white">
                <ExternalLink size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Push to Etsy</h3>
              </div>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                {listings.length} listing{listings.length > 1 ? 's' : ''}
              </span>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors ml-1">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 pb-3 max-h-[60vh] overflow-y-auto">
            {isSingle ? renderSingleMode() : renderBatchMode()}

            {/* Warning banner */}
            <div className="flex gap-3 p-3 mt-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                This will overwrite the selected fields on your live Etsy listing{listings.length > 1 ? 's' : ''}.
                Original values are saved for reference.
              </p>
            </div>
          </div>

          {/* Action bar */}
          <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">{summaryText}</p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={totalFieldCount === 0 || isExporting}
                className="px-5 py-2 text-sm bg-[#F56400] text-white font-medium rounded-lg hover:bg-[#E05A00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isExporting && <Loader2 size={14} className="animate-spin" />}
                {pushButtonText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ExportToEtsyModal;
