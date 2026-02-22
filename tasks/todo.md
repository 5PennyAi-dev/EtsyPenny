# Add Profitability Score to UI

## Objective
The user wants to display the new `listing_profit` field from `listings_global_eval` next to the COMPETITION score in the `AuditHeader` section. It should have the same color coding logic and an appropriate `$` icon.

## Proposed Changes
1. **`ResultsDisplay.jsx`**
   - [x] Import `DollarSign` from `lucide-react`.
   - [x] Add `listingProfit` to the destructured props of `AuditHeader`.
   - [x] Add a 5th pillar for "Profitability" next to Competition:
     ```jsx
     {/* Pillar 5: Profitability */}
     <div className="flex-1 p-5 md:py-4 md:px-6 hover:bg-slate-50 transition-colors flex flex-col justify-center">
         <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={14} className="text-slate-400" /> Profitability
              </span>
              <span className={`text-2xl font-black ${profitTier.text}`}>{listingProfit || 0}</span>
         </div>
         <MiniGauge value={listingProfit} tier={profitTier} />
     </div>
     ```
   - [x] Pass `listingProfit={results?.listing_profit}` to `<AuditHeader />`.

2. **`ProductStudio.jsx`**
   - [x] Parse `listing_profit` from n8n webhooks in `handleGenerateInsight` and `handleRecalculateScores`.
   - [x] Add `listing_profit` to the database payloads so it is saved locally.
   - [x] Map `listing_profit` when hydrating the local UI state `results`:
     ```javascript
     listing_profit: activeEvalData?.listing_profit ?? listing.listing_profit,
     ```
   
## Verification
- [x] Test by loading a listing or recalculating scores. 
- [x] Verify the Profitability pillar is displayed.
- [x] Verify color coding is identical.
- [x] Verify the `listing_profit` updates correctly locally and in the database.
