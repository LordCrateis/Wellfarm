export type LocaleKey =
  | "en" | "hi" | "mr" | "bn" | "te" | "ta"
  | "gu" | "kn" | "ml" | "pa" | "or" | "as";

export const languageNames: Record<LocaleKey, string> = {
  en: "English", hi: "हिन्दी", mr: "मराठी", bn: "বাংলা",
  te: "తెలుగు", ta: "தமிழ்", gu: "ગુજરાતી", kn: "ಕನ್ನಡ",
  ml: "മലയാളം", pa: "ਪੰਜਾਬੀ", or: "ଓଡ଼ିଆ", as: "অসমীয়া",
};

type Copy = {
  nav: { how: string; farmers: string; insights: string; transparency: string };
  actions: { scan: string; open: string };
  farmer: {
    hello: string; area: string; weather: string; recent: string;
    contribution: string; scanTitle: string; analyze: string; result: string;
  };
  insights: { updated: string };
};
type CopyOverride = {
  nav?: Partial<Copy["nav"]>;
  actions?: Partial<Copy["actions"]>;
  farmer?: Partial<Copy["farmer"]>;
  insights?: Partial<Copy["insights"]>;
};

const en: Copy = {
  nav: { how: "How it works", farmers: "For farmers", insights: "Regional insights", transparency: "Transparency" },
  actions: { scan: "Scan a crop", open: "Open Wellfarm" },
  farmer: {
    hello: "Good morning, S. Pradhan",
    area: "Cuttack district · approximate area",
    weather: "Field weather",
    recent: "Your recent scans",
    contribution: "Your scans build a private field history and can support coarse, anonymous pattern exploration.",
    scanTitle: "Photograph an affected plant",
    analyze: "Start analysis",
    result: "Early indication",
  },
  insights: { updated: "Sample snapshot · 31 Mar 2025 · 16:20 IST" },
};

const regional: Record<Exclude<LocaleKey, "en">, CopyOverride> = {
  hi: {
    nav: { how: "यह कैसे काम करता है", farmers: "किसानों के लिए", insights: "क्षेत्रीय जानकारी", transparency: "पारदर्शिता" },
    actions: { scan: "फसल स्कैन करें", open: "वेलफार्म खोलें" },
    farmer: {
      hello: "सुप्रभात, एस. प्रधान", area: "कटक ज़िला · अनुमानित क्षेत्र",
      weather: "खेत का मौसम", recent: "आपके हाल के स्कैन",
      contribution: "आपके स्कैन एक निजी खेत इतिहास बनाने में मदद करते हैं।",
      scanTitle: "प्रभावित पौधे की तस्वीर लें", analyze: "विश्लेषण शुरू करें", result: "प्रारंभिक संकेत",
    },
  },
  mr: { nav: { how: "हे कसे कार्य करते", farmers: "शेतकऱ्यांसाठी", insights: "प्रादेशिक माहिती", transparency: "पारदर्शकता" } },
  bn: { nav: { how: "যেভাবে কাজ করে", farmers: "কৃষকদের জন্য", insights: "আঞ্চলিক অন্তর্দৃষ্টি", transparency: "স্বচ্ছতা" } },
  te: { nav: { how: "ఇది ఎలా పనిచేస్తుంది", farmers: "రైతుల కోసం", insights: "ప్రాంతీయ సమాచారం", transparency: "పారదర్శకత" } },
  ta: { nav: { how: "இது எப்படி இயங்குகிறது", farmers: "விவசாயிகளுக்கு", insights: "பிராந்திய நுண்ணறிவு", transparency: "வெளிப்படைத்தன்மை" } },
  gu: { nav: { how: "તે કેવી રીતે કામ કરે છે", farmers: "ખેડૂતો માટે", insights: "પ્રાદેશિક માહિતી", transparency: "પારદર્શિતા" } },
  kn: { nav: { how: "ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ", farmers: "ರೈತರಿಗಾಗಿ", insights: "ಪ್ರಾದೇಶಿಕ ಮಾಹಿತಿ", transparency: "ಪಾರದರ್ಶಕತೆ" } },
  ml: { nav: { how: "എങ്ങനെ പ്രവർത്തിക്കുന്നു", farmers: "കർഷകർക്കായി", insights: "പ്രാദേശിക ഉൾക്കാഴ്ച", transparency: "സുതാര്യത" } },
  pa: { nav: { how: "ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ", farmers: "ਕਿਸਾਨਾਂ ਲਈ", insights: "ਖੇਤਰੀ ਜਾਣਕਾਰੀ", transparency: "ਪਾਰਦਰਸ਼ਤਾ" } },
  or: { nav: { how: "ଏହା କିପରି କାମ କରେ", farmers: "ଚାଷୀଙ୍କ ପାଇଁ", insights: "ଆଞ୍ଚଳିକ ସୂଚନା", transparency: "ସ୍ୱଚ୍ଛତା" } },
  as: { nav: { how: "ই কেনেকৈ কাম কৰে", farmers: "কৃষকৰ বাবে", insights: "আঞ্চলিক তথ্য", transparency: "স্বচ্ছতা" } },
};

function merge(base: Copy, extra: CopyOverride): Copy {
  return {
    nav: { ...base.nav, ...extra.nav },
    actions: { ...base.actions, ...extra.actions },
    farmer: { ...base.farmer, ...extra.farmer },
    insights: { ...base.insights, ...extra.insights },
  };
}

export const locales: Record<LocaleKey, Copy> = {
  en,
  ...Object.fromEntries(Object.entries(regional).map(([key, value]) => [key, merge(en, value)])),
} as Record<LocaleKey, Copy>;
