import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'supabase/functions/save-seo/index.ts'), 'utf8');

describe('save-seo explicit proposal preservation', () => {
  it('does not delete an explicitly saved Studio tag proposal during automatic scoring refresh', () => {
    expect(source).toContain(".eq('is_proposal_selected', false)");
    expect(source).toContain(".or('is_user_added.is.null,is_user_added.eq.false')");
  });
});
