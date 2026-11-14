/* v0.3 screens: WhatsApp assistant, Official links card, Pathik Mitra app, Seva Ledger, disclaimer. */
(function () {
  var X = {
    en: {
      disclaimer: 'Independent student initiative, not a government service. Sample data for demonstration.',
      wa_open: 'Open in WhatsApp', go_wa: 'Try the WhatsApp assistant', go_mitra: 'Pathik Mitra app (volunteers)', go_ledger: 'Seva Ledger (public)', go_official: 'Official booking sites',
      more_title: 'More', more_sub: 'The other sides of DevBhumi',
      wa_name: 'DevBhumi', wa_sub: 'Bharosa QR helpline', wa_note: 'Demo simulation of the WhatsApp number. At launch the same replies come from the DevBhumi server.',
      wa_type: 'Type a message', wa_send: 'Send', wa_voice: 'Send a voice note', wa_reset: 'Restart chat', wa_try: 'Try',
      wa_link_sample: 'Forward a booking link',
      official_title: 'Official booking sites', official_sub: 'These are the only official booking sites. This card is printed and placed at ghats, stations and temple gates.',
      official_never: 'Never pay through a link sent by a stranger. Check any link first.', official_print: 'Print this card', official_check: 'Check a link, phone or UPI',
      official_portal: 'West Bengal homestay registration: add the State portal link once the District Tourism office confirms it.',
      mitra_title: 'Pathik Mitra', mitra_who: 'Riya · Bardhaman · Tourist Facilitator (Basic) certified', mitra_note: 'Volunteer app. Works offline at the ghats and syncs when there is signal.',
      mitra_signal: 'No signal (field mode)', mitra_outbox: 'Checks waiting to sync: {n}', mitra_sync: 'Sync now', mitra_synced: 'All checks are synced.',
      mitra_queue: "Today's visits", mitra_empty: 'No visits due. Well done!', mitra_stats: 'This week: {n} in-person checks',
      reason_far_scan: 'Badge scanned {km} km away: check for a copied sticker', reason_recheck: 'Re-check due: last checked {n} days ago', reason_new: 'New sign-up {n} days ago: first visit',
      check_title: 'Verification checklist', ck_intro: 'Tick only what you saw yourself today.',
      ck_id_seen: 'Original ID document seen', ck_reg_seen: 'Vehicle or premises registration seen (TTEN, VAHAN or successor)', ck_photos: 'Photos taken (face, and vehicle or door)',
      ck_price_sheet_signed: 'Price sheet signed by the provider', ck_consent_signed: 'Written consent signed (what visitors will see)',
      ck_state_portal: 'Registered on the State homestay portal (needed for the Homestay tag)', ck_sticker_matches: 'Sticker is on the right vehicle; face and plate match',
      ck_reg4: 'Last 4 characters of the registration', ck_prices: 'Prices the provider quoted (full price, no extras)', ck_save: 'Save check',
      res_saved_offline: 'Saved on this phone. It will sync when there is signal.', res_complete: 'Check complete', res_incomplete: 'Saved, but not complete. No badge until these are done:',
      res_audit: 'Selected for a faculty spot-audit (about 1 in 10 checks).', res_refreshed: '{name} now shows today as the last check.',
      res_link: 'Link a new Bharosa QR', res_code: 'Badge number printed on the sticker', res_link_btn: 'Link badge', res_linked: 'Badge {code} linked. {name} now appears to visitors.',
      res_open_card: 'Open the visitor card', back_queue: "Back to today's visits", err_code_in_use: 'This badge number is already in use.', err_bad_code: 'Use the format KLN-0000.',
      ledger_title: 'Seva Ledger', ledger_sub: 'Public, site by site. Totals only: no names, phone numbers or personal records.', ledger_site: 'Bardhaman · demo site',
      l_verified: 'Verified providers', l_trusted: 'of them Trusted (gold)', l_recheck: 'Due for re-check', l_women: 'Women-run, verified',
      l_scans: 'Badge scans (enquiries)', l_help: 'Help requests routed', l_checks: 'In-person checks by Pathik Mitras', l_rupees: 'Provider-confirmed spend reaching local people',
      l_complaints: 'Complaints received', l_resolved: 'Resolved within 48 hours', l_open: 'Being mediated now', l_fake: 'Fake-badge reports',
      ledger_trust: 'Trust', ledger_use: 'Use', ledger_fair: 'Fair resolution', ledger_outcomes: 'Recent complaint outcomes',
      out_refund: 'Overcharge refunded', out_apology: 'Apology accepted', out_warning: 'Formal warning; re-check booked', out_sticker_removed: 'Copied sticker removed',
      out_open: 'Registered · mediation within 48 h', out_mediating: 'Being mediated', out_resolved: 'Resolved', out_rejected: 'Closed', out_yours: 'yours',
      hours_n: 'in {n} h', ledger_live: 'Includes {n} action(s) you made in this demo.', ledger_note: 'Sample history plus your demo actions. Nabadwip joins in February 2027.',
      ledger_open_data: 'The same totals are shared free with the district as an open data feed.', report_sent: 'Fake-badge report F-{id} is registered. A Pathik Mitra will check the sticker.',
      report_title: 'Report a fake badge', report_where: 'Where did you see it? (optional)', report_btn: 'Send report'
    },
    hi: {
      disclaimer: 'स्वतंत्र छात्र पहल, सरकारी सेवा नहीं। प्रदर्शन के लिए नमूना डेटा।',
      wa_open: 'WhatsApp में खोलें', go_wa: 'WhatsApp सहायक आज़माएँ', go_mitra: 'पथिक मित्र ऐप (स्वयंसेवक)', go_ledger: 'सेवा लेजर (सार्वजनिक)', go_official: 'आधिकारिक बुकिंग साइटें',
      more_title: 'और देखें', more_sub: 'देवभूमि के दूसरे हिस्से',
      wa_name: 'देवभूमि', wa_sub: 'भरोसा QR हेल्पलाइन', wa_note: 'WhatsApp नंबर का डेमो। शुरू होने पर यही जवाब देवभूमि सर्वर से आएँगे।',
      wa_type: 'संदेश लिखें', wa_send: 'भेजें', wa_voice: 'वॉइस नोट भेजें', wa_reset: 'चैट फिर से शुरू करें', wa_try: 'आज़माएँ',
      wa_link_sample: 'बुकिंग लिंक फ़ॉरवर्ड करें',
      official_title: 'आधिकारिक बुकिंग साइटें', official_sub: 'केवल यही आधिकारिक बुकिंग साइटें हैं। यह कार्ड छापकर घाटों, स्टेशनों और मंदिर द्वारों पर लगाया जाता है।',
      official_never: 'किसी अनजान व्यक्ति के भेजे लिंक से कभी पैसे न दें। पहले लिंक जाँचें।', official_print: 'यह कार्ड छापें', official_check: 'लिंक, फ़ोन या UPI जाँचें',
      official_portal: 'पश्चिम बंगाल होमस्टे पंजीकरण: ज़िला पर्यटन कार्यालय से पुष्टि होने पर राज्य पोर्टल का लिंक जोड़ा जाएगा।',
      mitra_title: 'पथिक मित्र', mitra_who: 'रिया · बर्धमान · टूरिस्ट फ़ैसिलिटेटर (बेसिक) प्रमाणित', mitra_note: 'स्वयंसेवक ऐप। घाटों पर बिना नेटवर्क के चलता है और सिग्नल मिलने पर सिंक होता है।',
      mitra_signal: 'नेटवर्क नहीं (फ़ील्ड मोड)', mitra_outbox: 'सिंक के लिए बाकी जाँचें: {n}', mitra_sync: 'अभी सिंक करें', mitra_synced: 'सभी जाँचें सिंक हो गईं।',
      mitra_queue: 'आज की विज़िट', mitra_empty: 'कोई विज़िट बाकी नहीं। बहुत बढ़िया!', mitra_stats: 'इस सप्ताह: {n} जाँचें खुद जाकर',
      reason_far_scan: 'बैज {km} किमी दूर स्कैन हुआ: नकली स्टिकर की जाँच करें', reason_recheck: 'दोबारा जाँच बाकी: पिछली जाँच {n} दिन पहले', reason_new: '{n} दिन पहले नया पंजीकरण: पहली विज़िट',
      check_title: 'सत्यापन सूची', ck_intro: 'केवल वही चुनें जो आपने आज खुद देखा।',
      ck_id_seen: 'मूल पहचान पत्र देखा', ck_reg_seen: 'वाहन या परिसर का पंजीकरण देखा (TTEN, VAHAN या नया)', ck_photos: 'फ़ोटो लीं (चेहरा, और वाहन या दरवाज़ा)',
      ck_price_sheet_signed: 'सेवा देने वाले ने दाम की सूची पर हस्ताक्षर किए', ck_consent_signed: 'लिखित सहमति पर हस्ताक्षर (यात्रियों को क्या दिखेगा)',
      ck_state_portal: 'राज्य होमस्टे पोर्टल पर पंजीकृत (होमस्टे टैग के लिए ज़रूरी)', ck_sticker_matches: 'स्टिकर सही वाहन पर है; चेहरा और प्लेट मेल खाते हैं',
      ck_reg4: 'पंजीकरण के आख़िरी 4 अक्षर', ck_prices: 'सेवा देने वाले के बताए दाम (पूरा दाम, कोई अतिरिक्त शुल्क नहीं)', ck_save: 'जाँच सहेजें',
      res_saved_offline: 'इस फ़ोन पर सहेजा गया। सिग्नल मिलने पर सिंक होगा।', res_complete: 'जाँच पूरी', res_incomplete: 'सहेजा गया, पर अधूरा है। ये पूरे होने तक बैज नहीं मिलेगा:',
      res_audit: 'शिक्षक द्वारा औचक जाँच के लिए चुना गया (लगभग 10 में से 1)।', res_refreshed: '{name} पर अब आज की तारीख़ आख़िरी जाँच के रूप में दिखती है।',
      res_link: 'नया भरोसा QR जोड़ें', res_code: 'स्टिकर पर छपा बैज नंबर', res_link_btn: 'बैज जोड़ें', res_linked: 'बैज {code} जुड़ गया। {name} अब यात्रियों को दिखेंगे।',
      res_open_card: 'यात्री कार्ड खोलें', back_queue: 'आज की विज़िट पर लौटें', err_code_in_use: 'यह बैज नंबर पहले से उपयोग में है।', err_bad_code: 'KLN-0000 के रूप में लिखें।',
      ledger_title: 'सेवा लेजर', ledger_sub: 'सार्वजनिक, हर स्थान के लिए। केवल कुल संख्या: कोई नाम, फ़ोन नंबर या निजी रिकॉर्ड नहीं।', ledger_site: 'बर्धमान · डेमो स्थान',
      l_verified: 'सत्यापित सेवा देने वाले', l_trusted: 'इनमें भरोसेमंद (सुनहरे)', l_recheck: 'दोबारा जाँच बाकी', l_women: 'महिलाओं द्वारा, सत्यापित',
      l_scans: 'बैज स्कैन (पूछताछ)', l_help: 'मदद के अनुरोध भेजे गए', l_checks: 'पथिक मित्रों की खुद जाकर जाँच', l_rupees: 'स्थानीय लोगों तक पहुँचा खर्च (सेवा देने वालों द्वारा पुष्टि)',
      l_complaints: 'शिकायतें मिलीं', l_resolved: '48 घंटे में सुलझीं', l_open: 'अभी बातचीत जारी', l_fake: 'नकली बैज की रिपोर्ट',
      ledger_trust: 'भरोसा', ledger_use: 'उपयोग', ledger_fair: 'निष्पक्ष समाधान', ledger_outcomes: 'हाल की शिकायतों के नतीजे',
      out_refund: 'ज़्यादा लिया पैसा लौटाया', out_apology: 'माफ़ी स्वीकार', out_warning: 'औपचारिक चेतावनी; दोबारा जाँच तय', out_sticker_removed: 'नकली स्टिकर हटाया',
      out_open: 'दर्ज · 48 घंटे में समाधान', out_mediating: 'बातचीत जारी', out_resolved: 'सुलझ गई', out_rejected: 'बंद', out_yours: 'आपकी',
      hours_n: '{n} घंटे में', ledger_live: 'इसमें इस डेमो में आपके {n} काम शामिल हैं।', ledger_note: 'नमूना इतिहास और आपके डेमो काम। नवद्वीप फ़रवरी 2027 में जुड़ेगा।',
      ledger_open_data: 'यही कुल संख्या ज़िले को मुफ़्त खुले डेटा के रूप में दी जाती है।', report_sent: 'नकली बैज की रिपोर्ट F-{id} दर्ज हुई। पथिक मित्र स्टिकर की जाँच करेंगे।',
      report_title: 'नकली बैज की रिपोर्ट करें', report_where: 'आपने इसे कहाँ देखा? (वैकल्पिक)', report_btn: 'रिपोर्ट भेजें'
    },
    bn: {
      disclaimer: 'স্বাধীন ছাত্র উদ্যোগ, সরকারি পরিষেবা নয়। প্রদর্শনের জন্য নমুনা তথ্য।',
      wa_open: 'WhatsApp-এ খুলুন', go_wa: 'WhatsApp সহায়ক চেষ্টা করুন', go_mitra: 'পথিক মিত্র অ্যাপ (স্বেচ্ছাসেবক)', go_ledger: 'সেবা খাতা (সর্বজনীন)', go_official: 'সরকারি বুকিং সাইট',
      more_title: 'আরও দেখুন', more_sub: 'দেবভূমির অন্য দিকগুলি',
      wa_name: 'দেবভূমি', wa_sub: 'ভরসা QR হেল্পলাইন', wa_note: 'WhatsApp নম্বরের ডেমো। চালু হলে একই উত্তর দেবভূমি সার্ভার থেকে আসবে।',
      wa_type: 'বার্তা লিখুন', wa_send: 'পাঠান', wa_voice: 'ভয়েস নোট পাঠান', wa_reset: 'চ্যাট আবার শুরু করুন', wa_try: 'চেষ্টা করুন',
      wa_link_sample: 'বুকিং লিঙ্ক ফরোয়ার্ড করুন',
      official_title: 'সরকারি বুকিং সাইট', official_sub: 'শুধু এগুলিই সরকারি বুকিং সাইট। এই কার্ড ছাপিয়ে ঘাট, স্টেশন ও মন্দিরের দরজায় লাগানো হয়।',
      official_never: 'অচেনা কারও পাঠানো লিঙ্কে কখনও টাকা দেবেন না। আগে লিঙ্ক যাচাই করুন।', official_print: 'এই কার্ড ছাপুন', official_check: 'লিঙ্ক, ফোন বা UPI যাচাই করুন',
      official_portal: 'পশ্চিমবঙ্গ হোমস্টে নিবন্ধন: জেলা পর্যটন দফতর নিশ্চিত করলে রাজ্য পোর্টালের লিঙ্ক যোগ করা হবে।',
      mitra_title: 'পথিক মিত্র', mitra_who: 'রিয়া · বর্ধমান · ট্যুরিস্ট ফেসিলিটেটর (বেসিক) প্রত্যয়িত', mitra_note: 'স্বেচ্ছাসেবক অ্যাপ। ঘাটে নেটওয়ার্ক ছাড়াই চলে, সিগন্যাল পেলে সিঙ্ক হয়।',
      mitra_signal: 'নেটওয়ার্ক নেই (ফিল্ড মোড)', mitra_outbox: 'সিঙ্কের অপেক্ষায় যাচাই: {n}', mitra_sync: 'এখন সিঙ্ক করুন', mitra_synced: 'সব যাচাই সিঙ্ক হয়েছে।',
      mitra_queue: 'আজকের ভিজিট', mitra_empty: 'কোনো ভিজিট বাকি নেই। দারুণ!', mitra_stats: 'এই সপ্তাহে: {n}টি সরেজমিন যাচাই',
      reason_far_scan: 'ব্যাজ {km} কিমি দূরে স্ক্যান হয়েছে: নকল স্টিকার যাচাই করুন', reason_recheck: 'পুনরায় যাচাই বাকি: শেষ যাচাই {n} দিন আগে', reason_new: '{n} দিন আগে নতুন নিবন্ধন: প্রথম ভিজিট',
      check_title: 'যাচাই তালিকা', ck_intro: 'শুধু সেগুলিই বাছুন যা আজ নিজে দেখেছেন।',
      ck_id_seen: 'আসল পরিচয়পত্র দেখা হয়েছে', ck_reg_seen: 'গাড়ি বা বাড়ির নিবন্ধন দেখা হয়েছে (TTEN, VAHAN বা নতুন)', ck_photos: 'ছবি তোলা হয়েছে (মুখ, এবং গাড়ি বা দরজা)',
      ck_price_sheet_signed: 'পরিষেবাদাতা দামের তালিকায় সই করেছেন', ck_consent_signed: 'লিখিত সম্মতিতে সই (যাত্রীরা কী দেখবেন)',
      ck_state_portal: 'রাজ্য হোমস্টে পোর্টালে নিবন্ধিত (হোমস্টে ট্যাগের জন্য আবশ্যিক)', ck_sticker_matches: 'স্টিকার ঠিক গাড়িতেই আছে; মুখ ও প্লেট মিলেছে',
      ck_reg4: 'নিবন্ধনের শেষ ৪টি অক্ষর', ck_prices: 'পরিষেবাদাতার বলা দাম (পুরো দাম, কোনো বাড়তি খরচ নেই)', ck_save: 'যাচাই সংরক্ষণ করুন',
      res_saved_offline: 'এই ফোনে সংরক্ষিত। সিগন্যাল পেলে সিঙ্ক হবে।', res_complete: 'যাচাই সম্পূর্ণ', res_incomplete: 'সংরক্ষিত, কিন্তু অসম্পূর্ণ। এগুলি না হওয়া পর্যন্ত ব্যাজ নয়:',
      res_audit: 'শিক্ষকের আকস্মিক পরিদর্শনের জন্য বাছাই হয়েছে (প্রায় ১০টিতে ১টি)।', res_refreshed: '{name}-এর শেষ যাচাই এখন আজকের তারিখ দেখাচ্ছে।',
      res_link: 'নতুন ভরসা QR যুক্ত করুন', res_code: 'স্টিকারে ছাপা ব্যাজ নম্বর', res_link_btn: 'ব্যাজ যুক্ত করুন', res_linked: 'ব্যাজ {code} যুক্ত হয়েছে। {name} এখন যাত্রীদের কাছে দেখা যাবে।',
      res_open_card: 'যাত্রী কার্ড খুলুন', back_queue: 'আজকের ভিজিটে ফিরুন', err_code_in_use: 'এই ব্যাজ নম্বর আগেই ব্যবহৃত।', err_bad_code: 'KLN-0000 আকারে লিখুন।',
      ledger_title: 'সেবা খাতা', ledger_sub: 'সর্বজনীন, প্রতিটি স্থানের জন্য। শুধু মোট সংখ্যা: কোনো নাম, ফোন নম্বর বা ব্যক্তিগত তথ্য নয়।', ledger_site: 'বর্ধমান · ডেমো স্থান',
      l_verified: 'যাচাই করা পরিষেবাদাতা', l_trusted: 'এর মধ্যে ভরসাযোগ্য (সোনালি)', l_recheck: 'পুনরায় যাচাই বাকি', l_women: 'মহিলা-পরিচালিত, যাচাই করা',
      l_scans: 'ব্যাজ স্ক্যান (খোঁজখবর)', l_help: 'সাহায্যের অনুরোধ পৌঁছানো হয়েছে', l_checks: 'পথিক মিত্রদের সরেজমিন যাচাই', l_rupees: 'স্থানীয় মানুষের কাছে পৌঁছানো খরচ (পরিষেবাদাতার নিশ্চিত করা)',
      l_complaints: 'অভিযোগ এসেছে', l_resolved: '৪৮ ঘণ্টার মধ্যে মীমাংসা', l_open: 'এখন মীমাংসা চলছে', l_fake: 'নকল ব্যাজের রিপোর্ট',
      ledger_trust: 'ভরসা', ledger_use: 'ব্যবহার', ledger_fair: 'ন্যায্য মীমাংসা', ledger_outcomes: 'সাম্প্রতিক অভিযোগের ফল',
      out_refund: 'বাড়তি টাকা ফেরত', out_apology: 'ক্ষমা চাওয়া গৃহীত', out_warning: 'আনুষ্ঠানিক সতর্কতা; পুনরায় যাচাই নির্ধারিত', out_sticker_removed: 'নকল স্টিকার সরানো হয়েছে',
      out_open: 'নথিভুক্ত · ৪৮ ঘণ্টায় মীমাংসা', out_mediating: 'মীমাংসা চলছে', out_resolved: 'মীমাংসা হয়েছে', out_rejected: 'বন্ধ', out_yours: 'আপনার',
      hours_n: '{n} ঘণ্টায়', ledger_live: 'এতে এই ডেমোতে আপনার {n}টি কাজ যুক্ত আছে।', ledger_note: 'নমুনা ইতিহাস ও আপনার ডেমো কাজ। নবদ্বীপ ফেব্রুয়ারি ২০২৭-এ যুক্ত হবে।',
      ledger_open_data: 'একই মোট সংখ্যা জেলাকে বিনামূল্যে উন্মুক্ত তথ্য হিসেবে দেওয়া হয়।', report_sent: 'নকল ব্যাজের রিপোর্ট F-{id} নথিভুক্ত হয়েছে। পথিক মিত্র স্টিকার যাচাই করবেন।',
      report_title: 'নকল ব্যাজের রিপোর্ট করুন', report_where: 'কোথায় দেখেছেন? (ঐচ্ছিক)', report_btn: 'রিপোর্ট পাঠান'
    }
  };
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();
/* Keys used only by the MVP server version. */
(function () {
  var X = {
    en: { wa_note_mvp: 'Simulator: these replies come from the same server code that will answer the real WhatsApp number.', wa_note_live: 'Same assistant as our WhatsApp number.',
      mitra_token: 'Pathik Mitra access code', mitra_token_hint: 'Issued after training. Demo code: demo-mitra-token', mitra_bad_token: 'This code is not active. Ask your faculty mentor.',
      mitra_signin: 'Sign in', mitra_signout: 'Sign out', reason_far_scan_n: 'Scanned far from its town ({n}x this week): check for a copied sticker', reason_new_mvp: 'New sign-up: first visit',
      ck_prices_hint: 'Only if the signed price sheet changed. Leave empty to keep the current prices.', ck_item: 'Item, e.g. 108 Shiva temples' },
    hi: { wa_note_mvp: 'सिम्युलेटर: ये जवाब उसी सर्वर कोड से आते हैं जो असली WhatsApp नंबर पर जवाब देगा।', wa_note_live: 'हमारे WhatsApp नंबर वाला ही सहायक।',
      mitra_token: 'पथिक मित्र एक्सेस कोड', mitra_token_hint: 'प्रशिक्षण के बाद मिलता है। डेमो कोड: demo-mitra-token', mitra_bad_token: 'यह कोड सक्रिय नहीं है। अपने शिक्षक मार्गदर्शक से पूछें।',
      mitra_signin: 'साइन इन', mitra_signout: 'साइन आउट', reason_far_scan_n: 'अपने शहर से दूर स्कैन हुआ (इस सप्ताह {n} बार): नकली स्टिकर की जाँच करें', reason_new_mvp: 'नया पंजीकरण: पहली विज़िट',
      ck_prices_hint: 'केवल तब भरें जब हस्ताक्षरित दाम सूची बदली हो। मौजूदा दाम रखने के लिए खाली छोड़ें।', ck_item: 'सेवा, जैसे 108 शिव मंदिर' },
    bn: { wa_note_mvp: 'সিমুলেটর: এই উত্তরগুলি সেই সার্ভার কোড থেকেই আসে যা আসল WhatsApp নম্বরে উত্তর দেবে।', wa_note_live: 'আমাদের WhatsApp নম্বরের একই সহায়ক।',
      mitra_token: 'পথিক মিত্র অ্যাক্সেস কোড', mitra_token_hint: 'প্রশিক্ষণের পরে দেওয়া হয়। ডেমো কোড: demo-mitra-token', mitra_bad_token: 'এই কোড সক্রিয় নয়। আপনার শিক্ষক পরামর্শদাতাকে জিজ্ঞাসা করুন।',
      mitra_signin: 'সাইন ইন', mitra_signout: 'সাইন আউট', reason_far_scan_n: 'নিজের শহর থেকে দূরে স্ক্যান হয়েছে (এই সপ্তাহে {n} বার): নকল স্টিকার যাচাই করুন', reason_new_mvp: 'নতুন নিবন্ধন: প্রথম ভিজিট',
      ck_prices_hint: 'শুধু সই করা দামের তালিকা বদলালে লিখুন। বর্তমান দাম রাখতে ফাঁকা রাখুন।', ck_item: 'পরিষেবা, যেমন ১০৮ শিব মন্দির' }
  };
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();

/* Printable badges page. */
(function () {
  var X = {"en": {"go_badges": "Printable Bharosa QR badges (district team)", "badges_title": "Printable Bharosa QR badges", "badges_sub": "For the district team and Pathik Mitras. Each QR holds a signed link, so a copied or edited link will not open a card.", "badges_addr": "Address inside the QR", "badges_addr_hint": "Choose this PC's Wi-Fi address so a phone on the same Wi-Fi can open the card. After launch, use the https website address.", "badges_local_warn": "localhost only works on this PC. Choose the Wi-Fi address (for example http://192.168.0.104:8000) so phones can scan.", "badges_custom": "Other address…", "badges_print": "Print badges", "badge_scan": "Scan with your phone camera to check", "badge_never": "Not a payment QR. DevBhumi never asks for money or an OTP.", "badges_skip_inactive": "Inactive badges are not shown and never printed.", "admin_token": "District team access code", "admin_hint": "Demo code: demo-admin-token"}, "hi": {"go_badges": "छापने योग्य भरोसा QR बैज (ज़िला टीम)", "badges_title": "छापने योग्य भरोसा QR बैज", "badges_sub": "ज़िला टीम और पथिक मित्रों के लिए। हर QR में हस्ताक्षरित लिंक है, इसलिए कॉपी या बदला हुआ लिंक कार्ड नहीं खोलेगा।", "badges_addr": "QR के अंदर का पता", "badges_addr_hint": "इस PC का Wi-Fi पता चुनें ताकि उसी Wi-Fi पर फ़ोन कार्ड खोल सके। शुरू होने के बाद https वेबसाइट का पता उपयोग करें।", "badges_local_warn": "localhost केवल इसी PC पर चलता है। Wi-Fi पता चुनें (जैसे http://192.168.0.104:8000) ताकि फ़ोन स्कैन कर सकें।", "badges_custom": "दूसरा पता…", "badges_print": "बैज छापें", "badge_scan": "जाँचने के लिए फ़ोन कैमरे से स्कैन करें", "badge_never": "यह भुगतान QR नहीं है। देवभूमि कभी पैसे या OTP नहीं माँगता।", "badges_skip_inactive": "निष्क्रिय बैज न दिखाए जाते हैं, न छापे जाते हैं।", "admin_token": "ज़िला टीम एक्सेस कोड", "admin_hint": "डेमो कोड: demo-admin-token"}, "bn": {"go_badges": "ছাপার উপযোগী ভরসা QR ব্যাজ (জেলা দল)", "badges_title": "ছাপার উপযোগী ভরসা QR ব্যাজ", "badges_sub": "জেলা দল ও পথিক মিত্রদের জন্য। প্রতিটি QR-এ স্বাক্ষরিত লিঙ্ক থাকে, তাই নকল বা বদলানো লিঙ্কে কার্ড খুলবে না।", "badges_addr": "QR-এর ভিতরের ঠিকানা", "badges_addr_hint": "এই PC-র Wi-Fi ঠিকানা বেছে নিন, যাতে একই Wi-Fi-এ থাকা ফোন কার্ড খুলতে পারে। চালু হওয়ার পরে https ওয়েবসাইটের ঠিকানা ব্যবহার করুন।", "badges_local_warn": "localhost শুধু এই PC-তেই চলে। Wi-Fi ঠিকানা বেছে নিন (যেমন http://192.168.0.104:8000), যাতে ফোন স্ক্যান করতে পারে।", "badges_custom": "অন্য ঠিকানা…", "badges_print": "ব্যাজ ছাপুন", "badge_scan": "যাচাই করতে ফোনের ক্যামেরায় স্ক্যান করুন", "badge_never": "এটি পেমেন্ট QR নয়। দেবভূমি কখনও টাকা বা OTP চায় না।", "badges_skip_inactive": "নিষ্ক্রিয় ব্যাজ দেখানো বা ছাপা হয় না।", "admin_token": "জেলা দলের অ্যাক্সেস কোড", "admin_hint": "ডেমো কোড: demo-admin-token"}};
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();

/* Scanning with the built-in reader and the photo option. */
(function () {
  var X = {"en": {"scan_photo": "Take a photo of the badge", "scan_reading": "Reading the badge…", "scan_not_badge": "This QR is not a DevBhumi Bharosa badge. Do not pay through it.", "scan_none": "No badge found in the photo. Hold the phone closer, keep it steady and try again.", "scan_no_camera": "Use “Take a photo of the badge”, or point your phone’s normal camera at the badge; the link opens by itself."}, "hi": {"scan_photo": "बैज की फ़ोटो लें", "scan_reading": "बैज पढ़ा जा रहा है…", "scan_not_badge": "यह QR देवभूमि भरोसा बैज नहीं है। इससे पैसे न दें।", "scan_none": "फ़ोटो में कोई बैज नहीं मिला। फ़ोन पास रखें, स्थिर रखें और फिर कोशिश करें।", "scan_no_camera": "“बैज की फ़ोटो लें” चुनें, या अपने फ़ोन का सामान्य कैमरा बैज पर रखें; लिंक अपने आप खुलेगा।"}, "bn": {"scan_photo": "ব্যাজের ছবি তুলুন", "scan_reading": "ব্যাজ পড়া হচ্ছে…", "scan_not_badge": "এই QR দেবভূমি ভরসা ব্যাজ নয়। এর মাধ্যমে টাকা দেবেন না।", "scan_none": "ছবিতে কোনো ব্যাজ পাওয়া যায়নি। ফোন কাছে ধরুন, স্থির রাখুন এবং আবার চেষ্টা করুন।", "scan_no_camera": "“ব্যাজের ছবি তুলুন” বেছে নিন, বা ফোনের সাধারণ ক্যামেরা ব্যাজের দিকে ধরুন; লিংক নিজেই খুলবে।"}};
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();

/* Live scanner with a focus box. */
(function () {
  var X = {"en": {"scan_box": "Hold one badge inside the box", "scan_torch": "Torch", "scan_zoom": "Zoom", "scan_close": "Close camera", "scan_photo_hint": "Take the photo, then tap ✓ (OK). The badge in the middle is read.", "scan_no_camera": "The live camera needs a secure https:// address. Use “Take a photo of the badge”, or point your phone’s normal camera at the badge."}, "hi": {"scan_box": "एक बैज को बॉक्स के अंदर रखें", "scan_torch": "टॉर्च", "scan_zoom": "ज़ूम", "scan_close": "कैमरा बंद करें", "scan_photo_hint": "फ़ोटो लें, फिर ✓ (OK) दबाएँ। बीच वाला बैज पढ़ा जाएगा।", "scan_no_camera": "लाइव कैमरे के लिए सुरक्षित https:// पता चाहिए। “बैज की फ़ोटो लें” चुनें, या फ़ोन का सामान्य कैमरा बैज पर रखें।"}, "bn": {"scan_box": "একটি ব্যাজ বাক্সের ভিতরে রাখুন", "scan_torch": "টর্চ", "scan_zoom": "জুম", "scan_close": "ক্যামেরা বন্ধ করুন", "scan_photo_hint": "ছবি তুলুন, তারপর ✓ (OK) চাপুন। মাঝের ব্যাজটি পড়া হবে।", "scan_no_camera": "লাইভ ক্যামেরার জন্য নিরাপদ https:// ঠিকানা লাগে। “ব্যাজের ছবি তুলুন” বেছে নিন, বা ফোনের সাধারণ ক্যামেরা ব্যাজের দিকে ধরুন।"}};
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();

/* v0.10: the film card on the home screen. */
(function () {
  var X = {
    en: { film_head: 'Our story', film_alt: 'A clay lamp lit at dawn, with the title The Promise', film_sub: 'A pilgrim from Gaya, a toto driver from Bardhaman and his daughter Diya: one journey, three promises, and the badge that keeps them.',
      film_meta: 'Animated film · 6 min · Bengali, Hindi and English subtitles', film_watch: 'Watch the film' },
    hi: { film_head: 'हमारी कहानी', film_alt: 'भोर में जलता मिट्टी का दीया और फ़िल्म का नाम', film_sub: 'गया से आईं एक तीर्थयात्री, बर्धमान के टोटो चालक और उनकी बेटी दिया: एक यात्रा, तीन वादे, और वह बैज जो उन्हें निभाता है।',
      film_meta: 'एनिमेटेड फ़िल्म · 6 मिनट · बांग्ला, हिंदी और अंग्रेज़ी सबटाइटल', film_watch: 'फ़िल्म देखें' },
    bn: { film_head: 'আমাদের গল্প', film_alt: 'ভোরে জ্বলা মাটির প্রদীপ, সঙ্গে ছবির নাম প্রতিশ্রুতি', film_sub: 'গয়া থেকে আসা এক তীর্থযাত্রী, বর্ধমানের টোটোচালক আর তাঁর মেয়ে দিয়া: একটা যাত্রা, তিনটে প্রতিশ্রুতি, আর সেই ব্যাজ যা কথা রাখে।',
      film_meta: 'অ্যানিমেটেড ছবি · ৬ মিনিট · বাংলা, হিন্দি ও ইংরেজি সাবটাইটেল', film_watch: 'ছবিটা দেখুন' }
  };
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();

/* v0.11: new home, settings and clearer messages. */
(function () {
  var X = {
    en: { hero_kicker: 'Bharosa QR · trust before you pay', hero_p1: 'Own price, no bargaining', hero_p2: 'Checked in person by a Pathik Mitra', hero_p3: 'Help in your language',
      tile_find: 'Toto, boat, homestay, stall', tile_plan: 'Timings and crowd forecast', tile_verify: 'Link, phone or UPI', tile_help: 'Hospital, police, help desk',
      interp_soon: 'The interpreter number is added at launch.', verify_empty: 'Type or paste a link, phone number or UPI ID first.',
      need_badge: 'Scan a badge first', need_badge_b: 'Ratings and complaints are linked to the badge you scanned, so the right provider gets them.',
      report_code: 'Badge code (on the sticker)', hours_confirm: 'to be confirmed', set_language: 'Language', set_display: 'Display', set_about: 'About' },
    hi: { hero_kicker: 'भरोसा QR · भुगतान से पहले भरोसा', hero_p1: 'अपना तय दाम, मोलभाव नहीं', hero_p2: 'पथिक मित्र ने खुद जाकर जाँचा', hero_p3: 'आपकी भाषा में मदद',
      tile_find: 'टोटो, नाव, होमस्टे, दुकान', tile_plan: 'समय और भीड़ का अनुमान', tile_verify: 'लिंक, फ़ोन या UPI', tile_help: 'अस्पताल, पुलिस, हेल्प डेस्क',
      interp_soon: 'दुभाषिए का नंबर लॉन्च के समय जोड़ा जाएगा।', verify_empty: 'पहले कोई लिंक, फ़ोन नंबर या UPI ID लिखें या पेस्ट करें।',
      need_badge: 'पहले बैज स्कैन करें', need_badge_b: 'रेटिंग और शिकायत स्कैन किए गए बैज से जुड़ती है, ताकि सही सेवा प्रदाता तक पहुँचे।',
      report_code: 'बैज कोड (स्टिकर पर लिखा)', hours_confirm: 'समय पक्का करें', set_language: 'भाषा', set_display: 'दिखावट', set_about: 'ऐप के बारे में' },
    bn: { hero_kicker: 'ভরসা QR · টাকা দেওয়ার আগে ভরসা', hero_p1: 'নিজের লেখা দাম, দরাদরি নেই', hero_p2: 'পথিক মিত্র নিজে গিয়ে যাচাই করেছেন', hero_p3: 'আপনার ভাষায় সাহায্য',
      tile_find: 'টোটো, নৌকা, হোমস্টে, দোকান', tile_plan: 'সময় আর ভিড়ের পূর্বাভাস', tile_verify: 'লিংক, ফোন বা UPI', tile_help: 'হাসপাতাল, থানা, সহায়তা ডেস্ক',
      interp_soon: 'দোভাষীর নম্বর চালুর সময় যোগ হবে।', verify_empty: 'আগে একটা লিংক, ফোন নম্বর বা UPI আইডি লিখুন বা পেস্ট করুন।',
      need_badge: 'আগে একটা ব্যাজ স্ক্যান করুন', need_badge_b: 'রেটিং আর অভিযোগ স্ক্যান করা ব্যাজের সঙ্গে যুক্ত থাকে, যাতে ঠিক পরিষেবাদাতার কাছে পৌঁছায়।',
      report_code: 'ব্যাজ কোড (স্টিকারে লেখা)', hours_confirm: 'সময় নিশ্চিত করুন', set_language: 'ভাষা', set_display: 'দেখার ধরন', set_about: 'অ্যাপ সম্পর্কে' }
  };
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();

/* v0.12: one scan button, with the photo route as a fallback. */
(function () {
  var X = {
    en: { scan_badge: 'Scan the badge', scan_alt_q: 'Camera not working?', scan_alt: 'Take a photo instead', scan_fallback: 'The live camera did not start. Take one photo of the badge and we will read it.' },
    hi: { scan_badge: 'बैज स्कैन करें', scan_alt_q: 'कैमरा नहीं चल रहा?', scan_alt: 'फ़ोटो लेकर भेजें', scan_fallback: 'लाइव कैमरा चालू नहीं हुआ। बैज की एक फ़ोटो लें, हम उसे पढ़ लेंगे।' },
    bn: { scan_badge: 'ব্যাজ স্ক্যান করুন', scan_alt_q: 'ক্যামেরা চলছে না?', scan_alt: 'ছবি তুলে দিন', scan_fallback: 'লাইভ ক্যামেরা চালু হয়নি। ব্যাজের একটা ছবি তুলুন, আমরা পড়ে নেব।' }
  };
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();

/* v0.13: weak signal messages. */
(function () {
  var X = {
    en: { net_title: 'No internet right now', net_body: 'This needs a connection. In an emergency, call 112: it works without internet.', retry: 'Try again', send_failed: 'Not sent: no internet. Please try again when you have signal.' },
    hi: { net_title: 'अभी इंटरनेट नहीं है', net_body: 'इसके लिए इंटरनेट चाहिए। आपात स्थिति में 112 पर कॉल करें: यह बिना इंटरनेट के भी चलता है।', retry: 'फिर से कोशिश करें', send_failed: 'नहीं भेजा गया: इंटरनेट नहीं है। सिग्नल मिलने पर फिर से कोशिश करें।' },
    bn: { net_title: 'এখন ইন্টারনেট নেই', net_body: 'এর জন্য ইন্টারনেট লাগবে। জরুরি হলে ১১২-এ কল করুন: ইন্টারনেট ছাড়াই চলে।', retry: 'আবার চেষ্টা করুন', send_failed: 'পাঠানো যায়নি: ইন্টারনেট নেই। সিগন্যাল পেলে আবার চেষ্টা করুন।' }
  };
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();

/* v0.14: live site sign-in hints without demo codes. */
(function () {
  var X = {
    en: { mitra_token_hint_live: 'Issued to you after Pathik Mitra training.', admin_hint_live: 'For the district team only. Ask your coordinator for the code.' },
    hi: { mitra_token_hint_live: 'पथिक मित्र प्रशिक्षण के बाद आपको दिया जाता है।', admin_hint_live: 'केवल ज़िला टीम के लिए। कोड अपने समन्वयक से लें।' },
    bn: { mitra_token_hint_live: 'পথিক মিত্র প্রশিক্ষণের পরে আপনাকে দেওয়া হয়।', admin_hint_live: 'শুধু জেলা দলের জন্য। কোড আপনার সমন্বয়কের কাছ থেকে নিন।' }
  };
  Object.keys(X).forEach(function (l) { Object.keys(X[l]).forEach(function (k) { I18N[l][k] = X[l][k]; }); });
})();
