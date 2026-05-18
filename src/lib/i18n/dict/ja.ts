import type en from './en';

const ja: typeof en = {
  nav: {
    browse: 'ギャラリー',
    yourWorks: '出品作品',
    newListing: '新規出品',
    signIn: 'ログイン',
    signUp: '新規登録',
    signOut: 'ログアウト',
    language: '言語',
    settings: '設定',
  },
  home: {
    eyebrow: 'Vol. I · 交渉される商取引',
    headline_pre: 'すべての出品作品に、',
    headline_accent: 'あなたのための交渉エージェント',
    headline_post: 'を。',
    body: 'ポスター、絵画、写真。出品者の LLM と直接交渉するか、自分のエージェントを派遣して二者の交渉を観戦する。すべての提示価格は、隣の部屋の同等品取引データに裏付けられている。',
    cta_browse: 'ギャラリーへ',
    cta_signup: 'アカウント開設 →',
    cta_list: '作品を出品する →',
    nowOnView: '現在展示中',
    liveListings: '件 出品中',
    categories: 'カテゴリー',
    anchorData: '参照データ',
    turnCap: '上限ターン',
    pullquote:
      '"値切り方を知らなくていい。エージェントに任せて、もう一人のエージェントと議論させればいい。"',
    section_browse_title: 'ギャラリーを巡る',
    section_browse_body:
      'ポスター、絵画、写真 — カテゴリーで絞り込み、同等品取引に裏付けられた価格。',
    section_nego_title: '交渉を始める',
    section_nego_body:
      '自分でカウンターを打つか、目標額・上限を設定してバイヤーエージェントを派遣する。アンチローボール規則で双方の節度を維持。',
    section_watch_title: '二者が収束する',
    section_watch_body:
      '左右二つのストリーム、一本のプログレスバー。交渉は同意、拒否、決裂 — または中央値での自動仲裁で終わる。',
    footer_credit: 'art-bargain · テクニカルデモ · 2026',
    footer_stack: 'Claude Sonnet 4.6 · Supabase · Next.js 16',
  },
  browse: {
    eyebrow_open: '公募中',
    eyebrow_filtered: (cat: string) => `カテゴリー — ${cat}`,
    title: 'ギャラリー',
    intro:
      'すべての出品作品にエージェント付き。開いて交渉を始める — 直接チャットか、自分のエージェントを派遣。',
    filter_all: 'すべて',
    just_listed_eyebrow: '現在展示中',
    just_listed_title: '新着',
    just_listed_count: (n: number) => `${n} 件`,
    all_works_eyebrow: '目録',
    all_works_title: 'すべての作品',
    archive_eyebrow: 'データ ⌁ 参照',
    archive_title: 'アーカイブ',
    archive_count: (n: number) => `${n} 件の同等品取引`,
    archive_subtitle:
      'エージェントが交渉時に参照する根拠。各返答で最近の同等品成約価格を証拠として引用する。',
    empty_filtered: (cat: string) => `${cat} カテゴリーに出品作品はまだありません`,
    empty_all: 'まだ出品作品はありません',
    empty_body_filtered:
      '別のカテゴリーを試すか、下にスクロールしてアーカイブの同等品取引を見てください。',
    empty_body_all:
      '新規出品はここに表示されます。下にスクロールしてエージェントが参照するアーカイブを見てください。',
  },
};

export default ja;
