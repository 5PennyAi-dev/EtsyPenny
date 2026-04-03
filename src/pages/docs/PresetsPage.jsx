import { DocPage, Section, Tip, DefList, DocImage, DocLink } from '@/components/docs/DocComponents';
import { ArrowRight } from 'lucide-react';

const createSteps = [
  {
    term: 'Name your preset',
    description:
      'Give it a descriptive name. Duplicate names are blocked to avoid confusion.',
  },
  {
    term: 'Set context',
    description:
      'Optionally assign a Theme, Niche, and Sub-niche using the dropdown menus. This helps you organize presets by category later.',
  },
  {
    term: 'Select keywords',
    description:
      'Browse your Favorite Tags bank and check the keywords you want to include (maximum 10). Use the search bar and filter pills (All, Gems, High Volume, Low Competition) to find the right keywords quickly.',
  },
];

const manageActions = [
  {
    term: 'Remove a keyword',
    description:
      'Click the trash icon on any keyword pill to remove it from the preset. Aggregate stats update instantly.',
  },
  {
    term: 'Add keywords',
    description:
      'Click the plus button to open a keyword picker and add more keywords from your bank (up to the 10-keyword limit).',
  },
  {
    term: 'Edit details',
    description:
      "Inline-edit the preset's name, theme, niche, or sub-niche directly in the table.",
  },
];

export default function PresetsPage() {
  return (
    <DocPage
      title="Presets"
      subtitle="Create reusable keyword strategies"
    >
      <p>
        Presets let you bundle up to 10 keywords from your{' '}
        <DocLink to="/docs/lab/favorites">Favorite Tags</DocLink> into a named group that you can apply to
        any listing with one click. Think of them as keyword recipes — a "Funny Nurse
        Gifts" preset, a "Minimalist Home Décor" preset, a "Holiday Gift Guide" preset —
        ready to deploy whenever you need them.
      </p>

      <Section title="Creating a preset">
        <p>
          Click <strong>"Create Preset"</strong> at the top of the Presets tab. A modal
          opens where you can:
        </p>
        <DefList items={createSteps} icon={ArrowRight} />
        <p>
          A live summary bar at the bottom shows the aggregate stats of your selection:
          average volume, average competition, and average CPC — so you can gauge the
          strength of your preset before saving.
        </p>
        <DocImage
          src="/docs/seolab-create-preset.png"
          alt="Create Preset modal with keyword selection, filter pills, and live summary stats"
          caption="Creating a preset — select keywords and see live aggregate stats"
        />
        <Tip>
          Etsy allows 13 tags per listing. Presets cap at 10 to leave room for
          listing-specific keywords that make each product unique.
        </Tip>
      </Section>

      <Section title="Managing presets">
        <p>
          The Presets table shows each preset with sortable columns: name, keyword count,
          total volume, average competition, and average CPC.
        </p>
        <p>
          Click any preset row to expand it and see the individual keywords inside,
          displayed as styled pills. From the expanded view you can:
        </p>
        <DefList items={manageActions} icon={ArrowRight} />
        <DocImage
          src="/docs/seolab-presets-table.png"
          alt="Presets table with an expanded preset showing keyword pills and aggregate stats"
          caption="A preset expanded to show its keywords and aggregate stats"
        />
      </Section>

      <Section title="Applying a preset to a listing">
        <p>
          Click <strong>"Apply to Listing"</strong> on any preset row. A modal shows your
          existing listings with their thumbnails, titles, scores, and statuses. Select a
          listing and confirm — the preset's keywords are added to that listing's keyword
          pool.
        </p>
        <p>
          Applied keywords go through the scoring pipeline (niche + transactional scoring)
          against the target listing's context, so scores may differ from what you see in
          the SEO Lab.
        </p>
        <p>
          You can also apply presets from within the SEO Studio. In the{' '}
          <DocLink to="/docs/studio/keywords">Keyword Performance table</DocLink>, click the star icon in the header to open the Favorites picker, switch to
          the <strong>Presets</strong> tab, and select a preset. Its keywords are added
          directly to your current listing.
        </p>
      </Section>

      <Section title="Creating presets from the Studio">
        <p>
          You don't have to build presets in the SEO Lab. While working on a listing in the
          SEO Studio, click <strong>"Save as Preset"</strong> in the Keyword Performance
          table header. Your currently selected keywords become the preset's starting pool
          — the top 10 by volume are pre-selected. The listing's theme, niche, and
          sub-niche are pre-filled as context.
        </p>
        <p>
          Keywords that aren't already in your Favorite Tags bank are automatically saved
          there when the preset is created.
        </p>
        <Tip>
          After optimizing a listing that performs well, save its keywords as a preset. You
          can then apply that winning strategy to similar products instantly.
        </Tip>
      </Section>
    </DocPage>
  );
}
