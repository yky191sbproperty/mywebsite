/**
 * Merlin WA CRM — 后端服务器
 * 使用 whatsapp-web.js 真实发送 WhatsApp 消息
 *
 * 安装依赖：npm install whatsapp-web.js qrcode-terminal express cors firebase-admin
 * 启动：    node server.js
 */

const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════
// 状态
// ═══════════════════════════════════════════════════
let waStatus = 'disconnected'; // disconnected | qr_ready | connecting | ready | auth_failure
let qrDataUrl = null;
let sendLog = [];      // { id, ts, name, phone, msg, status, note }
let messageQueue = []; // { id, ts, name, phone, msg, ruleName, tplName }

// ═══════════════════════════════════════════════════
// WhatsApp 客户端
// ═══════════════════════════════════════════════════
const waClient = new Client({
  authStrategy: new LocalAuth({ clientId: 'merlin-crm' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

waClient.on('qr', (qr) => {
  waStatus = 'qr_ready';
  qrDataUrl = qr;
  console.log('\n📱 请用 WhatsApp 扫描二维码：\n');
  qrcode.generate(qr, { small: true });
  console.log('\n或访问 http://localhost:3000/qr 查看二维码图片\n');
});

waClient.on('loading_screen', (percent) => {
  waStatus = 'connecting';
  console.log(`⏳ 正在加载 WhatsApp... ${percent}%`);
});

waClient.on('authenticated', () => {
  waStatus = 'connecting';
  console.log('✅ WhatsApp 认证成功');
});

waClient.on('auth_failure', (msg) => {
  waStatus = 'auth_failure';
  console.error('❌ 认证失败:', msg);
});

waClient.on('ready', () => {
  waStatus = 'ready';
  qrDataUrl = null;
  console.log('🟢 WhatsApp 已连接，可以发送消息！');
  console.log('📊 管理界面：http://localhost:3000\n');
});

waClient.on('disconnected', (reason) => {
  waStatus = 'disconnected';
  console.log('🔴 WhatsApp 断开连接:', reason);
});

// 接收消息（可选：记录入站消息）
waClient.on('message', async (msg) => {
  if (msg.fromMe) return;
  const contact = await msg.getContact();
  const phone = msg.from.replace('@c.us', '');
  console.log(`📨 收到消息 [${phone}] ${contact.pushname || '未知'}: ${msg.body}`);
  // 可在此处接入 AI 自动回复逻辑
});

waClient.initialize().catch(err => {
  console.error('WhatsApp 初始化失败:', err.message);
  console.log('💡 提示：请确保已安装 Chromium（sudo apt install chromium-browser）');
});

// ═══════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════
function cleanPhone(phone) {
  // 清理电话号码，保留数字，去掉 +
  let p = String(phone || '').replace(/\D/g, '');
  // 马来西亚号码补全国码
  if (p.startsWith('0')) p = '60' + p.slice(1);
  return p;
}

function addLog(item, status, note = '') {
  const entry = {
    id: 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    ts: Date.now(),
    name: item.name || '匿名',
    phone: item.phone || '',
    flow: item.flow || 'chat',
    ruleName: item.ruleName || '—',
    tplName: item.tplName || '—',
    msgPrev: (item.msg || '').slice(0, 80) + '…',
    status,
    note
  };
  sendLog.unshift(entry);
  if (sendLog.length > 500) sendLog = sendLog.slice(0, 400);
  return entry;
}

// ═══════════════════════════════════════════════════
// API 路由
// ═══════════════════════════════════════════════════

// 健康检查 + WA 状态
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    waStatus,
    hasQr: !!qrDataUrl,
    queueLength: messageQueue.length,
    logLength: sendLog.length
  });
});

// 获取 QR 码（base64 图片）
app.get('/api/qr', (req, res) => {
  if (!qrDataUrl) {
    return res.json({ ok: false, msg: waStatus === 'ready' ? '已连接，无需扫码' : '二维码尚未生成，请稍候' });
  }
  // 使用 qrcode 库生成 data URL
  try {
    const QRCode = require('qrcode');
    QRCode.toDataURL(qrDataUrl, (err, url) => {
      if (err) return res.json({ ok: false, msg: '生成二维码失败' });
      res.json({ ok: true, dataUrl: url });
    });
  } catch {
    res.json({ ok: false, msg: '请安装 qrcode 包：npm install qrcode' });
  }
});

// 重新连接 / 登出
app.post('/api/logout', async (req, res) => {
  try {
    await waClient.logout();
    waStatus = 'disconnected';
    res.json({ ok: true, msg: '已登出，请重启服务器重新扫码' });
  } catch (e) {
    res.json({ ok: false, msg: e.message });
  }
});

// ── 发送单条消息 ──
app.post('/api/send', async (req, res) => {
  const { phone, message, name, ruleName, tplName, flow } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ ok: false, msg: '缺少 phone 或 message 参数' });
  }
  if (waStatus !== 'ready') {
    return res.status(503).json({ ok: false, msg: `WhatsApp 未就绪（当前状态：${waStatus}）` });
  }

  const cleanedPhone = cleanPhone(phone);
  if (!cleanedPhone || cleanedPhone.length < 8) {
    return res.status(400).json({ ok: false, msg: '电话号码格式错误：' + phone });
  }

  const chatId = cleanedPhone + '@c.us';
  const item = { name, phone: cleanedPhone, flow, ruleName, tplName, msg: message };

  try {
    await waClient.sendMessage(chatId, message);
    const log = addLog(item, 'sent');
    console.log(`✅ 消息已发送 → ${cleanedPhone} [${name || '匿名'}]`);
    res.json({ ok: true, logId: log.id, msg: '消息已发送' });
  } catch (err) {
    const log = addLog(item, 'failed', err.message);
    console.error(`❌ 发送失败 → ${cleanedPhone}:`, err.message);
    res.status(500).json({ ok: false, logId: log.id, msg: '发送失败：' + err.message });
  }
});

