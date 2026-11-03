// Presentation metadata supplements the existing articles; their copy and URLs stay intact.
export const journalEditions = {
  '27-ekim-2-kasim-2026-haftanin-muzik-gundemi': {
    period: '27 Ekim–2 Kasım 2026',
    sourcesCheckedAt: '2026-11-03',
    recordings: [
      { title: 'Housewife', artists: ['Tate McRae'] },
      { title: 'expectations (Remix)', artists: ['Olivia Rodrigo', 'Chappell Roan'] },
      { title: 'Lies', artists: ['Zach Bryan', 'Lana Del Rey'] },
      { title: 'ADDICTED', artists: ['JISOO'] },
      { title: 'Looks Can Kill', artists: ['IVE'], group: true },
      { title: 'You’re Under Arrest', artists: ['ILLIT'], group: true },
      { title: 'Choosin’ Texas', artists: ['Ella Langley'] },
    ],
    charts: [
      { rank: 1, artist: 'Ella Langley', title: 'Choosin’ Texas', badge: 'record', weeksAtOne: 26, target: 'texas', chartName: 'Billboard Hot 100', announcedAt: '2026-11-02', line: 'Yarım yıl boyunca zirvede.' },
      { rank: 2, previousRanks: [2], artist: 'Tate McRae', title: 'Housewife', badge: 'hold', target: 'tate', chartName: 'Billboard Hot 100', announcedAt: '2026-11-02', line: 'İkinci haftasında da 2. sırada.' },
      { rank: 4, artist: 'Zach Bryan & Lana Del Rey', title: 'Lies', badge: 'new', target: 'lies', chartName: 'Billboard Hot 100', chartDate: '2026-10-31', line: '31 Ekim tarihli listeye 4. sıradan giriş.' },
      { rank: 7, previousRanks: [63, 3], artist: 'Olivia Rodrigo feat. Chappell Roan', title: 'expectations (Remix)', badge: 'down', target: 'olivia', chartName: 'Billboard Hot 100', announcedAt: '2026-11-02', line: 'Remiksle gelen sıçramanın ardından.' },
    ],
    tldr: [
      { target: 'texas', text: 'Ella Langley — Choosin’ Texas, 26. haftasında da zirvede.' },
      { target: 'tate', text: 'Tate McRae — Housewife kariyer rekoruyla 2. sırada.' },
      { target: 'olivia', text: 'Olivia Rodrigo feat. Chappell Roan — expectations (Remix), 63’ten 3’e sıçradı.' },
      { target: 'lies', text: 'Zach Bryan & Lana Del Rey — Lies, listeye 4’ten girdi.' },
      { target: 'kpop', text: 'JISOO, IVE ve ILLIT’in dönüşleri; ILLIT’in sahne kostümlerine yönelik eleştiriler.' },
    ],
    stories: [
      { id: 'tate', visual: 'lead', tag: 'liste', eventDate: '2026-10-15', facts: ['Hot 100: 2', 'Streaming Songs: 1', 'Global 200: 1'], translationId: 'tate-mcrae-housewife-turkce-ceviri', sourceIndexes: [1, 3, 4] },
      { id: 'olivia', tag: 'liste', eventDate: '2026-10-15', facts: ['63 → 3 → 7', '11. ilk 10 şarkısı'], translationId: 'olivia-rodrigo-chappell-roan-expectations-remix-turkce-ceviri', sourceIndexes: [2, 5, 6] },
      { id: 'lies', tag: 'düet', eventDate: '2026-10-16', facts: ['Hot 100: 4'], recording: { title: 'Lies', artists: ['Zach Bryan', 'Lana Del Rey'] }, sourceIndexes: [2, 7] },
      { id: 'jisoo', visual: 'cover', tag: 'k-pop', eventDate: '2026-10-30', facts: ['İkinci ön single', 'Albüm tarihi açıklanmadı'], translationId: 'jisoo-addicted-turkce-ceviri', sourceIndexes: [8, 9] },
      { id: 'ive', tag: 'k-pop', eventDate: '2026-10-26', facts: ['6 şarkılık mini albüm', 'Girl Hero'], translationId: 'ive-looks-can-kill-turkce-ceviri', sourceIndexes: [10] },
      { id: 'illit', tag: 'tartışma', eventDate: '2026-10-26', facts: ['İlk gün: 382.991 satış'], translationId: 'illit-youre-under-arrest-turkce-ceviri', sourceIndexes: [11, 12, 14] },
      { id: 'texas', tag: 'liste', facts: ['26 hafta 1 numara'], translationId: 'ella-langley-choosin-texas-turkce-ceviri', sourceIndexes: [0] },
    ],
    kpop: [
      { id: 'jisoo-addicted', artist: 'JISOO', type: 'solo', release: 'ADDICTED', format: 'Dijital single', releaseAtKST: '2026-10-30T08:00:00+09:00', sourceIndex: 9 },
      { id: 'ive-looks-can-kill', artist: 'IVE', type: 'group', release: 'Looks Can Kill', format: 'Mini albüm', releaseAtKST: '2026-10-26T18:00:00+09:00', sourceIndex: 10 },
      { id: 'illit-break-even', artist: 'ILLIT', type: 'group', release: 'BREAK EVEN', format: 'Mini albüm', releaseAtKST: '2026-10-26T18:00:00+09:00', sourceIndex: 11 },
    ],
    calendarHref: '/pop-gunlugu/kasim-2026-kpop-comeback-takvimi',
  },
};
