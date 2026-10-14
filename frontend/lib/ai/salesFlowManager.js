/**
 * Adaptive Conversational Sales Flow Manager
 * Consultative sales qualification engine for Emperor Smart Solutions (ESS)
 * 
 * Flow capabilities:
 * - Short, sequential questions (5-20 words) with structured Quick Replies
 * - Adaptive branching based on answers provided (skips already known info)
 * - Multi-attribute extraction from single multi-requirement messages
 * - Graceful switching when customer changes project type halfway through
 * - Brief answering of direct questions before resuming qualification
 * - Concise summary and consent-based contact collection handoff
 * - Multi-language support (English, Hindi, Hinglish)
 */

export const ALL_ESS_SERVICES = [
  "Website Development",
  "Mobile Application",
  "AI Chatbot",
  "Custom Software",
  "UI/UX Design",
  "Cloud & DevOps",
  "SEO & Marketing",
];

export const QUALIFICATION_FLOWS = {
  website: {
    serviceName: "Website Development",
    questions: [
      {
        id: "is_business",
        text: {
          english: "Is this website for your business?",
          hindi: "क्या यह वेबसाइट आपके व्यवसाय के लिए है?",
          hinglish: "Kya yeh website aapke business ke liye hai?",
        },
        quickReplies: {
          english: ["Yes", "No"],
          hindi: ["हाँ", "नहीं"],
          hinglish: ["Haan", "Nahi"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|ha|bilkul|sure|definitely|business|company|clinic|shop|store|hospital)\b/i.test(text)) return true;
          if (/\b(?:no|nope|nah|nahi|personal|hobby|student|portfolio|blog)\b/i.test(text)) return false;
          return null;
        },
      },
      {
        id: "non_business_type",
        condition: (answers) => answers.is_business === false,
        text: {
          english: "Got it! Is this for a personal portfolio, blog, non-profit, or student project?",
          hindi: "समझ गया! क्या यह व्यक्तिगत पोर्टफोलियो, ब्लॉग, गैर-लाभकारी (NGO) या छात्र प्रोजेक्ट के लिए है?",
          hinglish: "Samajh gaya! Yeh personal portfolio, blog, NGO ya student project ke liye hai?",
        },
        quickReplies: {
          english: ["Personal portfolio", "Blog / Content", "Non-profit / NGO", "Student project"],
          hindi: ["व्यक्तिगत पोर्टफोलियो", "ब्लॉग / कंटेंट", "NGO / गैर-लाभकारी", "छात्र प्रोजेक्ट"],
          hinglish: ["Personal portfolio", "Blog / Content", "Non-profit / NGO", "Student project"],
        },
        extract: (text) => {
          if (/\b(?:portfolio|resume|personal|showcase)\b/i.test(text)) return "Personal portfolio";
          if (/\b(?:blog|article|content|news|publishing)\b/i.test(text)) return "Blog / Content";
          if (/\b(?:ngo|non-?profit|charity|trust|community|foundation)\b/i.test(text)) return "Non-profit / NGO";
          if (/\b(?:student|college|university|academic|school|final\s*year|assignment)\b/i.test(text)) return "Student project";
          return null;
        },
      },
      {
        id: "is_redesign",
        condition: (answers) => answers.is_business !== false,
        text: {
          english: "Do you need a new website or a redesign?",
          hindi: "क्या आपको एक नई वेबसाइट चाहिए या मौजूदा वेबसाइट का नया डिज़ाइन?",
          hinglish: "Aapko nayi website chahiye ya existing website ka redesign?",
        },
        quickReplies: {
          english: ["New website", "Redesign"],
          hindi: ["नई वेबसाइट", "री-डिज़ाइन"],
          hinglish: ["New website", "Redesign"],
        },
        extract: (text) => {
          if (/\b(?:redesign|revamp|re-design|existing|update\s+old|modify|improve)\b/i.test(text)) return "Redesign";
          if (/\b(?:new|fresh|scratch|from\s+scratch|start|nayi)\b/i.test(text)) return "New website";
          return null;
        },
      },
      {
        id: "website_type",
        condition: (answers) => answers.is_business !== false,
        text: {
          english: "Is it a business website, e-commerce store, portfolio, or web application?",
          hindi: "क्या यह एक बिजनेस वेबसाइट, ई-कॉमर्स स्टोर, पोर्टफोलियो या वेब एप्लिकेशन है?",
          hinglish: "Yeh business website, e-commerce store, portfolio ya web application hai?",
        },
        quickReplies: {
          english: ["Business website", "E-commerce", "Portfolio", "Web application", "Not sure"],
          hindi: ["बिजनेस वेबसाइट", "ई-कॉमर्स", "पोर्टफोलियो", "वेब ऐप", "पक्का नहीं"],
          hinglish: ["Business website", "E-commerce", "Portfolio", "Web application", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:e-?commerce|shop|store|sell\s+online|products?|cart|checkout)\b/i.test(text)) return "E-commerce";
          if (/\b(?:portfolio|showcase|resume|personal)\b/i.test(text)) return "Portfolio";
          if (/\b(?:web\s*app(?:lication)?|portal|saas|dashboard|platform)\b/i.test(text)) return "Web application";
          if (/\b(?:business|clinic|corporate|company|agency|services?)\b/i.test(text)) return "Business website";
          if (/\b(?:not\s+sure|don't\s+know|confused|pata\s+nahi)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "needs_admin",
        condition: (answers) => answers.is_business !== false,
        text: {
          english: "Do you need an admin panel to manage content and users?",
          hindi: "क्या आपको सामग्री और उपयोगकर्ताओं को प्रबंधित करने के लिए एडमिन पैनल चाहिए?",
          hinglish: "Kya aapko content aur users manage karne ke liye admin panel chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|ha|admin|dashboard|management|control\s*panel)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|static|simple)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "needs_payment",
        condition: (answers) => answers.is_business !== false,
        text: {
          english: "Do you need online payment gateway integration?",
          hindi: "क्या आपको ऑनलाइन पेमेंट गेटवे इंटीग्रेशन की आवश्यकता है?",
          hinglish: "Kya aapko online payment gateway integration chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No"],
          hindi: ["हाँ", "नहीं"],
          hinglish: ["Haan", "Nahi"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|payment|razorpay|stripe|upi|gateway|cards?|netbanking)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|cash|inquiry\s*only)\b/i.test(text)) return "No";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate budget for this project?",
          hindi: "इस प्रोजेक्ट के लिए आपका अनुमानित बजट क्या है?",
          hinglish: "Is project ke liye aapka approximate budget kitna hai?",
        },
        quickReplies: {
          english: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
          hindi: ["₹50,000 से कम", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "₹2,00,000 से अधिक", "अभी तय नहीं"],
          hinglish: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
    ],
  },

  mobile_app: {
    serviceName: "Mobile Application",
    questions: [
      {
        id: "platform",
        text: {
          english: "Do you need an Android app, iOS app, or both?",
          hindi: "क्या आपको एंड्रॉइड ऐप, आईओएस ऐप या दोनों चाहिए?",
          hinglish: "Aapko Android app, iOS app ya dono chahiye?",
        },
        quickReplies: {
          english: ["Android", "iOS", "Both"],
          hindi: ["एंड्रॉइड", "आईओएस (iOS)", "दोनों"],
          hinglish: ["Android", "iOS", "Both"],
        },
        extract: (text) => {
          if (/\b(?:both|dono|cross-?platform|flutter|react\s*native)\b/i.test(text)) return "Both Android & iOS";
          if (/\b(?:android)\b/i.test(text) && !/\b(?:ios|apple|iphone)\b/i.test(text)) return "Android";
          if (/\b(?:ios|apple|iphone)\b/i.test(text) && !/\b(?:android)\b/i.test(text)) return "iOS";
          return null;
        },
      },
      {
        id: "is_new_app",
        text: {
          english: "Is this a new app or an extension of an existing product?",
          hindi: "क्या यह एक नया ऐप है या किसी मौजूदा उत्पाद का विस्तार?",
          hinglish: "Kya yeh naya app hai ya existing product ka extension?",
        },
        quickReplies: {
          english: ["New app", "Existing product extension"],
          hindi: ["नया ऐप", "मौजूदा प्रोडक्ट का विस्तार"],
          hinglish: ["New app", "Existing product extension"],
        },
        extract: (text) => {
          if (/\b(?:existing|extension|integrate|upgrade|v2|current)\b/i.test(text)) return "Existing product extension";
          if (/\b(?:new|fresh|scratch|first\s*time|naya)\b/i.test(text)) return "New app";
          return null;
        },
      },
      {
        id: "needs_backend",
        text: {
          english: "Do you need a backend server and admin dashboard?",
          hindi: "क्या आपको बैकएंड सर्वर और एडमिन डैशबोर्ड की आवश्यकता है?",
          hinglish: "Kya aapko backend server aur admin dashboard chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|backend|api|server|database|admin|dashboard)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|offline|standalone)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "needs_payment",
        text: {
          english: "Do you require payment or third-party integrations?",
          hindi: "क्या आपको भुगतान या थर्ड-पार्टी इंटीग्रेशन की आवश्यकता है?",
          hinglish: "Kya aapko payment ya third-party integrations chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No"],
          hindi: ["हाँ", "नहीं"],
          hinglish: ["Haan", "Nahi"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|payment|gateway|maps?|sms|third-?party|api)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi)\b/i.test(text)) return "No";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate budget for the mobile application?",
          hindi: "मोबाइल एप्लिकेशन के लिए आपका अनुमानित बजट क्या है?",
          hinglish: "Mobile app ke liye aapka approximate budget kitna hai?",
        },
        quickReplies: {
          english: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
          hindi: ["₹50,000 से कम", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "₹2,00,000 से अधिक", "अभी तय नहीं"],
          hinglish: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
      {
        id: "timeline",
        text: {
          english: "When do you want to launch your app?",
          hindi: "आप अपना ऐप कब तक लॉन्च करना चाहते हैं?",
          hinglish: "Aap apna app kab tak launch karna chahte hain?",
        },
        quickReplies: {
          english: ["Within a month", "1–3 months", "Flexible"],
          hindi: ["1 महीने में", "1–3 महीने में", "लचीला (Flexible)"],
          hinglish: ["Within a month", "1–3 months", "Flexible"],
        },
        extract: (text) => extractTimelineAnswer(text),
      },
    ],
  },

  ai_chatbot: {
    serviceName: "AI Chatbot & Automation",
    questions: [
      {
        id: "channel",
        text: {
          english: "Do you need the chatbot for your website, WhatsApp, or both?",
          hindi: "क्या आपको चैटबॉट वेबसाइट, व्हाट्सएप या दोनों के लिए चाहिए?",
          hinglish: "Aapko chatbot website, WhatsApp ya dono ke liye chahiye?",
        },
        quickReplies: {
          english: ["Website", "WhatsApp", "Both"],
          hindi: ["वेबसाइट", "व्हाट्सएप", "दोनों"],
          hinglish: ["Website", "WhatsApp", "Both"],
        },
        extract: (text) => {
          if (/\b(?:both|dono|all)\b/i.test(text)) return "Both Website & WhatsApp";
          if (/\b(?:whatsapp|wa)\b/i.test(text) && !/\b(?:website|web)\b/i.test(text)) return "WhatsApp";
          if (/\b(?:website|web|site)\b/i.test(text) && !/\b(?:whatsapp)\b/i.test(text)) return "Website";
          return null;
        },
      },
      {
        id: "needs_docs",
        text: {
          english: "Should it answer questions from your company documents and PDFs?",
          hindi: "क्या इसे आपकी कंपनी के दस्तावेज़ों और पीडीएफ से उत्तर देना चाहिए?",
          hinglish: "Kya ise aapke company documents aur PDFs se answer karna chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|docs|documents?|pdf|kb|knowledge|files?)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|faq|rules)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "purpose",
        text: {
          english: "Do you need lead collection, customer support automation, or both?",
          hindi: "क्या आपको लीड संग्रह, ग्राहक सहायता ऑटोमेशन या दोनों चाहिए?",
          hinglish: "Aapko lead collection, customer support automation ya dono chahiye?",
        },
        quickReplies: {
          english: ["Lead collection", "Customer support", "Both"],
          hindi: ["लीड संग्रह", "ग्राहक सहायता", "दोनों"],
          hinglish: ["Lead collection", "Customer support", "Both"],
        },
        extract: (text) => {
          if (/\b(?:both|dono)\b/i.test(text)) return "Both Leads & Support";
          if (/\b(?:lead|sales|inbound|enquiry|inquiries)\b/i.test(text)) return "Lead collection";
          if (/\b(?:support|customer|service|tickets?|helpdesk)\b/i.test(text)) return "Customer support";
          return null;
        },
      },
      {
        id: "needs_crm",
        text: {
          english: "Do you require integration with an existing CRM or database?",
          hindi: "क्या आपको मौजूदा CRM या डेटाबेस के साथ एकीकरण की आवश्यकता है?",
          hinglish: "Kya aapko existing CRM ya database ke saath integration chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|crm|salesforce|hubspot|sheets?|database|webhook)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|standalone)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate budget for the AI chatbot?",
          hindi: "एआई चैटबॉट के लिए आपका अनुमानित बजट क्या है?",
          hinglish: "AI chatbot ke liye aapka approximate budget kitna hai?",
        },
        quickReplies: {
          english: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
          hindi: ["₹50,000 से कम", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "₹2,00,000 से अधिक", "अभी तय नहीं"],
          hinglish: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
      {
        id: "timeline",
        text: {
          english: "When would you like to deploy the chatbot?",
          hindi: "आप चैटबॉट कब तक तैनात करना चाहते हैं?",
          hinglish: "Aap chatbot kab tak live karna chahte hain?",
        },
        quickReplies: {
          english: ["Within 2 weeks", "Within a month", "Flexible"],
          hindi: ["2 सप्ताह में", "1 महीने में", "लचीला (Flexible)"],
          hinglish: ["Within 2 weeks", "Within a month", "Flexible"],
        },
        extract: (text) => extractTimelineAnswer(text),
      },
    ],
  },

  custom_software: {
    serviceName: "Custom Software & ERP",
    questions: [
      {
        id: "system_type",
        text: {
          english: "Is this for enterprise ERP, CRM & sales, operations, or a custom portal?",
          hindi: "क्या यह एंटरप्राइज ERP, CRM और बिक्री, संचालन या कस्टम पोर्टल के लिए है?",
          hinglish: "Yeh enterprise ERP, CRM & sales, operations ya custom portal ke liye hai?",
        },
        quickReplies: {
          english: ["Enterprise ERP", "CRM & Sales", "Operations Management", "Custom Portal"],
          hindi: ["एंटरप्राइज ERP", "CRM और बिक्री", "संचालन प्रबंधन", "कस्टम पोर्टल"],
          hinglish: ["Enterprise ERP", "CRM & Sales", "Operations Management", "Custom Portal"],
        },
        extract: (text) => {
          if (/\b(?:erp|enterprise|resource)\b/i.test(text)) return "Enterprise ERP";
          if (/\b(?:crm|sales|leads?|pipeline)\b/i.test(text)) return "CRM & Sales";
          if (/\b(?:operations?|workflow|inventory|billing|hr|payroll)\b/i.test(text)) return "Operations Management";
          if (/\b(?:custom\s*portal|client\s*portal|portal|dashboard)\b/i.test(text)) return "Custom Portal";
          return null;
        },
      },
      {
        id: "has_existing_data",
        text: {
          english: "Do you have existing databases or spreadsheets to migrate?",
          hindi: "क्या आपके पास माइग्रेट करने के लिए मौजूदा डेटाबेस या स्प्रेडशीट हैं?",
          hinglish: "Kya aapke paas migrate karne ke liye existing databases ya spreadsheets hain?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|excel|sheets?|sql|csv|existing)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|fresh|scratch)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "needs_role_access",
        text: {
          english: "Do you need role-based staff permissions and automated reports?",
          hindi: "क्या आपको भूमिका-आधारित कर्मचारी अनुमतियाँ और स्वचालित रिपोर्ट चाहिए?",
          hinglish: "Kya aapko role-based staff permissions aur automated reports chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|roles?|permissions?|reports?|admin)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|simple)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate budget for the software system?",
          hindi: "सॉफ्टवेयर सिस्टम के लिए आपका अनुमानित बजट क्या है?",
          hinglish: "Software system ke liye aapka approximate budget kitna hai?",
        },
        quickReplies: {
          english: ["₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
          hindi: ["₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "₹2,00,000 से अधिक", "अभी तय नहीं"],
          hinglish: ["₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
      {
        id: "timeline",
        text: {
          english: "When would you like to deploy this software?",
          hindi: "आप इस सॉफ्टवेयर को कब तक लागू (Deploy) करना चाहते हैं?",
          hinglish: "Aap is software ko kab tak deploy karna chahte hain?",
        },
        quickReplies: {
          english: ["Within a month", "1–3 months", "Flexible"],
          hindi: ["1 महीने में", "1–3 महीने में", "लचीला (Flexible)"],
          hinglish: ["Within a month", "1–3 months", "Flexible"],
        },
        extract: (text) => extractTimelineAnswer(text),
      },
    ],
  },

  ui_ux: {
    serviceName: "UI/UX Design",
    questions: [
      {
        id: "design_target",
        text: {
          english: "Is this UI/UX design for a mobile app, website, or enterprise dashboard?",
          hindi: "क्या यह UI/UX डिज़ाइन मोबाइल ऐप, वेबसाइट या एंटरप्राइज डैशबोर्ड के लिए है?",
          hinglish: "Yeh UI/UX design mobile app, website ya enterprise dashboard ke liye hai?",
        },
        quickReplies: {
          english: ["Mobile App", "Website", "Dashboard / SaaS", "Both App & Web"],
          hindi: ["मोबाइल ऐप", "वेबसाइट", "डैशबोर्ड / SaaS", "ऐप और वेब दोनों"],
          hinglish: ["Mobile App", "Website", "Dashboard / SaaS", "Both App & Web"],
        },
        extract: (text) => {
          if (/\b(?:both|all|dono)\b/i.test(text)) return "Both App & Web";
          if (/\b(?:app|mobile|android|ios)\b/i.test(text)) return "Mobile App";
          if (/\b(?:dashboard|saas|portal|crm|erp|admin)\b/i.test(text)) return "Dashboard / SaaS";
          if (/\b(?:website|web|landing)\b/i.test(text)) return "Website";
          return null;
        },
      },
      {
        id: "prototype_depth",
        text: {
          english: "Do you need clickable Figma prototypes and a design system?",
          hindi: "क्या आपको क्लिक करने योग्य फ़िग्मा (Figma) प्रोटोटाइप और डिज़ाइन सिस्टम चाहिए?",
          hinglish: "Kya aapko clickable Figma prototypes aur design system chahiye?",
        },
        quickReplies: {
          english: ["Yes, full prototype", "Wireframes only", "Design system only"],
          hindi: ["हाँ, पूर्ण प्रोटोटाइप", "केवल वायरफ्रेम", "केवल डिज़ाइन सिस्टम"],
          hinglish: ["Yes, full prototype", "Wireframes only", "Design system only"],
        },
        extract: (text) => {
          if (/\b(?:full|complete|clickable|prototype|yes|haan)\b/i.test(text)) return "Yes, full prototype";
          if (/\b(?:wireframes?|rough|sketch)\b/i.test(text)) return "Wireframes only";
          if (/\b(?:system|components?|tokens)\b/i.test(text)) return "Design system only";
          return null;
        },
      },
      {
        id: "brand_identity",
        text: {
          english: "Do you already have brand guidelines and a logo?",
          hindi: "क्या आपके पास पहले से ब्रांड दिशानिर्देश और लोगो है?",
          hinglish: "Kya aapke paas already brand guidelines aur logo hai?",
        },
        quickReplies: {
          english: ["Yes", "No", "Need branding too"],
          hindi: ["हाँ", "नहीं", "ब्रांडिंग भी चाहिए"],
          hinglish: ["Yes", "No", "Need branding too"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|haan|already|have)\b/i.test(text)) return "Yes";
          if (/\b(?:need|branding|logo|new)\b/i.test(text)) return "Need branding too";
          if (/\b(?:no|nope|nah|nahi)\b/i.test(text)) return "No";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate budget for UI/UX design?",
          hindi: "UI/UX डिज़ाइन के लिए आपका अनुमानित बजट क्या है?",
          hinglish: "UI/UX design ke liye aapka approximate budget kitna hai?",
        },
        quickReplies: {
          english: ["Under ₹50,000", "₹50,000–₹1,00,000", "Above ₹1,00,000", "Flexible"],
          hindi: ["₹50,000 से कम", "₹50,000–₹1,00,000", "₹1,00,000 से अधिक", "लचीला (Flexible)"],
          hinglish: ["Under ₹50,000", "₹50,000–₹1,00,000", "Above ₹1,00,000", "Flexible"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
      {
        id: "timeline",
        text: {
          english: "When do you need the finalized design?",
          hindi: "आपको अंतिम डिज़ाइन कब तक चाहिए?",
          hinglish: "Aapko finalized design kab tak chahiye?",
        },
        quickReplies: {
          english: ["Within 2 weeks", "Within a month", "Flexible"],
          hindi: ["2 सप्ताह में", "1 महीने में", "लचीला (Flexible)"],
          hinglish: ["Within 2 weeks", "Within a month", "Flexible"],
        },
        extract: (text) => extractTimelineAnswer(text),
      },
    ],
  },

  cloud_devops: {
    serviceName: "Cloud & DevOps",
    questions: [
      {
        id: "cloud_platform",
        text: {
          english: "Which cloud platform do you prefer or currently use?",
          hindi: "आप कौन सा क्लाउड प्लेटफ़ॉर्म पसंद करते हैं या उपयोग कर रहे हैं?",
          hinglish: "Aap kaunsa cloud platform prefer karte hain ya use kar rahe hain?",
        },
        quickReplies: {
          english: ["AWS", "Google Cloud", "Docker / VPS", "Need recommendation"],
          hindi: ["AWS", "गूगल क्लाउड", "डॉकर / VPS", "सिफारिश चाहिए"],
          hinglish: ["AWS", "Google Cloud", "Docker / VPS", "Need recommendation"],
        },
        extract: (text) => {
          if (/\b(?:aws|amazon)\b/i.test(text)) return "AWS";
          if (/\b(?:gcp|google\s*cloud|google)\b/i.test(text)) return "Google Cloud";
          if (/\b(?:docker|vps|digitalocean|linode|hetzner)\b/i.test(text)) return "Docker / VPS";
          if (/\b(?:recommend|suggest|not\s+sure|pata\s+nahi)\b/i.test(text)) return "Need recommendation";
          return null;
        },
      },
      {
        id: "needs_cicd",
        text: {
          english: "Do you need automated CI/CD deployment pipelines configured?",
          hindi: "क्या आपको स्वचालित CI/CD डिप्लॉयमेंट पाइपलाइन चाहिए?",
          hinglish: "Kya aapko automated CI/CD deployment pipelines chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|haan|ci|cd|pipeline|github|gitlab|actions)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|manual)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "needs_db_ha",
        text: {
          english: "Do you require database optimization and high-availability scaling?",
          hindi: "क्या आपको डेटाबेस ऑप्टिमाइज़ेशन और उच्च-उपलब्धता स्केलिंग की आवश्यकता है?",
          hinglish: "Kya aapko database optimization aur high-availability scaling chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|haan|scale|scaling|ha|postgres|cluster)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|simple)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate budget for cloud setup?",
          hindi: "क्लाउड सेटअप के लिए आपका अनुमानित बजट क्या है?",
          hinglish: "Cloud setup ke liye aapka approximate budget kitna hai?",
        },
        quickReplies: {
          english: ["Under ₹50,000", "₹50,000–₹1,00,000", "Above ₹1,00,000", "Flexible"],
          hindi: ["₹50,000 से कम", "₹50,000–₹1,00,000", "₹1,00,000 से अधिक", "लचीला (Flexible)"],
          hinglish: ["Under ₹50,000", "₹50,000–₹1,00,000", "Above ₹1,00,000", "Flexible"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
      {
        id: "timeline",
        text: {
          english: "When would you like this configured?",
          hindi: "आप इसे कब तक कॉन्फ़िगर कराना चाहते हैं?",
          hinglish: "Aap ise kab tak configure karwana chahte hain?",
        },
        quickReplies: {
          english: ["Immediately", "Within 2 weeks", "Flexible"],
          hindi: ["तुरंत (Immediately)", "2 सप्ताह में", "लचीला (Flexible)"],
          hinglish: ["Immediately", "Within 2 weeks", "Flexible"],
        },
        extract: (text) => extractTimelineAnswer(text),
      },
    ],
  },

  seo_marketing: {
    serviceName: "SEO & Digital Growth",
    questions: [
      {
        id: "website_status",
        text: {
          english: "Is this for an existing website or a brand new business launch?",
          hindi: "क्या यह किसी मौजूदा वेबसाइट के लिए है या नए व्यवसाय के लिए?",
          hinglish: "Yeh existing website ke liye hai ya brand new business launch ke liye?",
        },
        quickReplies: {
          english: ["Existing website", "New business launch"],
          hindi: ["मौजूदा वेबसाइट", "नया व्यवसाय"],
          hinglish: ["Existing website", "New business launch"],
        },
        extract: (text) => {
          if (/\b(?:existing|current|already\s*live|old)\b/i.test(text)) return "Existing website";
          if (/\b(?:new|launch|fresh|start)\b/i.test(text)) return "New business launch";
          return null;
        },
      },
      {
        id: "target_market",
        text: {
          english: "Are you targeting local search rankings, nationwide India, or global?",
          hindi: "क्या आप स्थानीय (Local) सर्च रैंकिंग, पूरे भारत या वैश्विक स्तर को लक्षित कर रहे हैं?",
          hinglish: "Aap local search rankings, nationwide India ya global target kar rahe hain?",
        },
        quickReplies: {
          english: ["Local SEO", "Nationwide India", "Global market"],
          hindi: ["लोकल SEO (Local)", "अखिल भारतीय (India)", "ग्लोबल (Global)"],
          hinglish: ["Local SEO", "Nationwide India", "Global market"],
        },
        extract: (text) => {
          if (/\b(?:local|city|nearby|clinic|shop)\b/i.test(text)) return "Local SEO";
          if (/\b(?:india|national|countrywide)\b/i.test(text)) return "Nationwide India";
          if (/\b(?:global|world|international|usa|uk|worldwide)\b/i.test(text)) return "Global market";
          return null;
        },
      },
      {
        id: "scope_focus",
        text: {
          english: "Do you need monthly organic SEO, technical audits, or keyword ranking?",
          hindi: "क्या आपको मासिक ऑर्गेनिक SEO, तकनीकी ऑडिट या कीवर्ड रैंकिंग चाहिए?",
          hinglish: "Aapko monthly organic SEO, technical audit ya keyword ranking chahiye?",
        },
        quickReplies: {
          english: ["Monthly organic SEO", "Technical SEO audit", "Keyword ranking"],
          hindi: ["मासिक ऑर्गेनिक SEO", "तकनीकी SEO ऑडिट", "कीवर्ड रैंकिंग"],
          hinglish: ["Monthly organic SEO", "Technical SEO audit", "Keyword ranking"],
        },
        extract: (text) => {
          if (/\b(?:monthly|organic|complete|package)\b/i.test(text)) return "Monthly organic SEO";
          if (/\b(?:audit|technical|speed|fix)\b/i.test(text)) return "Technical SEO audit";
          if (/\b(?:keyword|rank|ranking|google)\b/i.test(text)) return "Keyword ranking";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate monthly budget for SEO & growth?",
          hindi: "SEO और विकास के लिए आपका अनुमानित मासिक बजट क्या है?",
          hinglish: "SEO aur growth ke liye aapka approximate monthly budget kitna hai?",
        },
        quickReplies: {
          english: ["Under ₹25,000/mo", "₹25,000–₹50,000/mo", "Above ₹50,000/mo", "Flexible"],
          hindi: ["₹25,000/माह से कम", "₹25,000–₹50,000/माह", "₹50,000/माह से अधिक", "लचीला (Flexible)"],
          hinglish: ["Under ₹25,000/mo", "₹25,000–₹50,000/mo", "Above ₹50,000/mo", "Flexible"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
      {
        id: "timeline",
        text: {
          english: "When would you like to start the campaign?",
          hindi: "आप यह अभियान कब से शुरू करना चाहते हैं?",
          hinglish: "Aap campaign kab start karna chahte hain?",
        },
        quickReplies: {
          english: ["This month", "Next month", "Flexible"],
          hindi: ["इसी महीने", "अगले महीने", "लचीला (Flexible)"],
          hinglish: ["This month", "Next month", "Flexible"],
        },
        extract: (text) => extractTimelineAnswer(text),
      },
    ],
  },
};

function extractBudgetAnswer(text) {
  const clean = text.toLowerCase();
  if (/\b(?:under\s*50|less\s*than\s*50|< ?50|below\s*50|50000\s*se\s*kam|50\s*k\s*se\s*kam|5k|10k|20k|30k|40k)\b/i.test(clean)) {
    return "Under ₹50,000";
  }
  if (/\b(?:50\s*k\s*(?:to|-)\s*1\s*l|50,000\s*(?:to|-)\s*1,00,000|50k|60k|70k|80k|90k|1\s*lakh)\b/i.test(clean)) {
    return "₹50,000–₹1,00,000";
  }
  if (/\b(?:1\s*l\s*(?:to|-)\s*2\s*l|1,00,000\s*(?:to|-)\s*2,00,000|1\.5\s*lakh|2\s*lakh)\b/i.test(clean)) {
    return "₹1,00,000–₹2,00,000";
  }
  if (/\b(?:above\s*2|more\s*than\s*2|> ?2|2\s*lakh\s*plus|3\s*lakh|5\s*lakh|enterprise)\b/i.test(clean)) {
    return "Above ₹2,00,000";
  }
  if (/\b(?:not\s+sure|don't\s+know|no\s+idea|tbd|pata\s+nahi|undecided|flexible)\b/i.test(clean)) {
    return "Not sure yet";
  }
  const match = text.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?\s*(?:k|lakh|lac)?)/i);
  if (match) {
    return match[0].startsWith("₹") ? match[0] : `₹${match[0]}`;
  }
  return null;
}

function extractTimelineAnswer(text) {
  const clean = text.toLowerCase();
  if (/\b(?:2\s*weeks?|two\s*weeks?|14\s*days?|urgent|asap|turant|immediately|jaldi)\b/i.test(clean)) {
    return "Within 2 weeks";
  }
  if (/\b(?:month|1\s*month|one\s*month|30\s*days?|char\s*hafte)\b/i.test(clean)) {
    return "Within a month";
  }
  if (/\b(?:1\s*(?:to|-)\s*3\s*months?|2\s*months?|3\s*months?|quarter)\b/i.test(clean)) {
    return "1–3 months";
  }
  if (/\b(?:flexible|no\s*rush|anytime|kabhi\s*bhi|aaram\s*se)\b/i.test(clean)) {
    return "Flexible";
  }
  return null;
}

/**
 * Detects if the visitor is initiating or switching services
 */
export function detectServiceIntent(message = "", currentService = null) {
  const clean = message.toLowerCase();

  // SEO & Digital Growth Intent
  if (/\b(?:seo|search\s*engine\s*optimization|digital\s*marketing|organic\s*traffic|google\s*ranking|seo\s*&\s*digital\s*growth)\b/i.test(clean)) {
    return "seo_marketing";
  }

  // UI/UX Design Intent
  if (/\b(?:ui\s*\/?\s*ux|uiux|wireframe|figma|prototype|prototyping|design\s*system|ui\s*\/?\s*ux\s*design)\b/i.test(clean)) {
    return "ui_ux";
  }

  // Cloud & DevOps Intent
  if (/\b(?:cloud|devops|aws|docker|ci\s*\/?\s*cd|kubernetes|server\s*setup|cloud\s*&\s*devops|cloud\s*infrastructure)\b/i.test(clean)) {
    return "cloud_devops";
  }

  // Mobile App Intent
  if (/\b(?:mobile\s*app|ios\s*app|android\s*app|flutter\s*app|react\s*native|build\s*an?\s*app|app\s*development|mobile\s*application|app\s+for|want\s+(?:an?\s+)?app|need\s+(?:an?\s+)?app|application\s+for|school\s*management\s*app)\b/i.test(clean)) {
    return "mobile_app";
  }

  // Custom Software & ERP Intent
  if (/\b(?:custom\s*software|erp|crm|inventory\s*software|billing\s*software|management\s*system|custom\s*software\s*&\s*erp|software\s*development|school\s*management|college\s*management|hospital\s*management|management\s*software)\b/i.test(clean)) {
    return "custom_software";
  }

  // AI Chatbot Intent
  if (/\b(?:ai\s*chatbot|chatbot|bot|whatsapp\s*bot|rag|support\s*bot|automated\s*agent|ai\s*agent|ai\s*chatbot\s*&\s*automation)\b/i.test(clean)) {
    return "ai_chatbot";
  }

  // Website & E-commerce Intent
  if (/\b(?:website|web\s*site|web\s*portal|web\s*page|landing\s*page|e-?commerce|online\s*store|clinic\s*website|business\s*website|web\s*platform|website\s*development)\b/i.test(clean)) {
    return "website";
  }

  // Generic Software / Web requirement
  if (/\b(?:build|develop|create|want|need)\s+(?:a|an)?\s*(?:new\s+)?(?:system|software|portal|platform)\b/i.test(clean)) {
    return currentService || "website";
  }

  return currentService || null;
}

/**
 * Formats all qualification answers into an informative inquiry string for the CRM lead
 */
export function formatQualificationInquiry(qualification) {
  if (!qualification || !qualification.service) return "Inquired via live chat widget";
  const flow = QUALIFICATION_FLOWS[qualification.service];
  const serviceName = flow ? flow.serviceName : qualification.service;
  const answers = qualification.answers || {};

  const parts = [];
  if (qualification.service === "website") {
    if (answers.is_business !== undefined) {
      parts.push(`Business: ${answers.is_business ? "Yes" : "No"}`);
    }
    if (answers.non_business_type) {
      parts.push(`Type: ${answers.non_business_type}`);
    }
    if (answers.is_redesign) {
      parts.push(`Project: ${answers.is_redesign}`);
    }
    if (answers.website_type) {
      parts.push(`Type: ${answers.website_type}`);
    }
    if (answers.needs_admin) {
      parts.push(`Admin Panel: ${answers.needs_admin}`);
    }
    if (answers.needs_payment) {
      parts.push(`Online Payments: ${answers.needs_payment}`);
    }
  } else if (qualification.service === "mobile_app") {
    if (answers.platform) parts.push(`Platform: ${answers.platform}`);
    if (answers.is_new_app) parts.push(`App Type: ${answers.is_new_app}`);
    if (answers.needs_backend) parts.push(`Backend/Admin: ${answers.needs_backend}`);
    if (answers.needs_integrations) parts.push(`Integrations: ${answers.needs_integrations}`);
  } else if (qualification.service === "ai_chatbot") {
    if (answers.channel) parts.push(`Channel: ${answers.channel}`);
    if (answers.purpose) parts.push(`Purpose: ${answers.purpose}`);
    if (answers.needs_docs) parts.push(`Document RAG: ${answers.needs_docs}`);
    if (answers.needs_crm) parts.push(`CRM Sync: ${answers.needs_crm}`);
  } else if (qualification.service === "custom_software") {
    if (answers.system_type) parts.push(`System: ${answers.system_type}`);
    if (answers.has_existing_data) parts.push(`Existing Data: ${answers.has_existing_data}`);
    if (answers.needs_role_access) parts.push(`Role Access: ${answers.needs_role_access}`);
  } else if (qualification.service === "ui_ux") {
    if (answers.design_target) parts.push(`Target: ${answers.design_target}`);
    if (answers.prototype_depth) parts.push(`Scope: ${answers.prototype_depth}`);
    if (answers.brand_identity) parts.push(`Branding: ${answers.brand_identity}`);
  } else if (qualification.service === "cloud_devops") {
    if (answers.cloud_platform) parts.push(`Platform: ${answers.cloud_platform}`);
    if (answers.needs_cicd) parts.push(`CI/CD: ${answers.needs_cicd}`);
    if (answers.needs_db_ha) parts.push(`High Availability: ${answers.needs_db_ha}`);
  } else if (qualification.service === "seo_marketing") {
    if (answers.website_status) parts.push(`Status: ${answers.website_status}`);
    if (answers.target_market) parts.push(`Market: ${answers.target_market}`);
    if (answers.scope_focus) parts.push(`Focus: ${answers.scope_focus}`);
  }

  if (answers.budget) parts.push(`Budget: ${answers.budget}`);
  if (answers.timeline) parts.push(`Timeline: ${answers.timeline}`);

  if (parts.length === 0) {
    return `${serviceName} Inquiry (In progress)`;
  }
  return `${serviceName}: ${parts.join(" | ")}`;
}

/**
 * Recovers qualification state from session history if existingQualification is missing
 */
export function recoverQualificationFromHistory(sessionHistory = []) {
  if (!Array.isArray(sessionHistory) || sessionHistory.length === 0) return null;

  let service = null;
  const askedQuestions = [];
  const answers = {};

  for (const m of sessionHistory) {
    const text = m.content || "";
    if (m.role === "assistant") {
      if (/website\s+for\s+your\s+business|new\s+website\s+or\s+a\s+redesign|business\s+website,\s+e-commerce/i.test(text)) {
        service = "website";
      } else if (/Android\s+app,\s+iOS\s+app|new\s+app\s+or\s+an\s+extension/i.test(text)) {
        service = "mobile_app";
      } else if (/chatbot\s+for\s+your\s+website|answer\s+from\s+your\s+company\s+documents/i.test(text)) {
        service = "ai_chatbot";
      } else if (/enterprise\s+ERP|CRM\s+&\s+sales|databases\s+or\s+spreadsheets/i.test(text)) {
        service = "custom_software";
      } else if (/UI\/UX\s+design|Figma\s+prototypes|brand\s+guidelines/i.test(text)) {
        service = "ui_ux";
      } else if (/cloud\s+platform|CI\/CD\s+deployment|database\s+optimization/i.test(text)) {
        service = "cloud_devops";
      } else if (/organic\s+SEO|target\s+market|Local\s+SEO/i.test(text)) {
        service = "seo_marketing";
      }
    } else if (m.role === "user" && !service) {
      const detected = detectServiceIntent(text);
      if (detected) service = detected;
    }
  }

  if (!service) return null;
  const flow = QUALIFICATION_FLOWS[service];
  if (!flow) return null;

  for (let i = 0; i < sessionHistory.length; i++) {
    const msg = sessionHistory[i];
    if (msg.role === "assistant") {
      const astText = msg.content || "";
      for (const q of flow.questions) {
        if (
          astText.includes(q.text.english) ||
          astText.includes(q.text.hindi) ||
          astText.includes(q.text.hinglish) ||
          (q.id === "is_business" && /website\s+for\s+your\s+business/i.test(astText)) ||
          (q.id === "is_redesign" && /new\s+website\s+or\s+(?:a\s+)?redesign/i.test(astText)) ||
          (q.id === "website_type" && /e-commerce\s+store,\s+portfolio/i.test(astText)) ||
          (q.id === "needs_admin" && /admin\s+panel/i.test(astText)) ||
          (q.id === "needs_payment" && /payment/i.test(astText)) ||
          (q.id === "budget" && /budget/i.test(astText)) ||
          (q.id === "timeline" && /launch/i.test(astText)) ||
          (q.id === "platform" && /Android\s+app,\s+iOS\s+app/i.test(astText))
        ) {
          if (!askedQuestions.includes(q.id)) askedQuestions.push(q.id);
          for (let j = i + 1; j < sessionHistory.length; j++) {
            if (sessionHistory[j].role === "user") {
              const uText = sessionHistory[j].content || "";
              const ans = q.extract(uText);
              if (ans !== null && ans !== undefined) {
                answers[q.id] = ans;
              }
              break;
            }
          }
        }
      }
    }
  }

  return {
    service,
    answers,
    askedQuestions,
    currentStage: askedQuestions[askedQuestions.length - 1] || "init",
    status: "in_progress",
    consentAsked: false,
  };
}

/**
 * Extracts multiple requirements from user message across flow definitions
 */
export function extractAnswersFromMessage(message = "", service = "website", currentAnswers = {}) {
  const flow = QUALIFICATION_FLOWS[service];
  if (!flow) return currentAnswers;

  const updated = { ...currentAnswers };

  for (const q of flow.questions) {
    if (typeof q.condition === "function" && !q.condition(updated)) {
      continue;
    }
    if (updated[q.id] === undefined || updated[q.id] === null || updated[q.id] === "") {
      const extracted = q.extract(message);
      if (extracted !== null && extracted !== undefined) {
        updated[q.id] = extracted;
      }
    }
  }

  return updated;
}

/**
 * Gets the next unanswered question in the qualification flow
 */
export function getNextQuestion(service = "website", answers = {}, lang = "english") {
  const flow = QUALIFICATION_FLOWS[service];
  if (!flow) return null;

  for (const q of flow.questions) {
    if (typeof q.condition === "function" && !q.condition(answers)) {
      continue;
    }
    if (answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === "") {
      const qText = q.text[lang] || q.text.english;
      const qReplies = q.quickReplies[lang] || q.quickReplies.english;
      return {
        id: q.id,
        text: qText,
        quickReplies: qReplies,
        isFinal: false,
      };
    }
  }

  return null;
}

/**
 * Generates concise summary of the customer's project requirements
 */
export function generateRequirementsSummary(service = "website", answers = {}, lang = "english") {
  const serviceTitle = QUALIFICATION_FLOWS[service]?.serviceName || "Digital Project";
  const parts = [];

  if (service === "website") {
    if (answers.is_business === false && answers.non_business_type) {
      parts.push(answers.non_business_type);
    } else {
      if (answers.website_type) parts.push(answers.website_type);
      if (answers.is_redesign) parts.push(answers.is_redesign === "Redesign" ? "redesign" : "new build");
      if (answers.needs_admin === "Yes") parts.push("with admin panel");
      if (answers.needs_payment === "Yes") parts.push("online payment gateway");
    }
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`target launch: ${answers.timeline}`);
  } else if (service === "mobile_app") {
    if (answers.platform) parts.push(answers.platform);
    if (answers.is_new_app) parts.push(answers.is_new_app);
    if (answers.needs_backend === "Yes") parts.push("with custom backend");
    if (answers.needs_payment === "Yes") parts.push("payment integrations");
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`target launch: ${answers.timeline}`);
  } else if (service === "ai_chatbot") {
    if (answers.channel) parts.push(`for ${answers.channel}`);
    if (answers.purpose) parts.push(`purpose: ${answers.purpose}`);
    if (answers.needs_docs === "Yes") parts.push("document-trained RAG");
    if (answers.needs_crm === "Yes") parts.push("CRM integration");
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`timeline: ${answers.timeline}`);
  } else if (service === "custom_software") {
    if (answers.system_type) parts.push(answers.system_type);
    if (answers.has_existing_data === "Yes") parts.push("with data migration");
    if (answers.needs_role_access === "Yes") parts.push("role-based access");
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`target deploy: ${answers.timeline}`);
  } else if (service === "ui_ux") {
    if (answers.design_target) parts.push(`for ${answers.design_target}`);
    if (answers.prototype_depth) parts.push(answers.prototype_depth);
    if (answers.brand_identity) parts.push(`branding: ${answers.brand_identity}`);
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`timeline: ${answers.timeline}`);
  } else if (service === "cloud_devops") {
    if (answers.cloud_platform) parts.push(`on ${answers.cloud_platform}`);
    if (answers.needs_cicd === "Yes") parts.push("automated CI/CD");
    if (answers.needs_db_ha === "Yes") parts.push("high-availability architecture");
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`timeline: ${answers.timeline}`);
  } else if (service === "seo_marketing") {
    if (answers.website_status) parts.push(`for ${answers.website_status}`);
    if (answers.target_market) parts.push(`targeting ${answers.target_market}`);
    if (answers.scope_focus) parts.push(answers.scope_focus);
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`start: ${answers.timeline}`);
  }

  const specString = parts.length > 0 ? parts.join(", ") : "custom features";

  if (lang === "hindi") {
    return `शानदार! मैंने आपकी **${serviceTitle}** आवश्यकताओं को संक्षेप में नोट कर लिया है: ${specString}।`;
  }
  if (lang === "hinglish") {
    return `Great! Maine aapke **${serviceTitle}** requirements note kar liye hain: ${specString}.`;
  }
  return `Great! I've summarized your **${serviceTitle}** requirements: ${specString}.`;
}

/**
 * Checks if the user is asking a direct business question mid-flow
 */
export function detectDirectBusinessQuestion(message = "") {
  const clean = message.toLowerCase();

  if (/\b(?:what\s+is\s+your\s+starting\s+budget|how\s+much\s+does\s+it\s+cost|what\s+are\s+your\s+rates|minimum\s+budget|starting\s+price)\b/i.test(clean)) {
    return {
      type: "pricing",
      briefReply: {
        english: "Our custom development packages typically start from ₹50,000 (18% GST extra).",
        hindi: "हमारे कस्टम डेवलपमेंट पैकेज आमतौर पर ₹50,000 से शुरू होते हैं (18% GST अतिरिक्त)।",
        hinglish: "Hamare custom development packages typically ₹50,000 se start hote hain (18% GST extra).",
      },
    };
  }

  if (/\b(?:what\s+are\s+your\s+recent\s+projects|share\s+portfolio|case\s+studies|past\s+work)\b/i.test(clean)) {
    return {
      type: "portfolio",
      briefReply: {
        english: "ESS has delivered 50+ production systems across mobile apps, SaaS web platforms, and custom AI pipelines.",
        hindi: "ESS ने मोबाइल ऐप्स, सास वेब प्लेटफॉर्म और कस्टम एआई सिस्टम में 50 से अधिक सफल प्रोजेक्ट्स डिलीवर किए हैं।",
        hinglish: "ESS ne mobile apps, SaaS web platforms aur custom AI pipelines mein 50+ successful projects deliver kiye hain.",
      },
    };
  }

  if (/\b(?:which\s+tech\s*stack|what\s+technologies|do\s+you\s+use\s+flutter|next\.?js)\b/i.test(clean)) {
    return {
      type: "tech_stack",
      briefReply: {
        english: "We engineer enterprise solutions using Next.js, React, Node.js, Flutter, and PostgreSQL.",
        hindi: "हम Next.js, React, Node.js, Flutter और PostgreSQL का उपयोग करके उच्च-प्रदर्शन समाधान बनाते हैं।",
        hinglish: "Hum Next.js, React, Node.js, Flutter aur PostgreSQL use karke high-performance solutions engineer karte hain.",
      },
    };
  }

  return null;
}

/**
 * Main Consultative Sales Flow Coordinator
 */
export function handleSalesFlowTurn({
  message = "",
  existingQualification = null,
  currentQualification = null,
  sessionHistory = [],
  lang = "english",
  visitorName = "",
  visitorPhone = "",
  visitorEmail = "",
  contactRecorded: contactRecordedParam = "",
}) {
  const cleanMsg = message.trim();
  const contactRecorded = contactRecordedParam || visitorPhone || visitorEmail || "";
  const existing = existingQualification || currentQualification;
  let current = existing
    ? { ...existing }
    : {
        service: null,
        answers: {},
        askedQuestions: [],
        currentStage: "init",
        status: "idle",
        consentAsked: false,
      };

  // 0. Auto-recover service and qualification from sessionHistory if missing
  if (!current.service && Array.isArray(sessionHistory) && sessionHistory.length > 0) {
    const recovered = recoverQualificationFromHistory(sessionHistory);
    if (recovered && recovered.service) {
      current.service = recovered.service;
      current.answers = { ...(recovered.answers || {}), ...(current.answers || {}) };
      current.askedQuestions = Array.from(new Set([...(recovered.askedQuestions || []), ...(current.askedQuestions || [])]));
      current.currentStage = recovered.currentStage;
      current.status = "in_progress";
    }
  }

  // 1. Detect service or switch of service
  const detectedService = detectServiceIntent(cleanMsg, current.service);
  const serviceChanged = Boolean(detectedService && current.service && detectedService !== current.service);

  if (serviceChanged) {
    current.service = detectedService;
    current.answers = {};
    current.askedQuestions = [];
    current.status = "in_progress";
    current.consentAsked = false;
  } else if (detectedService && !current.service) {
    current.service = detectedService;
    current.status = "in_progress";
  }

  const isPureServiceSelection = ALL_ESS_SERVICES.some(
    (s) => s.toLowerCase() === cleanMsg.toLowerCase()
  );

  // If user explicitly clicks or enters a pure service name, allow starting a fresh qualification
  if (isPureServiceSelection && detectedService) {
    current.service = detectedService;
    current.answers = {};
    current.askedQuestions = [];
    current.status = "in_progress";
    current.consentAsked = false;
  } else if (current.status === "completed" && !serviceChanged) {
    return { shouldHandle: false };
  }

  const cleanVisitorName = (visitorName && typeof visitorName === "string" && !/^(?:there|website visitor|website prospect|visitor|prospect|user|guest)$/i.test(visitorName.trim()))
    ? visitorName.trim()
    : "";
  const hasRealName = Boolean(cleanVisitorName);

  // 2. Check if user already provided consent or submitted contact details
  if (current.consentAsked) {
    if (Boolean(contactRecorded) || /\b(?:yes|contact\s*me|sure|okay|definitely|call\s*me|haan|kar\s*lo|theek\s*hai)\b/i.test(cleanMsg)) {
      current.status = "completed";
      const serviceTitle = QUALIFICATION_FLOWS[current.service]?.serviceName || "Digital Project";
      const promptText = contactRecorded
        ? (lang === "hindi"
            ? `शानदार! धन्यवाद ${cleanVisitorName || ""}! हमने आपके **${serviceTitle}** प्रोजेक्ट के लिए आपका संपर्क नंबर (**${contactRecorded}**) सुरक्षित रूप से नोट कर लिया है।\n\nहमारी तकनीकी टीम जल्द ही एक कस्टमाइज्ड प्रस्ताव और कार्ययोजना के साथ आपसे संपर्क करेगी! 🚀`
            : lang === "hinglish"
            ? `Great! Thank you ${cleanVisitorName || ""}! Humne aapke **${serviceTitle}** project ke liye aapka contact number (**${contactRecorded}**) note kar liya hai.\n\nHamari technical team jald hi customized proposal aur project roadmap ke saath aapse connect karegi! 🚀`
            : (hasRealName
                ? `Thank you, ${cleanVisitorName}! We have recorded your contact number (**${contactRecorded}**) for your **${serviceTitle}** project.\n\nOur technical team will reach out to you shortly with a customized proposal and project roadmap! 🚀`
                : `Thank you! We have recorded your contact number (**${contactRecorded}**) for your **${serviceTitle}** project.\n\nOur technical team will reach out to you shortly with a customized proposal and project roadmap! 🚀`))
        : (lang === "hindi"
            ? (hasRealName ? `धन्यवाद ${cleanVisitorName}! कृपया अपना **फ़ोन नंबर (या WhatsApp)** साझा करें ताकि हमारी तकनीकी टीम आपसे संपर्क कर सके।` : "कृपया अपना **नाम और फ़ोन नंबर (या WhatsApp)** साझा करें ताकि हमारी तकनीकी टीम आपसे संपर्क कर सके और कस्टमाइज्ड प्रस्ताव तैयार कर सके।")
            : lang === "hinglish"
            ? (hasRealName ? `Thank you ${cleanVisitorName}! Please apna **Phone Number (ya WhatsApp)** share karein taaki hamari technical team aapse connect karein.` : "Please apna **Name aur Phone Number (ya WhatsApp)** share karein taaki hamari technical team aapse connect kar sakein aur customized proposal share kar sakein.")
            : (hasRealName ? `Thank you, ${cleanVisitorName}! Could you please share your **Phone Number (or WhatsApp)** so our technical team can prepare your proposal?` : "Could you please share your **Name and Phone Number (or WhatsApp)** so our technical team can reach out to you with a customized proposal?"));
      return {
        shouldHandle: true,
        reply: promptText,
        quickReplies: contactRecorded ? ["Tell me about ESS", "Recent projects", "Office location"] : [],
        updatedQualification: current,
        leadDataToSave: {
          service: current.service,
          answers: current.answers,
          summary: formatQualificationInquiry(current),
        },
      };
    } else if (/\b(?:no|not\s*now|later|nahi|badme|baad\s*mein|not\s*right\s*now)\b/i.test(cleanMsg)) {
      current.status = "completed";
      const replyText = lang === "hindi"
        ? "बिल्कुल! यदि आपके कोई अन्य तकनीकी प्रश्न हैं, तो मैं यहाँ सहायता के लिए उपलब्ध हूँ।"
        : lang === "hinglish"
        ? "Bilkul koi baat nahi! Agar aapka koi aur technical ya project question hai, toh main yahan help ke liye hoon."
        : "No problem at all! Feel free to ask any other technical or business questions when you're ready.";
      return {
        shouldHandle: true,
        reply: replyText,
        quickReplies: ["Tell me about ESS", "Recent projects", "Tech stack"],
        updatedQualification: current,
        leadDataToSave: {
          service: current.service,
          answers: current.answers,
          summary: formatQualificationInquiry(current),
        },
      };
    }
  }

  // 3. Extract answers from incoming message across all attributes
  // If user simply clicked a service button, do not treat the service name as an answer to question 0
  if (!isPureServiceSelection) {
    // Prioritize answering currentStage if cleanMsg is a direct reply like "Yes", "No", "New website", etc.
    if (current.currentStage && current.service) {
      const flow = QUALIFICATION_FLOWS[current.service];
      const currentQ = flow?.questions.find((q) => q.id === current.currentStage);
      if (currentQ && (current.answers[currentQ.id] === undefined || current.answers[currentQ.id] === null)) {
        const singleAns = currentQ.extract(cleanMsg);
        if (singleAns !== null && singleAns !== undefined) {
          current.answers[currentQ.id] = singleAns;
        }
      }
    }

    current.answers = extractAnswersFromMessage(cleanMsg, current.service, current.answers);
  }

  // 4. Check if user asked a direct question mid-flow
  const directQ = detectDirectBusinessQuestion(cleanMsg);
  const briefAnswer = directQ ? directQ.briefReply[lang] || directQ.briefReply.english : null;

  // 5. Find the next unanswered qualification question
  const nextQ = getNextQuestion(current.service, current.answers, lang);

  if (nextQ) {
    current.askedQuestions = Array.from(new Set([...current.askedQuestions, nextQ.id]));
    current.currentStage = nextQ.id;

    let finalReply = nextQ.text;
    if (briefAnswer) {
      finalReply = `${briefAnswer} ${nextQ.text}`;
    }

    return {
      shouldHandle: true,
      reply: finalReply,
      quickReplies: nextQ.quickReplies,
      updatedQualification: current,
      leadDataToSave: {
        service: current.service,
        answers: current.answers,
        summary: formatQualificationInquiry(current),
      },
    };
  }

  // 6. All qualification questions answered! Present brief summary and finalize lead
  const summary = generateRequirementsSummary(current.service, current.answers, lang);
  const serviceTitle = QUALIFICATION_FLOWS[current.service]?.serviceName || "Digital Project";

  if (contactRecorded) {
    current.status = "completed";
    current.consentAsked = false;

    const completionText = lang === "hindi"
      ? `शानदार! मैंने आपकी **${serviceTitle}** आवश्यकताओं को नोट कर लिया है।\n\n${hasRealName ? `धन्यवाद ${cleanVisitorName}! ` : "धन्यवाद! "}हमारी तकनीकी टीम के पास आपका संपर्क विवरण (**${contactRecorded}**) दर्ज है और वे जल्द ही एक कस्टमाइज्ड प्रस्ताव और कार्ययोजना के साथ आपसे संपर्क करेंगे! 🚀`
      : lang === "hinglish"
      ? `Great! Humne aapke **${serviceTitle}** project ki saari requirements note kar li hain.\n\n${hasRealName ? `Thank you ${cleanVisitorName}! ` : "Thank you! "}Hamari technical team ke paas aapka contact details (**${contactRecorded}**) recorded hai aur hamari team jald hi customized proposal ke saath aapse connect karegi! 🚀`
      : (hasRealName
          ? `Great! We have recorded all your requirements for your **${serviceTitle}** project.\n\nThank you, ${cleanVisitorName}! Our technical team has your contact details (**${contactRecorded}**) and will reach out to you shortly with a customized proposal and project roadmap! 🚀`
          : `Great! We have recorded all your requirements for your **${serviceTitle}** project.\n\nThank you! Our technical team has your contact details (**${contactRecorded}**) and will reach out to you shortly with a customized proposal and project roadmap! 🚀`);

    return {
      shouldHandle: true,
      reply: completionText,
      quickReplies: ["Tell me about ESS", "Recent projects", "Office location"],
      updatedQualification: current,
      leadDataToSave: {
        service: current.service,
        answers: current.answers,
        summary: summary,
      },
    };
  }

  current.status = "summary_ready";
  current.consentAsked = true;

  const consentPrompt = lang === "hindi"
    ? (hasRealName
        ? `${summary}\n\nधन्यवाद ${cleanVisitorName}! क्या आप अपना **फ़ोन नंबर (या WhatsApp)** साझा कर सकते हैं ताकि हमारी तकनीकी टीम आपसे सीधे संपर्क कर सके?`
        : `${summary}\n\nकृपया अपना **नाम और फ़ोन नंबर (या WhatsApp)** साझा करें ताकि हमारी तकनीकी टीम आपसे सीधे संपर्क कर सके और कस्टमाइज्ड प्रस्ताव तैयार कर सके।`)
    : lang === "hinglish"
    ? (hasRealName
        ? `${summary}\n\nThank you ${cleanVisitorName}! Please apna **Phone Number (ya WhatsApp)** share karein taaki hamari technical team aapse connect kar sake!`
        : `${summary}\n\nPlease apna **Name aur Phone Number (ya WhatsApp)** share karein taaki hamari technical team aapse connect kar sake aur customized proposal share kar sake!`)
    : (hasRealName
        ? `${summary}\n\nThank you, ${cleanVisitorName}! Could you please share your **Phone Number (or WhatsApp)** so our technical team can reach out to you with a customized proposal?`
        : `${summary}\n\nCould you please share your **Name and Phone Number (or WhatsApp)** so our technical team can reach out to you with a customized proposal?`);

  return {
    shouldHandle: true,
    reply: consentPrompt,
    quickReplies: [],
    updatedQualification: current,
    leadDataToSave: {
      service: current.service,
      answers: current.answers,
      summary: summary,
    },
  };
}
