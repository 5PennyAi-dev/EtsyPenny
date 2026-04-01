import { DocPage, Section, Tip } from '@/components/docs/DocComponents';

export default function AnalyzingProductPage() {
  return (
    <DocPage
      title="Analyzing your product"
      subtitle="Teach the AI what you're selling"
    >
      <p>
        Before PennySEO can generate keywords, it needs to understand your product. The
        analysis step extracts visual details from your photo and classifies your product
        into the right category.
      </p>

      <Section title="Uploading your image">
        <p>
          In the SEO Studio, drag and drop a product photo into the upload area, or click
          to browse your files. You can use product mockups, lifestyle shots, or flat lays
          — any image that clearly shows what you're selling.
        </p>
        <p>
          Once your image is uploaded, click <strong>"Analyse Design"</strong> (1 token).
          The AI examines your photo and fills in six visual fields automatically:
          Aesthetic Style, Typography, Graphics, Color Palette, Target Audience, and
          Overall Vibe.
        </p>
        <p>
          These fields appear in the collapsible <strong>"AI Classification"</strong>{' '}
          section. You don't need to edit them — they're used behind the scenes to
          generate more relevant keywords. But if something looks off, you can adjust any
          field manually.
        </p>
        <Tip>
          The AI works best with images where the product is the main focus. If your photo
          has a busy background or multiple products, the analysis may be less accurate.
        </Tip>
      </Section>

      <Section title="Theme, Niche, and Sub-niche">
        <p>
          The AI also assigns a <strong>Theme</strong>, a <strong>Niche</strong>, and a{' '}
          <strong>Sub-niche</strong> to your product. These are important — they guide the
          entire keyword generation process.
        </p>
        <p>
          A <strong>Theme</strong> describes the visual aesthetic of your product — what it
          looks like. Examples: "Minimalist &amp; Clean", "Boho &amp; Organic", "Sarcastic
          &amp; Funny".
        </p>
        <p>
          A <strong>Niche</strong> describes the target buyer — who would buy it. Examples:
          "Home Décor Enthusiasts", "Pet Lovers", "Nursing &amp; Healthcare".
        </p>
        <p>
          A <strong>Sub-niche</strong> is a more specific segment within your niche — the
          kind of search phrase a real Etsy buyer would type. Examples: "Funny Nurse
          Gifts", "Rustic Farmhouse Signs", "Cat Mom Accessories".
        </p>
        <p>
          All three are selected from PennySEO's taxonomy. If the AI suggestion doesn't
          fit, pick a better match from the dropdown. You can also create your own custom
          themes and niches in <strong>Settings</strong>.
        </p>
        <Tip>
          Getting the Theme and Niche right matters more than any other field. A
          "Minimalist" mug and a "Vintage" mug will get very different keyword suggestions.
        </Tip>
      </Section>

      <Section title="Product Type">
        <p>
          Select your product type from the searchable dropdown — it's grouped by category
          (Apparel, Drinkware, Home Décor, etc.). If your product doesn't match anything
          in the list, type a custom name and select <strong>"Use as custom type"</strong>.
        </p>
        <p>
          Product Type is required before you can generate keywords. It's the most
          important context the AI uses to ensure keywords are relevant to what you're
          actually selling.
        </p>
        <p>
          If you imported your listing from Etsy, the product type is usually pre-filled
          based on your Etsy category.
        </p>
      </Section>

      <Section title="Description field">
        <p>
          The Description field is optional but helpful. Use it to tell the AI things it
          can't see in the photo: materials, dimensions, what makes your product special,
          who it's for, or how it's used.
        </p>
        <p>
          You don't need to write a polished description — short notes work fine. For
          example: "hand-stamped sterling silver, adjustable ring, gift for mom" gives the
          AI much more to work with than leaving it blank.
        </p>
        <Tip>
          Don't paste your existing Etsy description here. This field is for context notes
          that help the AI, not for marketing copy.
        </Tip>
      </Section>

      <Section title="What happens after analysis">
        <p>
          Once the analysis is complete, the <strong>"AI Classification"</strong> section
          expands to show your visual fields, Theme, and Niche. The{' '}
          <strong>"Generate SEO"</strong> button becomes available in the Keyword Research
          section below.
        </p>
        <p>
          Your analysis is saved automatically. If you come back later, everything will be
          right where you left it — including your image, product type, and all visual
          fields.
        </p>
        <p>
          If you want to re-analyze with a different image, simply upload a new one and
          click <strong>"Analyse Design"</strong> again (1 token).
        </p>
      </Section>
    </DocPage>
  );
}
