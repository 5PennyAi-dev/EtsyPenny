# Tasks: Add Keywords to Existing Presets

## 1. UI updates: `PresetRow` Toolbar
- [x] Add a `Plus` icon next to the preset's `Trash2` (Delete) button inside the `PresetRow` component.
- [x] Ensure it has a tooltip "Add Keywords to Preset" and distinct hover styling (perhaps Indigo).
- [x] When clicked, this button should fire an `onEditKeywords(preset)` callback.

## 2. Modal Component: `EditPresetKeywordsModal`
- [x] Create a new modal component focused strictly on keyword selection (reusing the search/grid logic from `CreatePresetModal` but without the Title/Theme text inputs).
- [x] Provide it with the `initialSelectedIds` from the target preset.
- [x] Enforce the same 10-keyword maximum limit.
- [x] Include "Cancel" and "Save Changes" buttons.

## 3. Logic & State Integration in `SEOLab.jsx`
- [x] Add state: `[editingPresetKeywords, setEditingPresetKeywords] = useState(null)` to track which preset is currently having its keywords edited.
- [x] Create `handleSavePresetKeywords(presetId, newKeywordIds)` to `.update()` the `keyword_presets` row in Supabase.
- [x] Optimistically update the UI upon success, close the modal, and trigger a success toast.
- [x] Pass the necessary props down and render `<EditPresetKeywordsModal />` at the page root.
