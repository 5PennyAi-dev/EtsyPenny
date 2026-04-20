import { HELP_CORPUS, HELP_CORPUS_META } from './corpus-data.js';

/** Returns the grounding corpus string used as systemInstruction for the chatbot. */
export function getHelpCorpus(): string {
  return HELP_CORPUS;
}

/** Diagnostics: article count, total char length, build timestamp. */
export function getCorpusMetadata() {
  return {
    articleCount: HELP_CORPUS_META.articleCount,
    totalChars: HELP_CORPUS_META.totalChars,
    builtAt: HELP_CORPUS_META.builtAt,
  };
}
