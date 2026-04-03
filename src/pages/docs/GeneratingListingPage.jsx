import { DocPage, Section, Tip, DocImage, DocLink } from '@/components/docs/DocComponents';

export default function GeneratingListingPage() {
  return (
    <DocPage
      title="Generating your listing"
      subtitle="Turn your keywords into a ready-to-use Etsy listing"
    >
      <p>
        Once you've <DocLink to="/docs/studio/keywords">selected your 13 keywords</DocLink>, PennySEO writes a complete Etsy listing
        for you — an optimized title and a compelling description that naturally weave in
        your selected tags.
      </p>

      <Section title="Generating the draft">
        <p>
          In the Listing Editor section (Section 3), click <strong>"Optimize with AI"</strong>{' '}
          (1 token). PennySEO builds an SEO brief from your selected keywords — including
          their search volume, badges, and relevance scores — and generates a title and
          description tailored to your product.
        </p>
        <p>
          The AI uses your product context as its primary source: visual analysis, product
          type, theme, niche, and any description notes you provided. If you've set up a
          Shop Profile with your brand name, tone, and signature, those are incorporated
          into the sign-off.
        </p>
        <p>
          Each generation produces a slightly different result. If you're not happy with
          the output, click <strong>"Optimize with AI"</strong> again (1 token) for a fresh
          version.
        </p>
      </Section>

      <Section title="The title">
        <p>
          Your generated title is optimized for Etsy search. A quality bar below the title
          shows its length: green (120+ characters) means you're using the space well,
          amber (80–119) is acceptable, and red (under 80) means you're leaving SEO value
          on the table.
        </p>
        <p>
          Etsy titles can be up to 140 characters. Word order doesn't matter for Etsy
          search — the algorithm matches individual words regardless of position. So a
          title like "Funny Cat Mug - Personalized Gift for Cat Mom - Ceramic Coffee Cup"
          works just as well as arranging those same words differently.
        </p>
        <DocImage
          src="/docs/listing-editor.png"
          alt="Listing Editor showing a generated title with quality bar, generated description, and copy buttons"
          caption="The Listing Editor with a generated title and description ready to copy"
        />
        <Tip>
          Don't worry about making the title sound like a natural sentence. On Etsy,
          titles are keyword containers separated by dashes. Buyers scan them, they don't
          read them like prose.
        </Tip>
      </Section>

      <Section title="The description">
        <p>
          Your generated description is written for human readers first, SEO second. It
          highlights what makes your product special, who it's for, and why someone should
          buy it — while naturally incorporating your selected keywords.
        </p>
        <p>
          The description stays concise (150–200 words) and avoids generic filler phrases.
          If you provided a Shop Profile with a signature line, it appears at the end.
        </p>
      </Section>

      <Section title="Etsy Search Preview">
        <p>
          Below the title and description, a mini preview card shows how your listing will
          appear in Etsy search results — with your product thumbnail and the generated
          title. This gives you a quick visual check before copying anything over.
        </p>
        <DocImage
          src="/docs/listing-etsy-preview.png"
          alt="Mini Etsy search preview card showing product thumbnail and generated title"
          caption="See how your listing will look in Etsy search results"
        />
      </Section>

      <Section title="Copying to Etsy">
        <p>
          Each field has a copy button: title, description, and tags. Click any of them to
          copy the content to your clipboard, then paste directly into your Etsy listing
          editor.
        </p>
        <p>
          Tags are copied as a comma-separated list, ready to paste into Etsy's tag
          fields.
        </p>
        <Tip>
          After pasting, save your listing in the Etsy editor and check it in search after
          a few hours. Etsy's search index updates periodically — give it time before
          judging your ranking.
        </Tip>
      </Section>

      <Section title="Saving your listing">
        <p>
          Click <strong>"Save listing"</strong> to persist your generated title,
          description, and keyword selection. Your listing moves to the "Complete" status
          and appears on your Dashboard and in your listing history.
        </p>
        <p>
          You can always come back to any saved listing from the Dashboard, History, or
          SEO Listings page to review, regenerate, or adjust keywords.
        </p>
      </Section>
    </DocPage>
  );
}
