// Demo content + theme tokens + media for the three example shops and the platform.
(function () {
  const hours = [
    { d: "Mon", h: "Closed", closed: true },
    { d: "Tue", h: "09:00–13:00 · 14:00–19:00" },
    { d: "Wed", h: "09:00–13:00 · 14:00–19:00" },
    { d: "Thu", h: "09:00–13:00 · 14:00–19:00", today: true },
    { d: "Fri", h: "09:00–13:00 · 14:00–19:00" },
    { d: "Sat", h: "09:00–16:00" },
    { d: "Sun", h: "Closed", closed: true },
  ];
  window.SHOPS = {
    kaiser: {
      key: "kaiser",
      name: "Kaiser & Co. Gentlemen’s Barbers",
      short: "Kaiser & Co.",
      mark: "K",
      eyebrow: "Josefstadt · since 1987",
      tagline: "Traditional cuts and hot-towel shaves, done slowly and properly.",
      about:
        "Three generations behind the same chairs on Josefstädter Straße. We still lather by hand, strop our own razors and keep the coffee on. Walk in a little rough, walk out like yourself on a good day.",
      address: "Josefstädter Straße 21, 1080 Wien",
      phone: "+43 1 402 18 77",
      email: "hallo@kaiser-barbers.at",
      domain: "kaiser-barbers.at",
      announcement: { tag: "New", text: "Beard packages from € 32,00" },
      hero: "split",
      heroLabel: "hero · barber at work, warm light · focal 62% 34%",
      sections: ["about", "services", "team", "gallery", "reviews", "hours", "location", "contact"],
      totalServices: 31,
      categories: [
        {
          name: "Haircuts",
          items: [
            { id: "k1", name: "Classic cut", min: 40, price: 3200, desc: "Wash, cut, hot towel, style" },
            { id: "k2", name: "Scissor cut", min: 50, price: 3800, desc: "All scissors, no clippers" },
            { id: "k3", name: "Buzz cut", min: 20, price: 1800 },
            { id: "k4", name: "Children’s cut (under 12)", min: 30, price: 2200 },
          ],
        },
        {
          name: "Beard & shave",
          items: [
            { id: "k5", name: "Beard trim", min: 20, price: 1800 },
            { id: "k6", name: "Hot-towel shave", min: 40, price: 3400, desc: "Straight razor, pre-shave oil" },
            { id: "k7", name: "Beard package", min: 45, price: 3200, desc: "Trim, shape, hot towel, balm" },
          ],
        },
        { name: "Combos", items: [{ id: "k8", name: "Cut + hot-towel shave", min: 80, price: 6200 }] },
      ],
      staff: [
        { id: "s1", name: "Anton Kaiser", title: "Master barber · owner", bio: "Forty years with the razor. Ask about the old shop.", photo: true },
        { id: "s2", name: "Mehmet Yılmaz", title: "Senior barber", bio: "Scissor work and long cuts.", photo: true },
        { id: "s3", name: "Lukas Hofer", title: "Barber", bio: "Classic side parts, sharp lines.", photo: true },
        { id: "s4", name: "Sofia Rainer", title: "Barber", bio: "Beards, shaves and the quiet chair.", photo: true },
        { id: "s5", name: "Jonas Brandl", title: "Barber", bio: "Fades with a gentleman’s finish.", photo: true },
        { id: "s6", name: "Emir Hadžić", title: "Apprentice", bio: "Second year. Great hot towel.", photo: false },
      ],
      gallery: 9,
      galleryLabels: ["interior · chairs & mirrors", "work · side part", "detail · straight razor", "work · hot towel", "before / after"],
      reviews: [
        { q: "Best hot-towel shave in Vienna. Anton takes his time and it shows.", a: "Daniel R." },
        { q: "Booked at midnight, sat down at nine. Exactly the cut I asked for.", a: "Florian K." },
      ],
      hours,
      lead: 24,
    },
    fadelab: {
      key: "fadelab",
      name: "FADE/LAB",
      short: "FADE/LAB",
      mark: "F",
      eyebrow: "Neubau · now open",
      tagline: "Skin fades, tapers and designs. Walk out sharp.",
      about: "",
      address: "Neubaugasse 7, 1070 Wien",
      phone: "+43 660 812 44 09",
      email: "book@fadelab.wien",
      domain: "fadelab.wien",
      announcement: { tag: "Opening", text: "€ 5,00 off your first cut until 31 Oct" },
      hero: "full",
      heroLabel: "hero · fade close-up, high contrast · focal 50% 40%",
      sections: ["services", "team", "gallery", "hours", "location", "contact"],
      totalServices: 6,
      categories: [
        {
          name: "Cuts",
          items: [
            { id: "f1", name: "Skin fade", min: 45, price: 3000 },
            { id: "f2", name: "Taper fade", min: 40, price: 2800 },
            { id: "f3", name: "Fade + beard", min: 60, price: 4000 },
            { id: "f4", name: "Kids fade (under 14)", min: 30, price: 2200 },
          ],
        },
        {
          name: "Extras",
          items: [
            { id: "f5", name: "Design / part line", min: 15, price: 800 },
            { id: "f6", name: "Beard line-up", min: 20, price: 1500 },
          ],
        },
      ],
      staff: [
        { id: "s1", name: "Deni", title: "Owner · barber", bio: "", photo: false },
        { id: "s2", name: "Kris", title: "Barber", bio: "", photo: false },
      ],
      gallery: 2,
      galleryLabels: ["work · skin fade", "interior · chair"],
      reviews: [],
      hours,
      lead: 2,
    },
    lune: {
      key: "lune",
      name: "Lune Nail & Beauty Studio",
      short: "Lune",
      mark: "L",
      eyebrow: "Margareten · by appointment",
      tagline: "Calm hands, clean lines. Nails, brows and lashes.",
      about:
        "A small, bright studio two minutes from Kettenbrückengasse. We use HEMA-free gels, sterilise every tool and never rush a cuticle. Tea is on us.",
      address: "Kettenbrückengasse 9, 1050 Wien",
      phone: "+43 1 581 22 90",
      email: "hello@lune-studio.at",
      domain: "lune-studio.at",
      announcement: null,
      hero: "carousel",
      heroLabel: "hero 1/4 · hands, soft daylight · focal 40% 55%",
      sections: ["services", "gallery", "team", "reviews", "about", "hours", "location", "contact"],
      totalServices: 14,
      serviceImages: true,
      categories: [
        {
          name: "Nails",
          items: [
            { id: "l1", name: "Gel manicure", min: 60, price: 4500, desc: "Shape, cuticle care, gel colour" },
            { id: "l2", name: "Classic manicure", min: 40, price: 3000 },
            { id: "l3", name: "Spa pedicure", min: 60, price: 4800 },
          ],
        },
        {
          name: "Brows & lashes",
          items: [
            { id: "l4", name: "Brow lamination", min: 45, price: 5500 },
            { id: "l5", name: "Lash lift & tint", min: 60, price: 6500 },
            { id: "l6", name: "Brow shape & tint", min: 30, price: 2800 },
          ],
        },
      ],
      staff: [
        { id: "s1", name: "Mira Novak", title: "Founder · nail artist", bio: "Minimal nail art, chrome and fine lines.", photo: true },
        { id: "s2", name: "Hana Ito", title: "Lash & brow specialist", bio: "Lifts that look like you, rested.", photo: true },
        { id: "s3", name: "Elif Demir", title: "Nail technician", bio: "Pedicures and long-wear gel.", photo: false },
      ],
      gallery: 6,
      galleryLabels: ["work · milky gel", "interior · studio table", "work · brow lamination", "detail · polish wall", "work · chrome tips"],
      reviews: [
        { q: "My gel lasted three weeks without a chip. The calmest hour of my month.", a: "Katharina M." },
        { q: "Hana fixed brows I’d been fighting for years.", a: "Leonie S." },
      ],
      hours,
      lead: 12,
    },
  };

  const U = (id, w) => "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&q=70&w=" + (w || 1200);
  window.IMG = U;
  // Icons: Lucide (ISC). Rendered as CSS mask so they take currentColor.
  window.ICON = (n) => "https://unpkg.com/lucide-static@0.460.0/icons/" + n + ".svg";
  const M = window.SHOPS;
  M.kaiser.media = {
    hero: [U("1503951914875-452162b0f3f1", 1600)], heroAlt: ["Client relaxing in a barber chair while his hair is cut"],
    about: U("1585747860715-2ba37e788b70", 1400), aboutAlt: "Black leather barber chair against a brick wall",
    gallery: ["1621645582931-d1d3e6564943","1647140655214-e4a2d914971f","1517832606299-7ae9b720a186","1621605815971-fbc98d665033","1593702275687-f8b402bf1fb5","1605497788044-5a32c7078486","1657105052497-f996284ffff8","1635273051937-a0ddef9573b6","1592647420148-bfcc177e2117"].map(i => U(i, 900)),
    staff: { s1: U("1593702275687-f8b402bf1fb5", 600), s2: U("1605497788044-5a32c7078486", 600), s3: U("1657105052497-f996284ffff8", 600), s4: U("1635273051839-003bf06a8751", 600), s5: U("1568339434343-2a640a1a9946", 600) },
    services: {}, geo: { lat: 48.2105, lon: 16.3480 },
  };
  M.fadelab.media = {
    hero: [U("1599351431202-1e0f0137899a", 1800)], heroAlt: ["Barber trimming a fade with a straight razor"],
    about: null, gallery: [U("1635273051937-a0ddef9573b6", 900), U("1621605815971-fbc98d665033", 900)],
    staff: {}, services: {}, geo: { lat: 48.2010, lon: 16.3500 },
  };
  M.lune.media = {
    hero: ["1632345031435-8727f6897d53","1659391542239-9648f307c0b1","1619607146034-5a05296c8f9a","1746607242420-12fc2604775d"].map(i => U(i, 1800)),
    heroAlt: ["Nail technician painting a client's nails","Hands with freshly painted nails","Wall of nail polish bottles on gold shelves","Ombre nails"],
    about: U("1658492055212-e1acbccfca5a", 1400), aboutAlt: "Pink chair and table in the bright studio",
    gallery: ["1772322586785-3a34772cbc61","1696342003838-4a8f9f36588c","1688583417770-ff6cc18071dc","1660505102581-85cffa4e6550","1772322586702-73125782bd99","1696341995063-b60c66e85838"].map(i => U(i, 900)),
    staff: { s1: U("1522337360788-8b13dee7a37e", 600), s2: U("1634449571010-02389ed0f9b0", 600) },
    services: { l1: U("1632345031435-8727f6897d53", 300), l2: U("1659391542239-9648f307c0b1", 300), l3: U("1619607536077-220f62b03d10", 300), l4: U("1522337360788-8b13dee7a37e", 300), l5: U("1731514771613-991a02407132", 300), l6: U("1696341995063-b60c66e85838", 300) },
    geo: { lat: 48.1965, lon: 16.3600 },
  };
  const F = {
    classic: { "--font-display": "'Cormorant Garamond', serif", "--display-weight": "600", "--display-transform": "none", "--display-tracking": "-0.01em", "--radius": "2px", "--radius-lg": "4px", "--btn-radius": "2px", "--btn-transform": "none" },
    modern: { "--font-display": "'Barlow Condensed', sans-serif", "--display-weight": "700", "--display-transform": "uppercase", "--display-tracking": "0.01em", "--radius": "0px", "--radius-lg": "0px", "--btn-radius": "0px", "--btn-transform": "uppercase" },
    soft: { "--font-display": "Italiana, serif", "--display-weight": "400", "--display-transform": "none", "--display-tracking": "0.02em", "--radius": "20px", "--radius-lg": "20px", "--btn-radius": "999px", "--btn-transform": "none" },
    platform: { "--font-display": "'Instrument Serif', serif", "--display-weight": "400", "--display-transform": "none", "--display-tracking": "-0.01em", "--radius": "10px", "--radius-lg": "14px", "--btn-radius": "10px", "--btn-transform": "none" },
  };
  const C = (bg, fg, sf, mu, li, ac, acf, ach, acp, acs, act, dg, sc) => ({ "--background": bg, "--foreground": fg, "--surface": sf, "--muted": mu, "--line": li, "--accent": ac, "--accent-foreground": acf, "--accent-hover": ach, "--accent-pressed": acp, "--accent-subtle": acs, "--accent-text": act, "--danger": dg, "--success": sc });
  window.THEMES = {
    kaiser: { defaultMode: "light", light: { ...F.classic, ...C("#f4ecdf","#2a2118","#fbf6ee","#6e604e","#e2d6c3","#8a6a2f","#ffffff","#775b27","#644c20","#ece0cb","#745824","#b42318","#2f6b3a") }, dark: { ...F.classic, ...C("#1a1612","#f1e8da","#231e18","#ab9f8c","#3a3128","#c9a45c","#1a1612","#d6b573","#b8924a","#2f271b","#c9a45c","#f97066","#7fc48c") } },
    fadelab: { defaultMode: "dark", light: { ...F.modern, ...C("#f2f2f0","#16171a","#ffffff","#5f6066","#dcdcd8","#ff5a1f","#111111","#ff7444","#e8480f","#ffe6dc","#b83d0c","#b42318","#2f6b3a") }, dark: { ...F.modern, ...C("#16171a","#f3f3f1","#1f2024","#a3a4a8","#303136","#ff5a1f","#111111","#ff7444","#e8480f","#2c1d17","#ff7a4a","#ff6b6b","#6fd08c") } },
    lune: { defaultMode: "light", light: { ...F.soft, ...C("#faf3f1","#3b2430","#fffaf8","#7a5d69","#eedcd8","#a3456b","#ffffff","#8f3a5d","#7b3050","#f4e1e6","#a3456b","#b42318","#2f6b3a") }, dark: { ...F.soft, ...C("#1c1418","#f6e9ec","#261c21","#b89ca6","#3b2c33","#e58aae","#1c1418","#eda2bf","#d9739c","#3a2129","#e58aae","#f97066","#7fc48c") } },
    platform: { defaultMode: "light", light: { ...F.platform, ...C("#f6f3ee","#1d1a17","#fffdfa","#6b6259","#e3dcd1","#a8431f","#fffdfa","#923a1b","#7c3117","#f3e3da","#a8431f","#b42318","#2f6b3a") }, dark: { ...F.platform, ...C("#14120f","#f1ece4","#1d1a16","#a59c90","#332d27","#e2805a","#14120f","#e9956f","#d26d47","#33231b","#e2805a","#f97066","#7fc48c") } },
  };
  // Resolve tokens: mode = "light" | "dark" | "auto" (auto follows prefers-color-scheme).
  window.themeVars = (key, mode) => {
    const t = window.THEMES[key] || window.THEMES.platform;
    let m = mode || t.defaultMode;
    if (m === "auto") m = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return t[m] || t.light;
  };
  window.reducedMotion = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  window.fmtEUR = (c) => "€ " + (c / 100).toFixed(2).replace(".", ",");
  window.fmtMin = (m) => { const h = Math.floor(m / 60), r = m % 60; return h === 0 ? `${r} min` : r === 0 ? `${h} h` : `${h} h ${r} min`; };
})();
