import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export const LANGUAGES = [
  { code: "en", label: "English", native: "English", speech: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { code: "mr", label: "Marathi", native: "मराठी", speech: "mr-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", speech: "te-IN" },
  { code: "ta", label: "Tamil", native: "தமிழ்", speech: "ta-IN" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", speech: "kn-IN" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", speech: "gu-IN" },
  { code: "bn", label: "Bengali", native: "বাংলা", speech: "bn-IN" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", speech: "pa-IN" },
  { code: "ur", label: "Urdu", native: "اردو", speech: "ur-IN" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

type Dict = Record<string, string>;

const en: Dict = {
  "app.name": "PashuRakshak",
  "app.tagline": "District animal-health surveillance & early warning",
  "nav.command": "Command",
  "nav.report": "Field report",
  "nav.register": "Animal register",
  "nav.lab": "Lab portal & QR",
  "nav.devices": "Collars & gateways",
  "nav.officers": "Officer alerts",
  "nav.signin": "Sign in",
  "nav.signout": "Sign out",
  "nav.openConsole": "Open console",

  "home.eyebrow": "Livestock disease early warning",
  "home.title": "Catch an outbreak on day one, not day ten.",
  "home.lede":
    "Sensor collars, village gateways and field reports feed one surveillance record. Officers see risk as it builds; farmers report in their own language, by voice or by picture.",
  "home.cta.primary": "Open the console",
  "home.cta.secondary": "File a field report",
  "home.stat1": "Median reporting time, pilot block",
  "home.stat2": "Collared animals streaming vitals",
  "home.stat3": "Village gateways online",
  "home.how": "How the chain works",

  "cmd.title": "Command console",
  "cmd.subtitle": "Dindori block, Nashik district",
  "cmd.activeAlerts": "Open alerts",
  "cmd.animalsTracked": "Animals on collar",
  "cmd.avgBdi": "Mean risk index",
  "cmd.vaccCoverage": "FMD coverage",
  "cmd.map": "Hotspot map & containment ring",
  "cmd.vitals": "Live vitals",
  "cmd.feed": "Alerts & escalations",
  "cmd.reports": "Recent field reports",
  "cmd.dossier": "Animal dossier",
  "cmd.legend.low": "Low",
  "cmd.legend.medium": "Medium",
  "cmd.legend.critical": "Critical",
  "cmd.temp": "Body temperature",
  "cmd.hr": "Heart rate",
  "cmd.motion": "Motion (VeDBA)",
  "cmd.bdi": "Biological Degradation Index",
  "cmd.lastPacket": "Last packet",
  "cmd.raiseLab": "Raise lab requisition",
  "cmd.noSelection": "Select an animal to see its live vitals.",

  "report.title": "Report a sick animal",
  "report.lede": "Tap the pictures that match what you see. Speak if it is easier.",
  "report.step1": "1. What do you see?",
  "report.step2": "2. How many animals?",
  "report.step3": "3. Say or type anything else",
  "report.affected": "Animals affected",
  "report.deaths": "Animals died",
  "report.village": "Village",
  "report.tag": "Ear tag (if known)",
  "report.species": "Species",
  "report.speak": "Hold to speak",
  "report.listening": "Listening…",
  "report.notes": "Notes",
  "report.submit": "Send report",
  "report.sending": "Sending…",
  "report.sent": "Report sent to the block veterinary officer.",
  "report.needSymptom": "Choose at least one picture or write a note.",
  "report.offline": "Saved on this phone. It will send when the network returns.",
  "report.speechUnsupported": "Voice input is not available in this browser.",

  "report.sec1.speech": "Step 1: What do you see? Tap the pictures matching symptoms you observe: mouth blisters, excess saliva, limping, off feed, loose motion, low milk, cannot stand, or skin lumps.",
  "report.sec2.speech": "Step 2: How many animals? Specify affected count, mortality count, village name, ear tag, and animal species.",
  "report.sec3.speech": "Step 3: Say or type anything else. Hold the microphone to speak in your local language or type your notes.",

  "sym.mouth": "Blisters in mouth",
  "sym.saliva": "Drooling saliva",
  "sym.lame": "Limping",
  "sym.offfeed": "Not eating",
  "sym.diarrhoea": "Loose motion",
  "sym.milk": "Less milk",
  "sym.down": "Cannot stand",
  "sym.nodules": "Skin lumps",

  "reg.title": "Animal register",
  "reg.lede": "Ear-tag records aligned with Bharat Pashudhan fields.",
  "reg.search": "Search ear tag, owner or village",
  "reg.vaccinations": "Vaccination history",
  "reg.treatments": "Treatment history",
  "reg.none": "No records yet.",
  "reg.owner": "Owner",
  "reg.village": "Village",
  "reg.breed": "Breed",
  "reg.dob": "Date of birth",

  "dev.title": "Collars & gateways",
  "dev.lede": "LoRa collar nodes report through village gateways over HTTP.",
  "dev.endpoint": "Gateway ingest endpoint",
  "dev.simulate": "Send a test packet",
  "dev.sent": "Packet accepted and scored.",

  "auth.signin": "Sign in",
  "auth.signup": "Create account",
  "auth.email": "Official email",
  "auth.password": "Password",
  "auth.name": "Full name",
  "auth.designation": "Designation",
  "auth.have": "Already registered? Sign in",
  "auth.new": "New here? Create an account",
  "common.language": "Language",
  "common.loading": "Loading…",
  "common.updated": "Updated",
};

const hi: Dict = {
  "app.name": "पशुरक्षक",
  "app.tagline": "जिला पशु स्वास्थ्य निगरानी और पूर्व चेतावनी प्रणाली",
  "nav.command": "कमांड कंसोल",
  "nav.report": "बीमारी की सूचना",
  "nav.register": "पशु रजिस्टर",
  "nav.lab": "प्रयोगशाला पोर्टल और QR",
  "nav.devices": "कॉलर और गेटवे",
  "nav.officers": "अधिकारी अलर्ट",
  "nav.signin": "साइन इन",
  "nav.signout": "साइन आउट",
  "nav.openConsole": "कंसोल खोलें",

  "home.eyebrow": "पशु रोग की पूर्व चेतावनी",
  "home.title": "बीमारी पहले दिन पकड़ें, दसवें दिन नहीं।",
  "home.lede":
    "सेंसर कॉलर, गाँव के गेटवे और किसानों की सूचनाएँ एक ही रिकॉर्ड में आती हैं। अधिकारी खतरा बढ़ते ही देख लेते हैं और किसान अपनी भाषा में बोलकर या तस्वीर चुनकर सूचना देते हैं।",
  "home.cta.primary": "कंसोल खोलें",
  "home.cta.secondary": "सूचना दर्ज करें",
  "home.stat1": "औसत रिपोर्टिंग समय",
  "home.stat2": "कॉलर लगे सक्रिय पशु",
  "home.stat3": "सक्रिय ग्रामीण गेटवे",

  "cmd.title": "कमांड कंसोल",
  "cmd.subtitle": "दिंडोरी ब्लॉक, नासिक जिला",
  "cmd.activeAlerts": "सक्रिय अलर्ट",
  "cmd.animalsTracked": "ट्रैक किए गए पशु",
  "cmd.avgBdi": "औसत जोखिम सूचकांक",
  "cmd.vaccCoverage": "FMD टीकाकरण कवरेज",
  "cmd.map": "हॉटस्पॉट मैप और नियंत्रण रिंग",
  "cmd.vitals": "लाइव शारीरिक स्वास्थ्य (वाइटल्स)",
  "cmd.feed": "अलर्ट और रोग प्रसार सूचनाएं",
  "cmd.reports": "हालिया ग्रामीण रिपोर्ट",
  "cmd.dossier": "पशु प्रोफाइल",
  "cmd.legend.low": "कम जोखिम",
  "cmd.legend.medium": "मध्यम जोखिम",
  "cmd.legend.critical": "गंभीर खतरा",
  "cmd.temp": "शरीर का तापमान",
  "cmd.hr": "हृदय गति",
  "cmd.motion": "शारीरिक गतिविधि (VeDBA)",
  "cmd.bdi": "जैविक गिरावट सूचकांक (BDI)",
  "cmd.lastPacket": "अंतिम सिग्नल",
  "cmd.raiseLab": "लैब जांच का अनुरोध करें",
  "cmd.noSelection": "लाइव वाइटल्स देखने के लिए किसी पशु का चयन करें।",

  "report.title": "बीमार पशु की सूचना दें",
  "report.lede": "जो लक्षण दिख रहे हैं उनकी तस्वीर चुनें, या बोलकर बताएं।",
  "report.step1": "1. क्या दिख रहा है?",
  "report.step2": "2. कितने पशु बीमार हैं?",
  "report.step3": "3. बोलकर या लिखकर विवरण दें",
  "report.affected": "बीमार पशुओं की संख्या",
  "report.deaths": "मृत पशुओं की संख्या",
  "report.village": "गाँव का नाम",
  "report.tag": "ईयर टैग नंबर (यदि मालूम हो)",
  "report.species": "पशु की नस्ल/प्रकार",
  "report.speak": "बोलने के लिए दबाएं",
  "report.listening": "सुन रहे हैं…",
  "report.notes": "अतिरिक्त विवरण",
  "report.submit": "रिपोर्ट सबमिट करें",
  "report.sending": "भेजा जा रहा है…",
  "report.sent": "रिपोर्ट ब्लॉक पशु चिकित्सा अधिकारी को भेज दी गई।",
  "report.needSymptom": "कृपया कम से कम एक लक्षण चुनें या नोट लिखें।",
  "report.offline": "इंटरनेट नहीं है। रिपोर्ट इस फोन में सुरक्षित है और नेटवर्क आते ही भेजी जाएगी।",
  "report.speechUnsupported": "इस ब्राउज़र में वॉयस इनपुट उपलब्ध नहीं है।",

  "report.sec1.speech": "चरण 1: क्या दिख रहा है? अपने पशु में मुँह में छाले, अत्यधिक लार, लंगड़ाना, चारा न खाना, पतला गोबर, दूध कम होना, उठ न पाना, या शरीर पर गाँठें आदि लक्षण चुनें।",
  "report.sec2.speech": "चरण 2: कितने पशु बीमार हैं? प्रभावित पशुओं की संख्या, मृत पशु, गाँव का नाम और पशु का प्रकार चुनें।",
  "report.sec3.speech": "चरण 3: बोलकर या लिखकर विवरण दें। माइक का बटन दबाकर अपनी स्थानीय भाषा में बोलें या नीचे टिप्पणी लिखें।",

  "sym.mouth": "मुँह में छाले",
  "sym.saliva": "अत्यधिक लार गिरना",
  "sym.lame": "लंगड़ाना",
  "sym.offfeed": "चारा न खाना",
  "sym.diarrhoea": "पतला गोबर",
  "sym.milk": "दूध की कमी",
  "sym.down": "उठ न पाना",
  "sym.nodules": "चमड़ी पर गाँठें",

  "reg.title": "पशु रजिस्टर",
  "reg.lede": "भारत पशुधन प्रणाली के अनुसार ईयर टैग रिकॉर्ड।",
  "reg.search": "टैग नंबर, मालिक का नाम या गाँव खोजें",
  "reg.vaccinations": "टीकाकरण इतिहास",
  "reg.treatments": "उपचार इतिहास",
  "reg.none": "कोई रिकॉर्ड उपलब्ध नहीं है।",
  "reg.owner": "पशुपालक का नाम",
  "reg.village": "गाँव",
  "reg.breed": "नस्ल",
  "reg.dob": "जन्म तिथि",

  "auth.signin": "लॉग इन करें",
  "auth.signup": "खाता बनाएं",
  "auth.email": "ईमेल आईडी",
  "auth.password": "पासवर्ड",
  "auth.name": "पूरा नाम",
  "auth.designation": "पद / पदनाम",
  "auth.have": "पहले से खाता है? लॉग इन करें",
  "auth.new": "नया खाता बनाएं",
  "common.language": "भाषा",
  "common.loading": "लोड हो रहा है…",
  "common.updated": "अपडेट किया गया",
};

const mr: Dict = {
  "app.name": "पशुरक्षक",
  "app.tagline": "जिल्हा पशु आरोग्य देखरेख आणि पूर्वसूचना प्रणाली",
  "nav.command": "कमांड कन्सोल",
  "nav.report": "माहिती नोंदवा",
  "nav.register": "पशु नोंदवही",
  "nav.lab": "प्रयोगशाळा पोर्टल व QR",
  "nav.devices": "कॉलर व गेटवे",
  "nav.officers": "अधिकारी अलर्ट",
  "nav.signin": "साइन इन",
  "nav.signout": "साइन आउट",
  "nav.openConsole": "कन्सोल उघडा",

  "home.eyebrow": "पशु रोगाची पूर्वसूचना",
  "home.title": "साथ पहिल्याच दिवशी ओळखा, दहाव्या दिवशी नाही.",
  "home.lede":
    "सेन्सर कॉलर, गावातील गेटवे आणि शेतकऱ्यांच्या नोंदी एकाच ठिकाणी येतात. अधिकाऱ्यांना धोका वाढताच दिसतो आणि शेतकरी आपल्या भाषेत बोलून किंवा चित्र निवडून कळवू शकतात.",
  "home.cta.primary": "कन्सोल उघडा",
  "home.cta.secondary": "नोंद करा",

  "cmd.title": "कमांड कन्सोल",
  "cmd.subtitle": "दिंडोरी तालुका, नाशिक जिल्हा",
  "cmd.activeAlerts": "सक्रिय सूचना (अलर्ट)",
  "cmd.animalsTracked": "कॉलर लागलेली जनावरे",
  "cmd.avgBdi": "सरासरी धोका निर्देशांक",
  "cmd.vaccCoverage": "लाळ खुरकत लसीकरण",
  "cmd.map": "हॉटस्पॉट नकाशा आणि नियंत्रण क्षेत्र",
  "cmd.vitals": "थेट शारीरिक निर्देशक (व्हाइटल्स)",
  "cmd.feed": "सूचना व वाढणारा धोका",
  "cmd.reports": "शेतकऱ्यांचे ताजे अहवाल",
  "cmd.dossier": "जनावराची फाईल",
  "cmd.legend.low": "कमी धोका",
  "cmd.legend.medium": "मध्यम धोका",
  "cmd.legend.critical": "गंभीर धोका",
  "cmd.temp": "शरीराचे तापमान",
  "cmd.hr": "हृदयाचे ठोके",
  "cmd.motion": "हालचाल निर्देशांक",
  "cmd.bdi": "रोग धोका निर्देशांक (BDI)",
  "cmd.lastPacket": "शेवटचा सिग्नल",
  "cmd.raiseLab": "प्रयोगशाळा तपासणी नोंदवा",
  "cmd.noSelection": "थेट व्हाइटल्स पाहण्यासाठी जनावरावर क्लिक करा.",

  "report.title": "आजारी जनावराची माहिती द्या",
  "report.lede": "जे दिसते त्याचे चित्र निवडा. बोलूनही सांगू शकता.",
  "report.step1": "१. काय लक्षणे दिसत आहेत?",
  "report.step2": "२. किती जनावरे आजारी आहेत?",
  "report.step3": "३. बोलून किंवा लिहून अधिक सांगा",
  "report.affected": "आजारी जनावरांची संख्या",
  "report.deaths": "मृत जनावरांची संख्या",
  "report.village": "गावाचे नाव",
  "report.tag": "इअर टॅग क्रमांक (माहित असल्यास)",
  "report.species": "जनावराचा प्रकार",
  "report.speak": "बोलण्यासाठी दाबा",
  "report.listening": "ऐकत आहोत…",
  "report.notes": "अधिक माहिती",
  "report.submit": "माहिती पाठवा",
  "report.sending": "पाठवत आहे…",
  "report.sent": "नोंद तालुका पशुवैद्यकीय अधिकाऱ्यांकडे पाठवली.",
  "report.needSymptom": "किमान एक चित्र निवडा किंवा माहिती लिहा.",
  "report.offline": "फोनमध्ये सुरक्षित ठेवले. नेटवर्क येताच आपोआप पाठवले जाईल.",
  "report.speechUnsupported": "या ब्राउझरमध्ये आवाज सुविधा उपलब्ध नाही.",

  "report.sec1.speech": "पायरी १: काय लक्षणे दिसत आहेत? तोंडात फोड, लाळ गळणे, लंगडणे, चारा न खाणे, पातळ शेण, दूध कमी होणे, उभे न राहता येणे किंवा कातडीवर गाठी यांपैकी लक्षणे निवडा.",
  "report.sec2.speech": "पायरी २: किती जनावरे आजारी आहेत? आजारी जनावरांची संख्या, मृत्यू, गाव आणि जनावराचा प्रकार सांगा.",
  "report.sec3.speech": "पायरी ३: बोलून किंवा लिहून अधिक सांगा. माइकचे बटण दाबून आपल्या भाषेत बोला किंवा खाली लिहा.",

  "sym.mouth": "तोंडात फोड",
  "sym.saliva": "लाळ गळणे",
  "sym.lame": "लंगडणे",
  "sym.offfeed": "चारा न खाणे",
  "sym.diarrhoea": "पातळ शेण",
  "sym.milk": "दूध कमी होणे",
  "sym.down": "उभे राहता न येणे",
  "sym.nodules": "कातडीवर गाठी",

  "reg.title": "पशु नोंदवही",
  "reg.lede": "भारत पशुधन प्रणालीशी सुसंगत टॅग नोंदी.",
  "reg.search": "टॅग, मालक किंवा गाव शोधा",
  "reg.vaccinations": "लसीकरण इतिहास",
  "reg.treatments": "उपचार इतिहास",
  "reg.none": "कोणत्याही नोंदी आढळल्या नाहीत.",
  "reg.owner": "पशुपालक",
  "reg.village": "गाव",
  "reg.breed": "जात/नस्ल",
  "reg.dob": "जन्मतारीख",

  "auth.signin": "साइन इन",
  "auth.signup": "नोंदणी करा",
  "auth.email": "ईमेल आयडी",
  "auth.password": "पासवर्ड",
  "auth.name": "पूर्ण नाव",
  "auth.designation": "हुद्दा",
  "auth.have": "आधीच खाते आहे? साइन इन करा",
  "auth.new": "नवीन आहात? खाते तयार करा",
  "common.language": "भाषा",
  "common.loading": "लोड होत आहे…",
  "common.updated": "अद्ययावत केले",
};

const te: Dict = {
  "app.name": "పశురక్షక్",
  "app.tagline": "పశు ఆరోగ్య నిఘా మరియు ముందస్తు హెచ్చరిక",
  "nav.command": "కమాండ్ కన్సోల్",
  "nav.report": "సమాచారం ఇవ్వండి",
  "nav.register": "జంతువుల నమోదు",
  "nav.lab": "ల్యాబ్ పోర్టల్ & QR",
  "nav.devices": "కాలర్లు & గేట్‌వేలు",
  "nav.officers": "అధికారి హెచ్చరికలు",
  "nav.signin": "సైన్ ఇన్",
  "nav.signout": "సైన్ అవుట్",
  "cmd.title": "కమాండ్ కన్సోల్",
  "cmd.activeAlerts": "ఓపెన్ హెచ్చరికలు",
  "report.title": "అనారోగ్య పశువు గురించి తెలియజేయండి",
  "report.lede": "మీరు చూసినదానికి సరిపోయే చిత్రాలను నొక్కండి. మాట్లాడి కూడా చెప్పవచ్చు.",
  "report.step1": "1. ఏమి కనిపిస్తోంది?",
  "report.step2": "2. ఎన్ని పశువులు?",
  "report.step3": "3. ఇంకేమైనా చెప్పాలా?",
  "report.sec1.speech": "దశ 1: నోటిలో పుండ్లు, చొంగ కారడం, కుంటడం, మేత తినకపోవడం వంటి లక్షణాలు ఎంచుకోండి.",
  "report.sec2.speech": "దశ 2: ఎన్ని పశువులు అనారోగ్యంతో ఉన్నాయి? వివరాలు ఇవ్వండి.",
  "report.sec3.speech": "దశ 3: మీ భాషలో మాట్లాడి లేదా రాసి సమాచారం పంపండి.",
  "report.affected": "ప్రభావిత పశువులు",
  "report.deaths": "చనిపోయిన పశువులు",
  "report.village": "గ్రామం",
  "report.speak": "మాట్లాడటానికి నొక్కండి",
  "report.submit": "పంపండి",
  "sym.mouth": "నోటిలో పుండ్లు",
  "sym.saliva": "చొంగ కారడం",
  "sym.lame": "కుంటడం",
  "sym.offfeed": "మేత తినకపోవడం",
  "sym.diarrhoea": "విరేచనాలు",
  "sym.milk": "పాలు తగ్గడం",
  "sym.down": "లేవలేకపోవడం",
  "sym.nodules": "చర్మంపై గడ్డలు",
};

const ta: Dict = {
  "app.name": "பசுரக்ஷக்",
  "app.tagline": "கால்நடை நோய் முன் எச்சரிக்கை மற்றும் கண்காணிப்பு",
  "nav.command": "கட்டளை மையம்",
  "nav.report": "தகவல் தெரிவிக்க",
  "nav.register": "கால்நடை பதிவு",
  "nav.lab": "ஆய்வக போர்டல்",
  "nav.devices": "காலர்கள் & கேட்வேகள்",
  "nav.officers": "அதிகாரி எச்சரிக்கைகள்",
  "nav.signin": "உள்நுழைய",
  "nav.signout": "வெளியேற",
  "cmd.title": "கட்டளை மையம்",
  "cmd.activeAlerts": "தற்போதைய எச்சரிக்கைகள்",
  "report.title": "நோயுற்ற கால்நடை பற்றி தெரிவிக்க",
  "report.lede": "அறிகுறிகளின் படங்களை தேர்வு செய்யவும் அல்லது பேசி கூறவும்.",
  "report.step1": "1. என்ன அறிகுறிகள் உள்ளன?",
  "report.step2": "2. எத்தனை கால்நடைகள்?",
  "report.step3": "3. கூடுதல் விவரங்கள்",
  "report.sec1.speech": "படி 1: வாயில் கொப்புளங்கள், எச்சில் வடிதல், நொண்டல், தீவனம் உண்ணாமை போன்ற அறிகுறிகளை தேர்ந்தெடுக்கவும்.",
  "report.sec2.speech": "படி 2: பாதிக்கப்பட்ட கால்நடைகளின் எண்ணிக்கை, ஊர் பெயர் குறிப்பிடவும்.",
  "report.sec3.speech": "படி 3: உங்கள் குரலில் பேசி அல்லது தட்டச்சு செய்து அனுப்பவும்.",
  "report.affected": "பாதிக்கப்பட்ட கால்நடைகள்",
  "report.deaths": "இறந்த கால்நடைகள்",
  "report.village": "கிராமம்",
  "report.speak": "பேச அழுத்தவும்",
  "report.submit": "அனுப்பவும்",
  "sym.mouth": "வாயில் கொப்புளங்கள்",
  "sym.saliva": "அதிக எச்சில் வடிதல்",
  "sym.lame": "நொண்டல்",
  "sym.offfeed": "தீவனம் உண்ணாமை",
  "sym.diarrhoea": "வயிற்றுப்போக்கு",
  "sym.milk": "பால் குறைவு",
  "sym.down": "எழ முடியாமை",
  "sym.nodules": "தோலில் கட்டிகள்",
};

const kn: Dict = {
  "app.name": "ಪಶುರಕ್ಷಕ",
  "app.tagline": "ಜಿಲ್ಲಾ ಪಶು ಆರೋಗ್ಯ ನಿಗಾ ಮತ್ತು ಮುನ್ನೆಚ್ಚರಿಕೆ",
  "nav.command": "ಕಮಾಂಡ್ ಕನ್ಸೋಲ್",
  "nav.report": "ವರದಿ ನೀಡಿ",
  "nav.register": "ಪಶು ನೋಂದಣಿ",
  "nav.lab": "ಲ್ಯಾಬ್ ಪೋರ್ಟಲ್ & ಕ್ಯೂಆರ್",
  "nav.devices": "ಕಾಲರ್ & ಗೇಟ್‌ವೇ",
  "nav.officers": "ಅಧಿಕಾರಿ ಎಚ್ಚರಿಕೆ",
  "nav.signin": "ಸೈನ್ ಇನ್",
  "nav.signout": "ಸೈನ್ ಔಟ್",
  "cmd.title": "ಕಮಾಂಡ್ ಕನ್ಸೋಲ್",
  "cmd.activeAlerts": "ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು",
  "report.title": "ಅನಾರೋಗ್ಯ ಪೀಡಿತ ಪ್ರಾಣಿಯ ವರದಿ ನೀಡಿ",
  "report.lede": "ಚಿತ್ರಗಳನ್ನು ಸ್ಪರ್ಶಿಸಿ ಅಥವಾ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ.",
  "report.step1": "1. ಏನು ಕಾಣಿಸುತ್ತಿದೆ?",
  "report.step2": "2. ಎಷ್ಟು ಪ್ರಾಣಿಗಳು?",
  "report.step3": "3. ಹೆಚ್ಚಿನ ವಿವರಗಳು",
  "report.sec1.speech": "ಹಂತ 1: ಬಾಯಿಯಲ್ಲಿ ಗುಳ್ಳೆಗಳು, ಜೊಲ್ಲು ಸುರಿಸುವುದು, ಕುಂಟುವುದು ಮುಂತಾದ ಲಕ್ಷಣಗಳನ್ನು ಆರಿಸಿ.",
  "report.sec2.speech": "ಹಂತ 2: ಪೀಡಿತ ಪ್ರಾಣಿಗಳ ಸಂಖ್ಯೆ ಮತ್ತು ಗ್ರಾಮವನ್ನು ತಿಳಿಸಿ.",
  "report.sec3.speech": "ಹಂತ 3: ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ ವರದಿ ಕಳುಹಿಸಿ.",
  "report.affected": "ತೊಂದರೆಗೊಳಗಾದ ಪ್ರಾಣಿಗಳು",
  "report.deaths": "ಸತ್ತ ಪ್ರಾಣಿಗಳು",
  "report.village": "ಗ್ರಾಮ",
  "report.speak": "ಮಾತನಾಡಲು ಒತ್ತಿ",
  "report.submit": "ವರದಿ ಕಳುಹಿಸಿ",
  "sym.mouth": "ಬಾಯಿಯಲ್ಲಿ ಗುಳ್ಳೆಗಳು",
  "sym.saliva": "ಅತಿಯಾದ ಜೊಲ್ಲು ಸುರಿಸುವುದು",
  "sym.lame": "ಕುಂಟುವುದು",
  "sym.offfeed": "ಮೇವು ತಿನ್ನದಿರುವುದು",
  "sym.diarrhoea": "ಭೇದಿ",
  "sym.milk": "ಹಾಲು ಇಳಿಕೆ",
  "sym.down": "ಏಳಲಾಗದಿರುವುದು",
  "sym.nodules": "ಚರ್ಮದ ಗಂಟುಗಳು",
};

const gu: Dict = {
  "app.name": "પશુરક્ષક",
  "app.tagline": "જિલ્લા પશુ સ્વાસ્થ્ય દેખરેખ અને પ્રારંભિક ચેતવણી",
  "nav.command": "કમાન્ડ કન્સોલ",
  "nav.report": "રિપોર્ટ આપો",
  "nav.register": "પશુ રજિસ્ટર",
  "nav.lab": "લેબ પોર્ટલ & QR",
  "nav.devices": "કોલર & ગેટવે",
  "nav.officers": "અધિકારી ચેતવણી",
  "nav.signin": "સાઇન ઇન",
  "nav.signout": "સાઇન આઉટ",
  "cmd.title": "કમાન્ડ કન્સોલ",
  "cmd.activeAlerts": "સક્રિય ચેતવણીઓ",
  "report.title": "બીમાર પ્રાણીની જાણ કરો",
  "report.lede": "ચિત્રો પસંદ કરો અથવા તમારી ભાષામાં બોલો.",
  "report.step1": "1. શું દેખાય છે?",
  "report.step2": "2. કેટલા પશુઓ?",
  "report.step3": "3. વધુ વિગતો",
  "report.sec1.speech": "પગલું 1: મોઢામાં ફોલ્લા, લાળ ટપકવી, લંગડાવું જેવા લક્ષણો પસંદ કરો.",
  "report.sec2.speech": "પગલું 2: અસરગ્રસ્ત પશુઓની સંખ્યા અને ગામનું નામ જણાવો.",
  "report.sec3.speech": "પગલું 3: બોલીને અથવા લખીને માહિતી મોકલો.",
  "report.affected": "અસરગ્રસ્ત પશુઓ",
  "report.deaths": "મૃત્યુ પામેલ પશુઓ",
  "report.village": "ગામ",
  "report.speak": "બોલવા માટે દબાવો",
  "report.submit": "રિપોર્ટ મોકલો",
  "sym.mouth": "મોઢામાં ફોલ્લા",
  "sym.saliva": "લાળ ટપકવી",
  "sym.lame": "લંગડાવું",
  "sym.offfeed": "ખોરાક ન ખાવો",
  "sym.diarrhoea": "ઝાડા",
  "sym.milk": "દૂધ ઘટવું",
  "sym.down": "ઊભા ન થઈ શકવું",
  "sym.nodules": "ચામડીના ગઠ્ઠા",
};

const bn: Dict = {
  "app.name": "পশুরক্ষক",
  "app.tagline": "জেলা পশু স্বাস্থ্য নজরদারি এবং প্রাথমিক সতর্কতা",
  "nav.command": "কমান্ড কনসোল",
  "nav.report": "তথ্য জমা দিন",
  "nav.register": "পশু রেজিস্টার",
  "nav.lab": "ল্যাব পোর্টাল",
  "nav.devices": "কলার ও গেটওয়ে",
  "nav.officers": "অফিসার সতর্কতা",
  "nav.signin": "সাইন ইন",
  "nav.signout": "সাইন আউট",
  "cmd.title": "কমান্ড কনসোল",
  "cmd.activeAlerts": "সক্রিয় সতর্কতা",
  "report.title": "অসুস্থ পশুর রিপোর্ট করুন",
  "report.lede": "উপসর্গ নির্বাচন করুন বা ভয়েসে বলুন।",
  "report.step1": "১. কি উপসর্গ দেখছেন?",
  "report.step2": "২. কতগুলি পশু?",
  "report.step3": "৩. অতিরিক্ত তথ্য",
  "report.sec1.speech": "ধাপ ১: মুখে ঘা, অতিরিক্ত লালা ঝরা, খোঁড়ানো বা খাবার না খাওয়ার মতো লক্ষণগুলি চিহ্নিত করুন।",
  "report.sec2.speech": "ধাপ ২: আক্রান্ত পশুর সংখ্যা এবং গ্রামের নাম লিখুন।",
  "report.sec3.speech": "ধাপ ৩: নিজের ভাষায় কথা বলে বা লিখে রিপোর্ট পাঠান।",
  "report.affected": "আক্রান্ত পশু",
  "report.deaths": "মৃত পশু",
  "report.village": "গ্রাম",
  "report.speak": "বলতে চাপুন",
  "report.submit": "পাঠান",
  "sym.mouth": "মুখে ঘা",
  "sym.saliva": "লালা ঝরা",
  "sym.lame": "খোঁড়ানো",
  "sym.offfeed": "খাবার না খাওয়া",
  "sym.diarrhoea": "পাতলা পায়খানা",
  "sym.milk": "দুধ কমে যাওয়া",
  "sym.down": "দাঁড়াতে অক্ষম",
  "sym.nodules": "ত্বকে গুটি",
};

const pa: Dict = {
  "app.name": "ਪਸ਼ੂ ਰੱਖਿਅਕ",
  "app.tagline": "ਜ਼ਿਲ੍ਹਾ ਪਸ਼ੂ ਸਿਹਤ ਨਿਗਰਾਨੀ ਅਤੇ ਚੇਤਾਵਨੀ ਪ੍ਰਣਾਲੀ",
  "nav.command": "ਕਮਾਂਡ ਕੰਸੋਲ",
  "nav.report": "ਰਿਪੋਰਟ ਦਰਜ ਕਰੋ",
  "nav.register": "ਪਸ਼ੂ ਰਜਿਸਟਰ",
  "nav.lab": "ਲੈਬ ਪੋਰਟਲ",
  "nav.devices": "ਕਾਲਰ ਅਤੇ ਗੇਟਵੇ",
  "nav.officers": "ਅਫਸਰ ਅਲਰਟ",
  "nav.signin": "ਸਾਈਨ ਇਨ",
  "nav.signout": "ਸਾਈਨ ਆਊਟ",
  "cmd.title": "ਕਮਾਂਡ ਕੰਸੋਲ",
  "cmd.activeAlerts": "ਸਰਗਰਮ ਅਲਰਟ",
  "report.title": "ਬਿਮਾਰ ਪਸ਼ੂ ਦੀ ਰਿਪੋਰਟ ਕਰੋ",
  "report.lede": "ਲੱਛਣ ਚੁਣੋ ਜਾਂ ਆਪਣੀ ਆਵਾਜ਼ ਵਿੱਚ ਦੱਸੋ।",
  "report.step1": "1. ਕੀ ਲੱਛਣ ਦਿਖ ਰਹੇ ਹਨ?",
  "report.step2": "2. ਕਿੰਨੇ ਪਸ਼ੂ ਬਿਮਾਰ ਹਨ?",
  "report.step3": "3. ਹੋਰ ਜਾਣਕਾਰੀ",
  "report.sec1.speech": "ਕਦਮ 1: ਮੂੰਹ ਵਿੱਚ ਛਾਲੇ, ਲਾਰ ਡਿੱਗਣਾ, ਲੰਗੜਾਉਣਾ ਜਾਂ ਚਾਰਾ ਨਾ ਖਾਣਾ ਚੁਣੋ।",
  "report.sec2.speech": "ਕਦਮ 2: ਪ੍ਰਭਾਵਿਤ ਪਸ਼ੂਆਂ ਦੀ ਗਿਣਤੀ ਅਤੇ ਪਿੰਡ ਦਾ ਨਾਮ ਦੱਸੋ।",
  "report.sec3.speech": "ਕਦਮ 3: ਬੋਲ ਕੇ ਜਾਂ ਲਿਖ ਕੇ ਰਿਪੋਰਟ ਭੇਜੋ।",
  "report.affected": "ਪ੍ਰਭਾਵਿਤ ਪਸ਼ੂ",
  "report.deaths": "ਮਰੇ ਹੋਏ ਪਸ਼ੂ",
  "report.village": "ਪਿੰਡ",
  "report.speak": "ਬੋਲਣ ਲਈ ਦਬਾਓ",
  "report.submit": "ਭੇਜੋ",
  "sym.mouth": "ਮੂੰਹ ਵਿੱਚ ਛਾਲੇ",
  "sym.saliva": "ਲਾਰ ਡਿੱਗਣਾ",
  "sym.lame": "ਲੰਗੜਾਉਣਾ",
  "sym.offfeed": "ਚਾਰਾ ਨਾ ਖਾਣਾ",
  "sym.diarrhoea": "ਦਸਤ",
  "sym.milk": "ਦੁੱਧ ਘਟਣਾ",
  "sym.down": "ਖੜੇ ਨਾ ਹੋ ਸਕਣਾ",
  "sym.nodules": "ਚਮੜੀ ਦੀਆਂ ਗੰਢਾਂ",
};

const ur: Dict = {
  "app.name": "پشو رکشک",
  "app.tagline": "ضلعی مویشی صحت نگرانی اور قبل از وقت انتباہ",
  "nav.command": "کمانڈ کنسول",
  "nav.report": "رپورٹ درج کریں",
  "nav.register": "جانوروں کا رجسٹر",
  "nav.lab": "لیب پورٹل",
  "nav.devices": "کالر اور گیٹ وے",
  "nav.officers": "افسران الرٹس",
  "nav.signin": "سائن ان",
  "nav.signout": "سائن آؤٹ",
  "cmd.title": "کمانڈ کنسول",
  "cmd.activeAlerts": "فعال الرٹس",
  "report.title": "بیمار جانور کی رپورٹ کریں",
  "report.lede": "علامات چنیں یا اپنی آواز میں بتائیں۔",
  "report.step1": "1. کیا علامت نظر آ رہی ہے؟",
  "report.step2": "2. کتنے جانور متاثر ہیں؟",
  "report.step3": "3. مزید تفصیلات",
  "report.sec1.speech": "مرحلہ 1: منہ میں چھالے، رال بہنا، لنگڑاہٹ یا چارہ نہ کھانا منتخب کریں۔",
  "report.sec2.speech": "مرحلہ 2: متاثرہ جانوروں کی تعداد اور گاؤں کا نام بتائیں۔",
  "report.sec3.speech": "مرحلہ 3: بول کر یا لکھ کر رپورٹ بھیجیں۔",
  "report.affected": "متاثرہ جانور",
  "report.deaths": "مردہ جانور",
  "report.village": "گاؤں",
  "report.speak": "بولنے کے لیے دبائیں",
  "report.submit": "ارسال کریں",
  "sym.mouth": "منہ میں چھالے",
  "sym.saliva": "رال بہنا",
  "sym.lame": "لنگڑانا",
  "sym.offfeed": "چارہ نہ کھانا",
  "sym.diarrhoea": "اسہال / دست",
  "sym.milk": "دودھ میں کمی",
  "sym.down": "کھڑا نہ ہو پانا",
  "sym.nodules": "جلد پر گانٹھیں",
};

const DICTS: Record<LanguageCode, Dict> = { en, hi, mr, te, ta, kn, gu, bn, pa, ur };

type I18nValue = {
  lang: LanguageCode;
  setLang: (code: LanguageCode) => void;
  t: (key: string) => string;
  speechLocale: string;
};

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "pashurakshak.lang";

/**
 * Remove all Google translate cookies across all paths and domains.
 */
export function clearGoogleTranslateCookies() {
  if (typeof document === "undefined") return;
  const hostname = window.location.hostname;
  const paths = ["/", "/en", window.location.pathname];
  const cookieNames = ["googtrans", "googtrans_prev", "googtrans_lang", "googtrans_origin"];

  cookieNames.forEach((name) => {
    paths.forEach((p) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p};`;
      if (hostname) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p}; domain=${hostname};`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p}; domain=.${hostname};`;
      }
    });
  });
}

/**
 * Cleanly sync with Google Translate engine and browser DOM.
 */
export function syncGoogleTranslateEngine(code: LanguageCode) {
  if (typeof window === "undefined") return;

  try {
    if (code === "en") {
      clearGoogleTranslateCookies();

      // Reset select combo to empty string or English (Show original)
      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (combo) {
        const enOpt = Array.from(combo.options).find((o) => o.value === "en" || o.value === "");
        if (enOpt) {
          combo.value = enOpt.value;
        } else {
          combo.selectedIndex = 0;
        }
        combo.dispatchEvent(new Event("change"));
      }

      // Check for Google Translate iframe restore button
      const bannerIframe = document.querySelector<HTMLIFrameElement>("iframe.goog-te-banner-frame");
      if (bannerIframe && bannerIframe.contentDocument) {
        const restoreBtn = bannerIframe.contentDocument.querySelector<HTMLElement>(".goog-te-banner-restore");
        restoreBtn?.click();
      }

      // Detect if Google Translate is currently active or has translated text nodes
      const isTranslated =
        document.documentElement.classList.contains("translated-ltr") ||
        document.documentElement.classList.contains("translated-rtl") ||
        document.body.classList.contains("translated-ltr") ||
        document.querySelector("font") !== null;

      if (isTranslated) {
        clearGoogleTranslateCookies();
        // A clean reload restores pristine English original DOM
        window.location.reload();
      }
    } else {
      // Set cookies for Google translate
      document.cookie = `googtrans=/auto/${code}; path=/;`;
      document.cookie = `googtrans=/en/${code}; path=/;`;

      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (combo) {
        combo.value = code;
        combo.dispatchEvent(new Event("change"));
      } else {
        // If combo not yet present in DOM, reload to translate with cookie
        window.location.reload();
      }
    }
  } catch (err) {
    console.warn("syncGoogleTranslateEngine error:", err);
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (stored && LANGUAGES.some((l) => l.code === stored)) {
      setLangState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const setLang = useCallback((code: LanguageCode) => {
    setLangState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;

    // Apply clean Google Translate sync
    syncGoogleTranslateEngine(code);
  }, []);

  const t = useCallback(
    (key: string) => {
      return DICTS[lang]?.[key] ?? en[key] ?? key;
    },
    [lang]
  );

  const speechLocale = LANGUAGES.find((l) => l.code === lang)?.speech ?? "en-IN";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, speechLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
