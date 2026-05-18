const en = {
  nav: {
    browse: 'Browse',
    yourWorks: 'Your works',
    newListing: 'New listing',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    language: 'Language',
    settings: 'Settings',
  },
  home: {
    eyebrow: 'Vol. I · Negotiated commerce',
    headline_pre: 'Every listing carries ',
    headline_accent: 'an agent',
    headline_post: ' that argues for you.',
    body: "Posters, paintings, photography. Chat with the seller's LLM directly — or dispatch your own and watch the two negotiate. Every offer is anchored by comparable sales from the room next door.",
    cta_browse: 'Enter the gallery',
    cta_signup: 'Open an account →',
    cta_list: 'List a work →',
    nowOnView: 'Now on view',
    liveListings: 'live listings',
    categories: 'Categories',
    anchorData: 'Anchor data',
    turnCap: 'Turn cap',
    pullquote:
      "You don't know how to haggle, but you can let an agent do it — and watch it argue with another agent.",
    section_browse_title: 'Browse the gallery',
    section_browse_body:
      'Posters, paintings, photography — filtered by category, anchored by recent comparable sales.',
    section_nego_title: 'Open a negotiation',
    section_nego_body:
      'Type your counter, or set a target / ceiling and dispatch a buyer agent. Anti-cheese rules keep both sides honest.',
    section_watch_title: 'Watch them converge',
    section_watch_body:
      'Two streams, one progress bar. The negotiation ends in accept, reject, stall — or a system mediation at the median.',
    footer_credit: 'art-bargain · technical demonstration · 2026',
    footer_stack: 'Claude Sonnet 4.6 · Supabase · Next.js 16',
  },
  browse: {
    eyebrow_open: 'Open call',
    eyebrow_filtered: (cat: string) => `Category — ${cat}`,
    title: 'Browse',
    intro:
      'Every listing carries an agent. Open one to negotiate — chat directly or dispatch your own.',
    filter_all: 'All',
    just_listed_eyebrow: 'On view',
    just_listed_title: 'Just listed',
    just_listed_count: (n: number) => `${n} ${n === 1 ? 'work' : 'works'}`,
    all_works_eyebrow: 'Catalogue',
    all_works_title: 'All works',
    archive_eyebrow: 'Data ⌁ anchors',
    archive_title: 'The archive',
    archive_count: (n: number) => `${n} comparable sales`,
    archive_subtitle:
      'What our agents reference when negotiating. Recent sold prices used as evidence in every reply.',
    empty_filtered: (cat: string) => `No live works in ${cat}`,
    empty_all: 'No live works yet',
    empty_body_filtered:
      'Try another category — or scroll down to see the archive of recent comparable sales.',
    empty_body_all:
      'New listings appear here. Scroll down to see the archive of comparable sales our agents reference.',
  },
};

export default en;
