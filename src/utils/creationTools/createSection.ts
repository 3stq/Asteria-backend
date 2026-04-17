export async function createSection() {
  // Base sections (Featured, Daily, Bundles)
  const mainSections = [
    {
      bSortOffersByOwnership: false,
      bShowIneligibleOffersIfGiftable: false,
      bEnableToastNotification: true,
      background: {
        stage: "default",
        _type: "DynamicBackground",
        key: "vault",
      },
      _type: "ShopSection",
      landingPriority: 70,
      bHidden: false,
      sectionId: "Featured",
      bShowTimer: true,
      sectionDisplayName: "Featured",
      bShowIneligibleOffers: true,
    },
    {
      bSortOffersByOwnership: false,
      bShowIneligibleOffersIfGiftable: false,
      bEnableToastNotification: true,
      background: {
        stage: "default",
        _type: "DynamicBackground",
        key: "vault",
      },
      _type: "ShopSection",
      landingPriority: 70,
      bHidden: false,
      sectionId: "Daily",
      bShowTimer: false,
      sectionDisplayName: "Daily",
      bShowIneligibleOffers: true,
    },
    {
      bSortOffersByOwnership: false,
      bShowIneligibleOffersIfGiftable: false,
      bEnableToastNotification: true,
      background: {
        stage: "default",
        _type: "DynamicBackground",
        key: "vault",
      },
      _type: "ShopSection",
      landingPriority: 70,
      bHidden: false,
      sectionId: "Bundles",
      bShowTimer: false,
      sectionDisplayName: "Bundles",
      bShowIneligibleOffers: true,
    },
  ];

  // Optional: add more via env (comma-separated), e.g. SECTIONS=Tools,Wraps,Accessories
  const addedSections =
    process.env.SECTIONS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [];

  // avoid duplicates (e.g., if SECTIONS includes Featured/Daily/Bundles again)
  const existing = new Set(mainSections.map((s) => s.sectionId));
  for (const section of addedSections) {
    if (existing.has(section)) continue;
    existing.add(section);

    mainSections.push({
      bSortOffersByOwnership: false,
      bShowIneligibleOffersIfGiftable: false,
      bEnableToastNotification: true,
      background: {
        stage: "default",
        _type: "DynamicBackground",
        key: "vault",
      },
      _type: "ShopSection",
      landingPriority: 70,
      bHidden: false,
      sectionId: section,
      bShowTimer: false,
      sectionDisplayName: section,
      bShowIneligibleOffers: true,
    });
  }

  const now = new Date().toISOString();
  return {
    shopSections: {
      _title: "shop-sections",
      sectionList: {
        _type: "ShopSectionList",
        sections: mainSections,
      },
      _noIndex: false,
      _activeDate: now,
      lastModified: now,
      _locale: "en-US",
      _templateName: "FortniteGameShopSections",
    },
  };
}