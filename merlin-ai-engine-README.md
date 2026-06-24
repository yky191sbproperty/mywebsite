# Merlin AI Engine v3.0 — 安装指南

## 📦 文件说明

```
merlin-ai-engine.js   ← 主 AI 引擎（此文件）
index.html            ← 顾客聊天界面
merlin-admin.html     ← 管理后台
```

---

## 🚀 安装步骤（index.html）

在 `index.html` 找到 `</body>` 标签，在它前面加入：

```html
<script src="merlin-ai-engine.js"></script>
```

就这一行，完成！

---

## 🔑 配置 API Key（merlin-admin.html）

1. 打开 `merlin-admin.html`
2. 点击左侧 **⚙️ 安装指南**
3. 在 **DeepSeek API Key 设置** 填入你的 API Key

支持两种 Key：

| 类型 | 前缀 | 申请地址 |
|------|------|---------|
| **Anthropic Claude**（推荐） | `sk-ant-…` | [console.anthropic.com](https://console.anthropic.com) |
| **DeepSeek**（原有） | `sk-…` | [platform.deepseek.com](https://platform.deepseek.com) |

AI 引擎会自动识别 Key 类型，无需额外配置。

---

## ✅ 功能说明

### 顾客端（index.html）

| 功能 | 说明 |
|------|------|
| 🤖 AI 智能回复 | Claude 或 DeepSeek 驱动，中/英/马来语自动适配 |
| 🏠 房产知识库 | 内置沙巴房产专业知识，价格范围、区域、服务 |
| 📞 联系方式识别 | 自动从对话提取顾客姓名和电话 |
| 💬 快捷回复按钮 | 动态生成引导按钮，提升用户体验 |
| 📅 看房预约引导 | 自动引导到预约表单或 WhatsApp |
| 🔄 Human Takeover | Rex 可随时在 admin 接管对话 |

### 管理员端（merlin-admin.html）

| 功能 | 说明 |
|------|------|
| 🔑 API Key 管理 | 支持 Anthropic Claude 和 DeepSeek |
| 🤖 AI 自动回复开关 | 运营台 → Rex AI 开关控制 |
| 🟢 在线状态 | 在线/暂离/忙碌/离线，显示在聊天窗口 |
| 📢 广播消息 | 发送消息给所有活跃访客 |
| 📅 Human Takeover | 单独接管某个访客对话 |

---

## 🔄 Admin 与 index.html 数据同步

所有设置通过 **localStorage** 自动同步（两个文件需在同一域名）：

| localStorage Key | 说明 |
|-----------------|------|
| `merlin_api_key` | AI API Key |
| `merlin_rex_enabled` | AI 自动回复开关 (`true`/`false`) |
| `merlin_op_status` | Rex 在线状态 |
| `merlin_human_takeover` | 全局接管开关 |
| `merlin_broadcast` | 广播消息（JSON） |
| `merlin_wa_num` | Rex 的 WhatsApp 号码 |
| `merlin_crm_leads` | 顾客 CRM 数据（同步到 Firebase） |

---

## 🌐 多语言支持

AI 引擎自动检测语言：
- 优先读取 `rex_lang` localStorage 变量
- 检测用户浏览器语言
- 根据语言选择：中文 / English / Bahasa Melayu

---

## ⚠️ 无 API Key 时的降级行为

没有配置 API Key 时，引擎使用内置智能预设回复（关键词匹配），覆盖：
- 出租/购买/新楼盘/MM2H/预约/价格/联系 等常见问题

---

## 🛠️ 常见问题

**Q: 怎么关闭 AI 自动回复？**  
A: 在 admin → 运营台 → 关闭 "Rex AI 自动回复" 开关

**Q: 支持哪些 Claude 模型？**  
A: 默认使用 `claude-haiku-4-5-20251001`（快速且成本低），如需更强大的模型可修改 `merlin-ai-engine.js` 第 162 行的 `model` 值

**Q: 怎么让 Rex 接管对话？**  
A: admin → 运营台 → 活跃访客 → 点击接管；或在广播消息框发送消息