// ── 批量发送队列 ──
app.post('/api/send-batch', async (req, res) => {
  const { items, delayMs = 2000 } = req.body; // items: [{phone, message, name, ...}]

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ ok: false, msg: '没有消息可发送' });
  }
  if (waStatus !== 'ready') {
    return res.status(503).json({ ok: false, msg: `WhatsApp 未就绪（${waStatus}）` });
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cleanedPhone = cleanPhone(item.phone);

    if (!cleanedPhone) {
      results.push({ phone: item.phone, ok: false, msg: '电话号码无效' });
      failCount++;
      continue;
    }

    try {
      await waClient.sendMessage(cleanedPhone + '@c.us', item.message);
      addLog({ ...item, phone: cleanedPhone }, 'sent');
      results.push({ phone: cleanedPhone, name: item.name, ok: true });
      successCount++;
      console.log(`✅ [${i + 1}/${items.length}] 已发送 → ${cleanedPhone}`);
    } catch (err) {
      addLog({ ...item, phone: cleanedPhone }, 'failed', err.message);
      results.push({ phone: cleanedPhone, ok: false, msg: err.message });
      failCount++;
      console.error(`❌ [${i + 1}/${items.length}] 失败 → ${cleanedPhone}:`, err.message);
    }

    // 避免被 WA 限速，每条消息间隔
    if (i < items.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  res.json({ ok: true, successCount, failCount, results });
});

// ── 加入队列（延迟发送）──
app.post('/api/queue', (req, res) => {
  const { phone, message, name, ruleName, tplName, flow, delaySeconds = 0 } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ ok: false, msg: '缺少 phone 或 message' });
  }

  const item = {
    id: 'q_' + Date.now(),
    ts: Date.now(),
    sendAt: Date.now() + (delaySeconds * 1000),
    name: name || '匿名',
    phone: cleanPhone(phone),
    flow: flow || 'chat',
    ruleName: ruleName || '—',
    tplName: tplName || '—',
    msg: message,
    status: 'queued'
  };

  messageQueue.push(item);
  addLog(item, 'queued');

  console.log(`📬 消息已入队 → ${item.phone} [${item.name}]，将在 ${delaySeconds}s 后发送`);
  res.json({ ok: true, queueId: item.id, sendAt: item.sendAt });
});

// ── 获取队列 ──
app.get('/api/queue', (req, res) => {
  res.json({ ok: true, items: messageQueue, count: messageQueue.length });
});

// ── 删除/跳过队列项 ──
app.delete('/api/queue/:id', (req, res) => {
  const idx = messageQueue.findIndex(q => q.id === req.params.id);
  if (idx < 0) return res.status(404).json({ ok: false, msg: '未找到' });
  const item = messageQueue.splice(idx, 1)[0];
  addLog(item, 'skipped', '手动跳过');
  res.json({ ok: true, msg: '已从队列移除' });
});

// ── 立即执行队列中某条 ──
app.post('/api/queue/:id/send-now', async (req, res) => {
  const item = messageQueue.find(q => q.id === req.params.id);
  if (!item) return res.status(404).json({ ok: false, msg: '未找到队列项' });
  if (waStatus !== 'ready') return res.status(503).json({ ok: false, msg: 'WhatsApp 未就绪' });

  try {
    await waClient.sendMessage(item.phone + '@c.us', item.msg);
    messageQueue = messageQueue.filter(q => q.id !== item.id);
    addLog(item, 'sent');
    res.json({ ok: true, msg: '已发送' });
  } catch (err) {
    addLog(item, 'failed', err.message);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

// ── 获取发送日志 ──
app.get('/api/log', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ ok: true, items: sendLog.slice(0, limit), total: sendLog.length });
});

// ── 清空日志 ──
app.delete('/api/log', (req, res) => {
  sendLog = [];
  res.json({ ok: true, msg: '日志已清空' });
});

// ── Firebase Webhook（从 merlin_leads 接到新顾客后调用）──
app.post('/api/webhook/new-lead', (req, res) => {
  const lead = req.body;
  console.log('🔔 收到新线索 webhook:', lead.customerName, lead.customerPhone);
  // 这里只记录，实际触发逻辑在 dashboard 前端或此处扩展
  res.json({ ok: true, received: true });
});

// ═══════════════════════════════════════════════════
// 队列自动执行器（每 5 秒检查一次）
// ═══════════════════════════════════════════════════
setInterval(async () => {
  if (waStatus !== 'ready') return;
  const now = Date.now();
  const due = messageQueue.filter(q => q.sendAt <= now && q.status === 'queued');

  for (const item of due) {
    try {
      await waClient.sendMessage(item.phone + '@c.us', item.msg);
      messageQueue = messageQueue.filter(q => q.id !== item.id);
      addLog(item, 'sent');
      console.log(`⏰ 定时发送成功 → ${item.phone} [${item.name}]`);
    } catch (err) {
      item.status = 'failed';
      addLog(item, 'failed', err.message);
      console.error(`⏰ 定时发送失败 → ${item.phone}:`, err.message);
    }
    // 每条间隔 2 秒
    await new Promise(r => setTimeout(r, 2000));
  }
}, 5000);

// ═══════════════════════════════════════════════════
// 启动
// ═══════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Merlin WA CRM 后端已启动`);
  console.log(`📡 API 地址：http://localhost:${PORT}`);
  console.log(`📱 正在初始化 WhatsApp...（首次使用请扫码）\n`);
});
