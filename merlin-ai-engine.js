/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         MERLIN AI ENGINE v3.0 — Claude API 驱动                 ║
 * ║   Rex Yap · 沙巴房地产 · Sabah Realty Chatbot Brain             ║
 * ║                                                                  ║
 * ║  功能：                                                           ║
 * ║  ① 用 Claude API 智能回复顾客问题（中/英/马来语）                ║
 * ║  ② 与 merlin-admin.html 设置完整同步（API Key / Auto Reply / 状态）║
 * ║  ③ Firebase 实时保存对话 → admin 后台实时显示                    ║
 * ║  ④ 支持 Human Takeover（Rex 可随时接管对话）                     ║
 * ║  ⑤ 完整房产知识库 + 看房预约 + WhatsApp 引导                    ║
 * ║                                                                  ║
 * ║  使用方法：                                                        ║
 * ║  在 index.html 的 </body> 前加入：                                ║
 * ║  <script src="merlin-ai-engine.js"></script>                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

(function MerlinAIEngine() {
  'use strict';

  // ══════════════════════════════════════════════════════
  // ① 配置读取（从 admin 后台 localStorage 同步）
  // ══════════════════════════════════════════════════════
  var CFG = {
    get apiKey()       { return localStorage.getItem('merlin_api_key') || ''; },
    get autoReply()    { return localStorage.getItem('merlin_rex_enabled') !== 'false'; },
    get opStatus()     { return localStorage.getItem('merlin_op_status') || 'online'; },
    get humanTakeover(){ return localStorage.getItem('merlin_human_takeover') === 'true'; },
    WA_NUMBER: '',   // 从 admin 读取
    get waNum()        {
      return localStorage.getItem('merlin_wa_num') || '60112529888';
    },
    FIREBASE: {
      apiKey: 'AIzaSyC2xKpugmd21kn8nByD45MEyiU2unvVyAM',
      authDomain: 'merlin-crm-2.firebaseapp.com',
      projectId: 'merlin-crm-2',
      storageBucket: 'merlin-crm-2.firebasestorage.app',
      messagingSenderId: '59780581612',
      appId: '1:59780581612:web:209f1dc379320cc76dfdc9'
    }
  };

  // ══════════════════════════════════════════════════════
  // ② 房产知识库（Rex Yap · 沙巴房地产专业知识）
  // ══════════════════════════════════════════════════════
  var KNOWLEDGE = {
    zh: {
      agent: 'Rex Yap',
      area: '沙巴全区（哥打基纳巴卢KK、斗湖Tawau、山打根Sandakan、拿笃Lahad Datu、保佛Papar等）',
      services: '住宅、商业、新楼盘、出租、MM2H签证咨询',
      hours: '周一至周六 10:00–19:00（WhatsApp随时可发）',
      rentRange: 'RM 1,200–5,000/月（视区域和类型）',
      buyRange: 'RM 350,000 起（公寓）至 RM 2,000,000+（洋房/商业）',
      freeConsult: '✅ 免费房产咨询，无需付款',
      waLink: 'https://wa.me/' + CFG.waNum,
      mm2h: 'MM2H（大马我的第二家园）签证办理支持，协助申请和法律程序',
      foreign: '✅ 外国买家友好，协助外国人购房、签证、法律支持',
      newlaunch: '目前有多个新楼盘项目可咨询，永久产权，外国人可购买',
      greeting: '您好！我是 Merlin，Rex Yap 房产助理 🏠 请问有什么可以帮您？',
      quickReplies: ['🏠 出租房源', '🏡 买房咨询', '🏗️ 新楼盘', '📋 MM2H', '📞 联系 Rex']
    },
    en: {
      agent: 'Rex Yap',
      area: 'All of Sabah (KK, Tawau, Sandakan, Lahad Datu, Papar & more)',
      services: 'Residential, Commercial, New Launch, Rental, MM2H Visa Consulting',
      hours: 'Mon–Sat 10:00–19:00 (WhatsApp anytime)',
      rentRange: 'RM 1,200–5,000/month (varies by area & type)',
      buyRange: 'From RM 350,000 (apartments) to RM 2M+ (houses/commercial)',
      freeConsult: '✅ Free property consultation, no obligation',
      waLink: 'https://wa.me/' + CFG.waNum,
      mm2h: 'MM2H (Malaysia My Second Home) visa application support',
      foreign: '✅ Foreign buyer friendly, full legal & purchase support',
      newlaunch: 'Multiple new launch projects available, freehold, foreign purchasable',
      greeting: 'Hi! I\'m Merlin, Rex Yap\'s property assistant 🏠 How can I help you?',
      quickReplies: ['🏠 Rental', '🏡 Buy Property', '🏗️ New Launch', '📋 MM2H', '📞 Contact Rex']
    },
    ms: {
      agent: 'Rex Yap',
      area: 'Seluruh Sabah (KK, Tawau, Sandakan, Lahad Datu, Papar & lebih)',
      services: 'Kediaman, Komersial, Projek Baru, Sewa, Perundingan Visa MM2H',
      hours: 'Isnin–Sabtu 10:00–19:00 (WhatsApp bila-bila masa)',
      rentRange: 'RM 1,200–5,000/bulan (bergantung kawasan & jenis)',
      buyRange: 'Dari RM 350,000 (apartment) hingga RM 2 juta+ (rumah/komersial)',
      freeConsult: '✅ Perundingan hartanah percuma, tiada komitmen',
      waLink: 'https://wa.me/' + CFG.waNum,
      mm2h: 'Sokongan permohonan visa MM2H (Malaysia My Second Home)',
      foreign: '✅ Mesra pembeli asing, sokongan undang-undang & pembelian penuh',
      newlaunch: 'Beberapa projek baru tersedia, milik kekal, boleh dibeli oleh warga asing',
      greeting: 'Hai! Saya Merlin, pembantu hartanah Rex Yap 🏠 Boleh saya bantu?',
      quickReplies: ['🏠 Hartanah Sewa', '🏡 Beli Hartanah', '🏗️ Projek Baru', '📋 MM2H', '📞 Hubungi Rex']
    }
  };

  // ══════════════════════════════════════════════════════
  // ③ 会话状态
  // ══════════════════════════════════════════════════════
  var STATE = {
    sessionId: null,
    lang: 'zh',
    messages: [],          // {role:'user'|'assistant', content:'...'}
    customerName: '',
    customerPhone: '',
    leadData: {},
    isTyping: false,
    isTakenOver: false,
    lastBroadcastTs: 0,
    firebaseDb: null,
    initialized: false
  };

  // ══════════════════════════════════════════════════════
  // ④ Firebase 初始化 & 实时监听
  // ══════════════════════════════════════════════════════
  function initFirebase() {
    try {
      if (typeof firebase === 'undefined') return;
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(CFG.FIREBASE);
      }
      STATE.firebaseDb = firebase.firestore();
      // 监听 admin 广播消息
      watchBroadcast();
      // 监听 human takeover 状态
      watchTakeover();
    } catch(e) {
      console.warn('[Merlin AI] Firebase init:', e.message);
    }
  }

  function saveLead(extra) {
    if (!STATE.firebaseDb || !STATE.sessionId) return;
    var data = Object.assign({
      sessionId: STATE.sessionId,
      id: STATE.sessionId,
      lang: STATE.lang,
      flow: 'chat',
      status: 'new',
      customerName: STATE.customerName,
      customerPhone: STATE.customerPhone,
      time: new Date().toISOString(),
      updatedAt: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
      lastMsg: STATE.messages.length ? STATE.messages[STATE.messages.length-1].content.slice(0,100) : '',
      msgCount: STATE.messages.length,
      source: 'merlin_chat'
    }, STATE.leadData, extra || {});

    // LocalStorage 同步给 admin
    try {
      var crm = JSON.parse(localStorage.getItem('merlin_crm_leads') || '[]');
      var idx = crm.findIndex(function(l){ return l.sessionId === STATE.sessionId; });
      if (idx >= 0) crm[idx] = Object.assign(crm[idx], data);
      else crm.push(data);
      localStorage.setItem('merlin_crm_leads', JSON.stringify(crm));
    } catch(e){}

    // Firebase 保存
    try {
      STATE.firebaseDb.collection('merlin_leads').doc(STATE.sessionId).set(data, {merge:true})
        .catch(function(e){ console.warn('[Merlin AI] Firebase save:', e.message); });
    } catch(e){}
  }

  function watchBroadcast() {
    setInterval(function() {
      try {
        var bc = localStorage.getItem('merlin_broadcast');
        if (!bc) return;
        var data = JSON.parse(bc);
        if (data.ts > STATE.lastBroadcastTs && data.from === 'rex') {
          STATE.lastBroadcastTs = data.ts;
          appendMessage('rex', data.msg);
          showTakeoverBanner(true);
        }
      } catch(e){}
    }, 3000);
  }

  function watchTakeover() {
    setInterval(function() {
      var ht = localStorage.getItem('merlin_human_takeover') === 'true';
      var rexOn = localStorage.getItem('merlin_rex_enabled') !== 'false';
      if (ht || !rexOn) {
        STATE.isTakenOver = true;
        showTakeoverBanner(true);
      } else {
        if (STATE.isTakenOver) {
          STATE.isTakenOver = false;
          showTakeoverBanner(false);
        }
      }
    }, 5000);
  }

  // ══════════════════════════════════════════════════════
  // ⑤ 语言检测
  // ══════════════════════════════════════════════════════
  function detectLang() {
    if (typeof currentLang !== 'undefined') return currentLang;
    var saved = localStorage.getItem('rex_lang');
    if (saved && ['zh','en','ms'].includes(saved)) return saved;
    var nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('ms') || nav.startsWith('id')) return 'ms';
    if (nav.startsWith('en')) return 'en';
    return 'zh';
  }

  function K() { return KNOWLEDGE[STATE.lang] || KNOWLEDGE.zh; }

  // ══════════════════════════════════════════════════════
  // ⑥ Claude API 调用（通过 Anthropic API）
  // ══════════════════════════════════════════════════════
  async function callClaudeAPI(userMessage) {
    var apiKey = CFG.apiKey;
    var lang = STATE.lang;
    var k = K();

    // 构建系统提示（房产专家角色）
    var systemPrompt = [
      'You are Merlin, an AI property assistant for ' + k.agent + ', a professional real estate agent in Sabah, Malaysia.',
      'Service area: ' + k.area,
      'Services: ' + k.services,
      'Business hours: ' + k.hours,
      'Rental range: ' + k.rentRange,
      'Purchase range: ' + k.buyRange,
      'MM2H: ' + k.mm2h,
      'Foreign buyers: ' + k.foreign,
      'New Launch: ' + k.newlaunch,
      k.freeConsult,
      '',
      'IMPORTANT RULES:',
      '1. Always reply in ' + (lang==='zh' ? 'Simplified Chinese (简体中文)' : lang==='ms' ? 'Bahasa Melayu' : 'English') + '. Match the user\'s language.',
      '2. Be warm, professional, and helpful. Use appropriate emojis sparingly.',
      '3. For rental/purchase queries, collect: property type, bedrooms, budget, area preference, purpose.',
      '4. Always end by offering to connect with Rex via WhatsApp: ' + k.waLink,
      '5. For viewing bookings, guide them to fill the booking form on the website or WhatsApp Rex.',
      '6. Keep responses concise (under 150 words). No markdown headers.',
      '7. If asked about specific properties, acknowledge and offer to get details from Rex.',
      '8. If the user gives their name or phone, acknowledge it warmly.',
      '9. For MM2H queries, explain it\'s a long-term visa program and offer free consultation.',
      '',
      'Current session info:',
      'Customer name: ' + (STATE.customerName || 'not yet provided'),
      'Customer phone: ' + (STATE.customerPhone || 'not yet provided'),
    ].join('\n');

    // 准备消息历史（最近8条）
    var history = STATE.messages.slice(-8).map(function(m) {
      return { role: m.role, content: m.content };
    });
    history.push({ role: 'user', content: userMessage });

    // 如果没有 API Key，使用智能预设回复
    if (!apiKey) {
      return getFallbackReply(userMessage);
    }

    try {
      // 使用 Anthropic Claude API
      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: systemPrompt,
          messages: history
        })
      });

      if (!response.ok) {
        var errData = await response.json().catch(function(){ return {}; });
        // 如果是认证错误，尝试用作 DeepSeek key
        if (response.status === 401) {
          return callDeepSeekAPI(userMessage, systemPrompt, history, apiKey);
        }
        throw new Error(errData.error ? errData.error.message : 'API error ' + response.status);
      }

      var data = await response.json();
      return (data.content && data.content[0] && data.content[0].text) || getFallbackReply(userMessage);

    } catch(e) {
      console.warn('[Merlin AI] Claude API error:', e.message);
      // 降级到 DeepSeek（如果 key 以 sk- 但非 sk-ant- 开头）
      if (apiKey && apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-')) {
        return callDeepSeekAPI(userMessage, systemPrompt, history, apiKey);
      }
      return getFallbackReply(userMessage);
    }
  }

  // DeepSeek 降级（admin 原来的 API）
  async function callDeepSeekAPI(userMessage, systemPrompt, history, apiKey) {
    try {
      var allMsgs = [{ role: 'system', content: systemPrompt }].concat(history);
      var resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 400, messages: allMsgs })
      });
      var data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || getFallbackReply(userMessage);
    } catch(e) {
      return getFallbackReply(userMessage);
    }
  }

  // ══════════════════════════════════════════════════════
  // ⑦ 智能预设回复（无 API Key 时的备用）
  // ══════════════════════════════════════════════════════
  function getFallbackReply(userMessage) {
    var msg = (userMessage || '').toLowerCase();
    var k = K();
    var lang = STATE.lang;

    // 关键词匹配
    var rentKeywords  = ['rent','sewa','出租','租','租房','rental'];
    var buyKeywords   = ['buy','beli','买','购买','purchase','for sale','dijual'];
    var mm2hKeywords  = ['mm2h','second home','第二家园','visa'];
    var bookingKws    = ['booking','book','预约','看房','appointment','temu','tempah'];
    var priceKeywords = ['price','harga','价格','价钱','berapa','多少钱','多少'];
    var contactKws    = ['contact','hubungi','联系','whatsapp','rex','call','phone'];
    var newLaunchKws  = ['new launch','新楼盘','projek baru','新项目','developer'];
    var foreignKws    = ['foreign','overseas','asing','外国','foreigner','singaporean','chinese','expat'];

    var isRent     = rentKeywords.some(function(w){ return msg.includes(w); });
    var isBuy      = buyKeywords.some(function(w){ return msg.includes(w); });
    var isMM2H     = mm2hKeywords.some(function(w){ return msg.includes(w); });
    var isBooking  = bookingKws.some(function(w){ return msg.includes(w); });
    var isPrice    = priceKeywords.some(function(w){ return msg.includes(w); });
    var isContact  = contactKws.some(function(w){ return msg.includes(w); });
    var isNewLaunch = newLaunchKws.some(function(w){ return msg.includes(w); });
    var isForeign  = foreignKws.some(function(w){ return msg.includes(w); });

    if (lang === 'zh') {
      if (isBooking) return '好的！您可以通过以下方式预约看房：\n\n📋 方法一：在网页上填写看房预约表单\n💬 方法二：直接 WhatsApp Rex：' + k.waLink + '\n\n请提供您的姓名、联系电话、意向房源和期望时间，Rex 会在24小时内确认您的预约 😊';
      if (isMM2H) return '📋 MM2H（大马我的第二家园）是马来西亚政府批准的长期居留签证计划，非常适合外国人在马来西亚长期生活或退休。\n\n✅ Rex 提供免费 MM2H 咨询\n✅ 协助申请和法律程序\n\n有兴趣了解更多吗？请 WhatsApp Rex：' + k.waLink;
      if (isForeign) return '🌏 外国人在马来西亚沙巴买房完全合法！\n\n✅ 永久产权（Freehold）房产可购买\n✅ 配合律师和贷款申请\n✅ 提供多语言服务（中/英/马）\n\n请联系 Rex 了解详情：' + k.waLink;
      if (isNewLaunch) return '🏗️ 目前沙巴有多个优质新楼盘项目：\n\n✅ 永久产权（Freehold）\n✅ 外国人可购买\n✅ 发展商优惠价格\n✅ 免律师费优惠\n\n要了解具体项目详情，请联系 Rex：' + k.waLink;
      if (isRent && isPrice) return '🔑 沙巴出租房源价格参考：\n\n• 一房：RM 800–1,500/月\n• 两房：RM 1,200–2,500/月\n• 三房：RM 1,800–4,000/月\n• 独立洋房：RM 2,500–6,000/月\n\n价格因区域和装修而异。请问您想租在哪个区域？有几个房间的需求？😊';
      if (isRent) return '🏠 好的！帮您找出租房源，请问：\n\n1️⃣ 您想租在哪个区域？（KK/斗湖/山打根/其他）\n2️⃣ 需要几个房间？\n3️⃣ 您的月租预算大概是多少？\n4️⃣ 自住还是商用？\n\n回答后 Rex 会为您推荐最合适的房源 😊';
      if (isBuy && isPrice) return '🏡 沙巴购房价格参考：\n\n• 公寓（Apartment）：RM 350k–700k\n• 联排洋房（Terrace）：RM 450k–1.2M\n• 半独立洋房：RM 600k–1.5M\n• 独立洋房（Bungalow）：RM 800k–3M+\n\n✅ 免费咨询，联系 Rex 了解具体房源：' + k.waLink;
      if (isBuy) return '🏡 好的！帮您找购买房源，请问：\n\n1️⃣ 您倾向哪种类型？（公寓/排屋/洋房）\n2️⃣ 需要几个房间？\n3️⃣ 您的购买预算大概是多少？\n4️⃣ 自住还是投资？哪个区域？\n\nRex 将为您提供专业配对推荐 😊';
      if (isContact) return '📞 直接联系 Rex Yap：\n\n💬 WhatsApp：' + k.waLink + '\n🕐 服务时间：周一至周六 10:00–19:00\n🌐 服务语言：中文 / English / BM\n\n欢迎随时 WhatsApp，Rex 会尽快回复您 😊';
      if (isPrice) return '💰 沙巴房产价格参考：\n\n🔑 出租：RM 1,200–5,000/月\n🏡 购买：RM 350,000 起\n🏗️ 新楼盘：有特别发展商价\n\n具体价格因地区、面积和装修而异。请问您的需求是出租还是购买？😊';
      return '感谢您的咨询！😊\n\n我是 Merlin，Rex Yap 的房产助理。我可以帮您：\n\n🏠 查找出租房源\n🏡 购房咨询\n🏗️ 新楼盘信息\n📋 MM2H 签证\n📅 预约看房\n\n请问您有什么具体需求？或者直接 WhatsApp Rex：' + k.waLink;
    }

    if (lang === 'ms') {
      if (isBooking) return 'Boleh! Untuk buat temu janji tontonan:\n\n📋 Cara 1: Isi borang tempahan di laman web\n💬 Cara 2: WhatsApp terus kepada Rex: ' + k.waLink + '\n\nSila berikan nama, nombor telefon, hartanah yang diminati dan masa pilihan. Rex akan sahkan dalam 24 jam 😊';
      if (isMM2H) return '📋 MM2H (Malaysia My Second Home) ialah program visa kediaman jangka panjang untuk warga asing.\n\n✅ Rex menyediakan perundingan MM2H percuma\n✅ Bantuan permohonan dan sokongan undang-undang\n\nIngin tahu lebih lanjut? WhatsApp Rex: ' + k.waLink;
      if (isRent) return '🏠 Baik! Untuk cari hartanah sewa, boleh jawab:\n\n1️⃣ Kawasan mana? (KK/Tawau/Sandakan/lain)\n2️⃣ Berapa bilik tidur?\n3️⃣ Bajet sewa sebulan?\n4️⃣ Untuk diri sendiri atau keluarga?\n\nRex akan cadangkan hartanah yang sesuai 😊';
      if (isBuy) return '🏡 Baik! Untuk beli hartanah, boleh jawab:\n\n1️⃣ Jenis hartanah? (Apartment/Teres/Banglo)\n2️⃣ Berapa bilik tidur?\n3️⃣ Bajet pembelian?\n4️⃣ Untuk duduk atau pelaburan? Kawasan?\n\nRex akan beri cadangan profesional 😊';
      if (isContact) return '📞 Hubungi Rex Yap terus:\n\n💬 WhatsApp: ' + k.waLink + '\n🕐 Waktu: Isnin–Sabtu 10:00–19:00\n🌐 Bahasa: CN / EN / BM\n\nSila WhatsApp bila-bila masa, Rex akan balas secepat mungkin 😊';
      return 'Terima kasih kerana menghubungi! 😊\n\nSaya Merlin, pembantu hartanah Rex Yap. Boleh bantu:\n\n🏠 Hartanah Sewa\n🏡 Beli Hartanah\n🏗️ Projek Baru\n📋 Visa MM2H\n📅 Temu Janji Tontonan\n\nApakah keperluan anda? Atau WhatsApp Rex terus: ' + k.waLink;
    }

    // English fallback
    if (isBooking) return 'Sure! To book a property viewing:\n\n📋 Option 1: Fill in the booking form on the website\n💬 Option 2: WhatsApp Rex directly: ' + k.waLink + '\n\nJust share your name, contact, property of interest & preferred time. Rex will confirm within 24 hours 😊';
    if (isMM2H) return '📋 MM2H (Malaysia My Second Home) is a long-term residency visa for foreigners.\n\n✅ Rex offers free MM2H consultation\n✅ Full application & legal support\n\nInterested? WhatsApp Rex: ' + k.waLink;
    if (isForeign) return '🌏 Foreigners CAN buy property in Sabah, Malaysia!\n\n✅ Freehold properties available\n✅ Full legal & loan support\n✅ Multilingual service (CN/EN/BM)\n\nContact Rex for details: ' + k.waLink;
    if (isNewLaunch) return '🏗️ Multiple quality new launch projects in Sabah:\n\n✅ Freehold titles\n✅ Foreigner-purchasable\n✅ Developer special pricing\n\nContact Rex for project details: ' + k.waLink;
    if (isRent) return '🏠 Got it! For rental properties, please share:\n\n1️⃣ Preferred area? (KK/Tawau/Sandakan/Other)\n2️⃣ How many bedrooms?\n3️⃣ Monthly budget?\n4️⃣ For yourself or family?\n\nRex will recommend the best match 😊';
    if (isBuy) return '🏡 Great! For property purchase, please share:\n\n1️⃣ Property type? (Apartment/Terrace/Bungalow)\n2️⃣ Bedrooms needed?\n3️⃣ Purchase budget?\n4️⃣ Own stay or investment? Which area?\n\nRex will provide expert matching 😊';
    if (isContact) return '📞 Contact Rex Yap directly:\n\n💬 WhatsApp: ' + k.waLink + '\n🕐 Hours: Mon–Sat 10:00–19:00\n🌐 Languages: CN / EN / BM\n\nFeel free to WhatsApp anytime — Rex will reply ASAP 😊';
    return 'Thanks for reaching out! 😊\n\nI\'m Merlin, Rex Yap\'s property assistant. I can help with:\n\n🏠 Rental Properties\n🏡 Property Purchase\n🏗️ New Launches\n📋 MM2H Visa\n📅 Viewing Bookings\n\nWhat are you looking for? Or WhatsApp Rex directly: ' + k.waLink;
  }

  // ══════════════════════════════════════════════════════
  // ⑧ 姓名 & 电话识别（自动提取并保存到 CRM）
  // ══════════════════════════════════════════════════════
  function extractContact(text) {
    var updated = false;
    // 电话号码识别
    var phoneMatch = text.match(/(\+?6?01[0-9]{1}[\s-]?[0-9]{4}[\s-]?[0-9]{4})|(\+?[6]?01[0-9]{8,9})/);
    if (phoneMatch && !STATE.customerPhone) {
      STATE.customerPhone = phoneMatch[0].replace(/[\s-]/g,'');
      updated = true;
    }
    // 姓名识别（"我叫/我是/my name is/nama saya"）
    var nameMatch = text.match(/(?:我叫|我是|my name is|nama saya|nama (?:saya )?ialah|call me)\s*([A-Za-z\u4e00-\u9fff]{2,20})/i);
    if (nameMatch && !STATE.customerName) {
      STATE.customerName = nameMatch[1].trim();
      updated = true;
    }
    if (updated) {
      saveLead({ customerName: STATE.customerName, customerPhone: STATE.customerPhone });
    }
    return updated;
  }

  // ══════════════════════════════════════════════════════
  // ⑨ UI 操作函数（注入到 Merlin 聊天界面）
  // ══════════════════════════════════════════════════════
  function appendMessage(role, content) {
    var messagesEl = document.getElementById('merlin-messages');
    if (!messagesEl) return;
    var div = document.createElement('div');
    div.className = 'merlin-msg merlin-msg-' + (role === 'user' ? 'user' : 'bot');
    // 支持多行
    var formatted = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    div.innerHTML = '<div class="merlin-bubble">' + formatted + '</div>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // 保存到消息历史
    if (role === 'user') {
      STATE.messages.push({ role: 'user', content: content });
    } else if (role === 'assistant' || role === 'bot') {
      STATE.messages.push({ role: 'assistant', content: content });
    }
    // Rex 接管消息特殊样式
    if (role === 'rex') {
      div.className = 'merlin-msg merlin-msg-rex';
      div.innerHTML = '<div class="merlin-bubble merlin-bubble-rex">🧑‍💼 <b>Rex:</b> ' + formatted + '</div>';
    }
  }

  function showTyping(show) {
    STATE.isTyping = show;
    var el = document.getElementById('merlin-typing');
    if (!el) {
      if (!show) return;
      el = document.createElement('div');
      el.id = 'merlin-typing';
      el.className = 'merlin-msg merlin-msg-bot';
      el.innerHTML = '<div class="merlin-bubble" style="padding:10px 14px"><span class="merlin-dot-1">●</span><span class="merlin-dot-2">●</span><span class="merlin-dot-3">●</span></div>';
      var style = document.createElement('style');
      style.textContent = [
        '@keyframes mDot{0%,60%,100%{opacity:.3;transform:scale(.8)}30%{opacity:1;transform:scale(1)}}',
        '.merlin-dot-1,.merlin-dot-2,.merlin-dot-3{animation:mDot 1.2s infinite;font-size:10px;color:var(--accent,#2563eb);margin:0 1px}',
        '.merlin-dot-2{animation-delay:.2s}.merlin-dot-3{animation-delay:.4s}',
        '.merlin-msg-rex .merlin-bubble-rex{background:linear-gradient(135deg,#22c55e,#16a34a)!important;color:#fff!important}'
      ].join('');
      document.head.appendChild(style);
      var msgs = document.getElementById('merlin-messages');
      if (msgs) msgs.appendChild(el);
    }
    el.style.display = show ? '' : 'none';
    var msgs = document.getElementById('merlin-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function showTakeoverBanner(show) {
    var el = document.getElementById('merlin-takeover-banner');
    if (!el) return;
    var lang = STATE.lang;
    if (show) {
      var msgs = { zh: '🧑‍💼 Rex 已接管对话 · AI 助理暂停', en: '🧑‍💼 Rex has taken over · AI paused', ms: '🧑‍💼 Rex telah ambil alih · AI dijeda' };
      el.textContent = msgs[lang] || msgs.zh;
      el.style.display = 'block';
      el.style.background = 'linear-gradient(90deg,#22c55e,#16a34a)';
      el.style.color = '#fff';
      el.style.padding = '8px 16px';
      el.style.fontSize = '0.8rem';
      el.style.fontWeight = '600';
      el.style.textAlign = 'center';
    } else {
      el.style.display = 'none';
    }
  }

  function setQuickReplies(options) {
    var el = document.getElementById('merlin-quickreplies');
    if (!el) return;
    el.innerHTML = '';
    if (!options || !options.length) return;
    options.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'merlin-qr-btn';
      btn.textContent = opt;
      btn.onclick = function() {
        el.innerHTML = '';
        handleUserMessage(opt);
      };
      el.appendChild(btn);
    });
  }

  // ══════════════════════════════════════════════════════
  // ⑩ 核心消息处理
  // ══════════════════════════════════════════════════════
  async function handleUserMessage(text) {
    if (!text || !text.trim()) return;
    var input = document.getElementById('merlin-input');
    if (input) input.value = '';

    // 检测语言
    STATE.lang = detectLang();

    // 显示用户消息
    appendMessage('user', text);

    // 提取联系方式
    extractContact(text);

    // 保存对话到 CRM
    saveLead({ lastMsg: text, msgCount: STATE.messages.length });

    // Human Takeover 检查
    if (STATE.isTakenOver) {
      var msgs = { zh: '⏳ Rex 正在处理您的问题，请稍候…', en: '⏳ Rex is handling your query, please wait…', ms: '⏳ Rex sedang mengendalikan pertanyaan anda…' };
      appendMessage('bot', msgs[STATE.lang] || msgs.zh);
      return;
    }

    // AI 自动回复开关检查
    if (!CFG.autoReply) {
      var offMsgs = { zh: '📴 目前 AI 助手暂停服务，请直接 WhatsApp Rex：' + K().waLink, en: '📴 AI assistant is paused. Please WhatsApp Rex: ' + K().waLink, ms: '📴 Pembantu AI dijeda. WhatsApp Rex: ' + K().waLink };
      appendMessage('bot', offMsgs[STATE.lang] || offMsgs.zh);
      return;
    }

    // 显示打字指示器
    showTyping(true);

    try {
      var reply = await callClaudeAPI(text);
      showTyping(false);
      appendMessage('bot', reply);

      // 根据对话内容显示快捷按钮
      var followups = getFollowUpOptions(text, reply);
      if (followups.length) setQuickReplies(followups);

    } catch(e) {
      showTyping(false);
      appendMessage('bot', getFallbackReply(text));
    }

    // 更新 admin 实时数据
    saveLead({ lastReply: new Date().toISOString() });
  }

  function getFollowUpOptions(userMsg, reply) {
    var lang = STATE.lang;
    var k = K();
    var msg = (userMsg + reply).toLowerCase();

    if (lang === 'zh') {
      if (msg.includes('出租') || msg.includes('rent')) return ['🏙️ KK 市区', '🌊 沿海区域', '📍 斗湖', '💬 联系 Rex'];
      if (msg.includes('买') || msg.includes('buy') || msg.includes('购')) return ['🏢 公寓', '🏠 排屋', '💰 预算范围', '📅 预约看房'];
      if (msg.includes('预约') || msg.includes('book')) return ['📱 WhatsApp Rex', '📋 填写预约表单'];
      return ['🏠 出租房源', '🏡 买房咨询', '📞 联系 Rex'];
    }
    if (lang === 'ms') {
      return ['🏠 Sewa', '🏡 Beli', '📅 Tempah Tontonan', '💬 WhatsApp Rex'];
    }
    return ['🏠 Rental', '🏡 Buy Property', '📅 Book Viewing', '💬 WhatsApp Rex'];
  }

  // ══════════════════════════════════════════════════════
  // ⑪ 注入 CSS（聊天气泡样式补强）
  // ══════════════════════════════════════════════════════
  function injectStyles() {
    var style = document.createElement('style');
    style.id = 'merlin-ai-engine-styles';
    style.textContent = [
      '.merlin-msg{display:flex;margin:6px 12px}',
      '.merlin-msg-user{justify-content:flex-end}',
      '.merlin-msg-bot,.merlin-msg-rex{justify-content:flex-start}',
      '.merlin-bubble{max-width:82%;padding:10px 14px;border-radius:16px;font-size:0.88rem;line-height:1.55;word-break:break-word}',
      '.merlin-msg-user .merlin-bubble{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:16px 16px 4px 16px}',
      '.merlin-msg-bot .merlin-bubble{background:rgba(248,250,255,0.95);border:1px solid rgba(37,99,235,0.12);color:#27272a;border-radius:4px 16px 16px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}',
      '.merlin-msg-rex .merlin-bubble{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border-radius:4px 16px 16px 16px}',
      '#merlin-quickreplies{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-top:1px solid rgba(228,228,231,0.5)}',
      '.merlin-qr-btn{padding:6px 12px;border-radius:20px;border:1.5px solid rgba(37,99,235,0.25);background:rgba(37,99,235,0.06);color:#2563eb;font-size:0.78rem;font-weight:600;cursor:pointer;transition:all 0.18s;white-space:nowrap}',
      '.merlin-qr-btn:hover{background:rgba(37,99,235,0.15);border-color:rgba(37,99,235,0.4)}',
      '#merlin-takeover-banner{display:none;border-radius:0}',
      '.merlin-ai-badge{display:inline-flex;align-items:center;gap:4px;font-size:0.65rem;color:rgba(255,255,255,0.7);margin-top:2px}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════════════
  // ⑫ 挂载到 Merlin 聊天框架
  // ══════════════════════════════════════════════════════
  function mountToMerlin() {
    // 检查 Merlin 框架是否存在
    var sendBtn   = document.getElementById('merlin-send');
    var inputEl   = document.getElementById('merlin-input');
    var messagesEl = document.getElementById('merlin-messages');
    var toggleBtn = document.getElementById('merlin-toggle');

    if (!sendBtn || !inputEl) return false;

    // 生成会话 ID
    STATE.sessionId = 'ai_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    STATE.lang = detectLang();

    // 覆盖原有发送逻辑
    window.merlinSend = function() {
      var text = (inputEl.value || '').trim();
      if (text) handleUserMessage(text);
    };

    // 覆盖原有键盘监听
    window.merlinKeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.merlinSend();
      }
    };

    // 监听聊天窗口打开事件（显示欢迎消息）
    var origToggle = window.merlinToggle;
    window.merlinToggle = function() {
      if (typeof origToggle === 'function') origToggle();
      // 延迟检查是否刚打开
      setTimeout(function() {
        var chat = document.getElementById('merlin-chat');
        if (chat && !chat.classList.contains('merlin-hidden') && messagesEl && messagesEl.children.length === 0) {
          showWelcome();
        }
      }, 100);
    };

    // 也支持直接检测聊天框显示
    var observer = new MutationObserver(function() {
      var chat = document.getElementById('merlin-chat');
      if (chat && !chat.classList.contains('merlin-hidden') && messagesEl && messagesEl.children.length === 0) {
        showWelcome();
      }
    });
    var chat = document.getElementById('merlin-chat');
    if (chat) observer.observe(chat, { attributes: true, attributeFilter: ['class', 'style'] });

    return true;
  }

  // ══════════════════════════════════════════════════════
  // ⑬ 欢迎消息 & 初始快捷按钮
  // ══════════════════════════════════════════════════════
  function showWelcome() {
    STATE.lang = detectLang();
    var k = K();
    var lang = STATE.lang;

    var welcomeMsg = '';
    if (lang === 'zh') {
      welcomeMsg = '您好！我是 Merlin 🏠\nRex Yap 的 AI 房产助理\n\n我可以帮您：\n• 🏠 查找出租房源\n• 🏡 购房咨询\n• 🏗️ 新楼盘信息\n• 📋 MM2H 签证\n• 📅 预约看房\n\n请问有什么可以帮您？';
    } else if (lang === 'ms') {
      welcomeMsg = 'Hai! Saya Merlin 🏠\nPembantu hartanah AI Rex Yap\n\nSaya boleh bantu:\n• 🏠 Hartanah Sewa\n• 🏡 Beli Hartanah\n• 🏗️ Projek Baru\n• 📋 Visa MM2H\n• 📅 Temu Janji Tontonan\n\nBoleh saya bantu anda?';
    } else {
      welcomeMsg = 'Hi! I\'m Merlin 🏠\nRex Yap\'s AI Property Assistant\n\nI can help with:\n• 🏠 Rental Properties\n• 🏡 Property Purchase\n• 🏗️ New Launches\n• 📋 MM2H Visa\n• 📅 Viewing Bookings\n\nHow can I help you?';
    }

    appendMessage('bot', welcomeMsg);
    setQuickReplies(k.quickReplies);

    // 更新 admin 标题
    var sub = document.getElementById('merlin-header-sub');
    var tags = { zh: 'Rex 的 AI 助理 · Claude 驱动', en: 'Rex\'s AI Assistant · Claude Powered', ms: 'Pembantu AI Rex · Dikuasakan Claude' };
    if (sub) sub.textContent = tags[lang] || tags.zh;

    // 如果 admin 配置了操作员状态，更新在线指示
    updateStatusIndicator();
  }

  function updateStatusIndicator() {
    var dot = document.getElementById('merlin-status-dot');
    var sub = document.getElementById('merlin-header-sub');
    var status = CFG.opStatus;
    var colors = { online: '#4ade80', away: '#fbbf24', busy: '#f87171', offline: '#6b7280' };
    var color = colors[status] || colors.online;
    if (dot) { dot.style.background = color; dot.style.boxShadow = '0 0 6px ' + color; }
    var lang = STATE.lang;
    var labels = {
      zh: { online: 'Rex 在线 · 随时回复', away: 'Rex 暂离 · AI 助理服务', busy: 'Rex 忙碌 · AI 助理服务', offline: 'AI 助理为您服务' },
      en: { online: 'Rex Online · Quick Reply', away: 'Rex Away · AI Assisting', busy: 'Rex Busy · AI Assisting', offline: 'AI Assistant Active' },
      ms: { online: 'Rex Dalam Talian', away: 'Rex Jauh · AI Membantu', busy: 'Rex Sibuk · AI Membantu', offline: 'Pembantu AI Aktif' }
    };
    if (sub) sub.textContent = (labels[lang] && labels[lang][status]) || labels.zh.online;
  }

  // ══════════════════════════════════════════════════════
  // ⑭ Admin AI 助手扩展（后台 callClaude 增强）
  // ══════════════════════════════════════════════════════
  function enhanceAdminAI() {
    // 如果在 merlin-admin.html 中，增强 callClaude 函数
    if (typeof callClaude !== 'undefined' || document.title.includes('Command Center')) {
      // 增强版：自动选择 Claude 或 DeepSeek
      window.callClaudeEnhanced = async function(sys, msgs, maxTok) {
        var key = localStorage.getItem('merlin_api_key') || '';
        maxTok = maxTok || 800;
        if (!key) { window.toast && toast('❌ 请先在设置页填入 API Key'); return ''; }

        // 判断 key 类型
        var isAnthropic = key.startsWith('sk-ant-');
        var isDeepSeek  = key.startsWith('sk-') && !isAnthropic;

        if (isAnthropic) {
          // Claude API 格式
          var resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01' },
            body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:maxTok, system:sys, messages:msgs })
          });
          var data = await resp.json();
          if (data.error) throw new Error(data.error.message);
          return (data.content && data.content[0] && data.content[0].text) || '';
        } else {
          // DeepSeek 兼容格式（原有逻辑）
          var allMsgs = [{role:'system',content:sys}].concat(msgs);
          var resp2 = await fetch('https://api.deepseek.com/chat/completions', {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
            body:JSON.stringify({model:'deepseek-chat',max_tokens:maxTok,messages:allMsgs})
          });
          var data2 = await resp2.json();
          if (data2.error) throw new Error(data2.error.message||JSON.stringify(data2.error));
          return (data2.choices&&data2.choices[0]&&data2.choices[0].message&&data2.choices[0].message.content)||'';
        }
      };
    }
  }

  // ══════════════════════════════════════════════════════
  // ⑮ 主初始化
  // ══════════════════════════════════════════════════════
  function init() {
    if (STATE.initialized) return;

    injectStyles();
    initFirebase();
    enhanceAdminAI();

    // 如果在 index.html（有 merlin-widget）
    var widget = document.getElementById('merlin-widget');
    if (widget) {
      // 尝试挂载，如 DOM 未准备好则等待
      if (!mountToMerlin()) {
        var retries = 0;
        var interval = setInterval(function() {
          retries++;
          if (mountToMerlin() || retries > 20) clearInterval(interval);
        }, 300);
      }
    }

    STATE.initialized = true;

    // 监听语言切换，更新状态
    document.addEventListener('click', function(e) {
      if (e.target && e.target.classList && e.target.classList.contains('lang-btn')) {
        setTimeout(function() {
          STATE.lang = detectLang();
          updateStatusIndicator();
        }, 100);
      }
    });

    console.log('[Merlin AI Engine v3.0] ✅ Initialized — Claude API Ready');
  }

  // 等待 DOM 准备好
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露公共 API
  window.MerlinAI = {
    version: '3.0',
    sendMessage: handleUserMessage,
    getState: function() { return STATE; },
    updateLang: function(l) { STATE.lang = l; },
    // Admin 用：发送消息给访客（Human Takeover）
    sendToVisitor: function(msg) {
      appendMessage('rex', msg);
      try {
        localStorage.setItem('merlin_broadcast', JSON.stringify({msg:msg, ts:Date.now(), from:'rex'}));
      } catch(e){}
    }
  };

})();
