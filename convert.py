#!/usr/bin/env python3
"""
convert.py — Rex Yap Property Listings Converter
将 listing_manager.xlsx 转换为 listingsData.js

列结构 (listing_manager.xlsx):
  ★ 输入列 (你填写的):
    A(1)   状态 Status        — active / inactive
    B(2)   徽章 Badge         — 下拉选择
    C(3)   图片文件名 Image    — 逗号分隔多图
    D(4)   楼名·地点 Name     — 主要名称（中文/英文皆可）
    E(5)   房间数 Bedrooms
    F(6)   卫生间数 Bathrooms
    G(7)   面积 sqft
    H(8)   娱乐设施 Facilities
    I(9)   保安人员 Guard Type
    J(10)  CCTV 监控
    K(11)  门禁 Access Level
    L(12)  价格 RM (数字)
    M(13)  备注 Remarks

  ⚡ 自动生成列 (Excel 公式列，若有内容则优先使用，否则 convert.py 自动生成):
    N(14)  ⚡ Icon
    O(15)  ⚡ 标题 ZH      P(16) ⚡ Title EN    Q(17) ⚡ Title MS
    R(18)  ⚡ 特点 ZH      S(19) ⚡ Features EN  T(20) ⚡ Feat MS
    U(21)  ⚡ 保安摘要 ZH
    V(22)  ⚡ 价格 ZH      W(23) ⚡ Price EN     X(24) ⚡ Price MS
    Y(25)  ⚡ WA ZH        Z(26) ⚡ WA EN        AB(28) ⚡ WA MS

  💡 提示：如需自定义多语言标题，可在 ⚡ 列直接填写。
           若 ⚡ 列为空，convert.py 会自动生成。

Usage:
    python convert.py
    python convert.py --excel listing_manager.xlsx --output listingsData.js
"""

import json, sys, argparse
from pathlib import Path
from datetime import datetime

try:
    import openpyxl
except ImportError:
    print("❌ 请先安装: pip install openpyxl")
    sys.exit(1)

# ── 输入列 (1-based) ──────────────────────────────────────────────────────────
COL_STATUS  = 1   # A  active / inactive
COL_BADGE   = 2   # B  徽章
COL_IMAGE   = 3   # C  图片文件名
COL_NAME    = 4   # D  楼名·地点
COL_BEDS    = 5   # E  房间数
COL_BATHS   = 6   # F  卫生间数
COL_SQFT    = 7   # G  面积 sqft
COL_FACIL   = 8   # H  娱乐设施
COL_GUARD   = 9   # I  保安人员
COL_CCTV    = 10  # J  CCTV
COL_ACCESS  = 11  # K  门禁
COL_PRICE   = 12  # L  价格 RM
COL_REMARKS = 13  # M  备注

# ── ⚡ 自动生成列 (优先读取，为空则自动生成) ──────────────────────────────────
COL_ICON     = 14  # N  ⚡ Icon
COL_TITLE_ZH = 15  # O  ⚡ 标题 ZH
COL_TITLE_EN = 16  # P  ⚡ Title EN
COL_TITLE_MS = 17  # Q  ⚡ Title MS
COL_FEAT_ZH  = 18  # R  ⚡ 特点 ZH
COL_FEAT_EN  = 19  # S  ⚡ Features EN
COL_FEAT_MS  = 20  # T  ⚡ Feat MS
COL_SEC_ZH   = 21  # U  ⚡ 保安摘要 ZH
COL_PRICE_ZH = 22  # V  ⚡ 价格 ZH
COL_PRICE_EN = 23  # W  ⚡ Price EN
COL_PRICE_MS = 24  # X  ⚡ Price MS
COL_WA_ZH    = 25  # Y  ⚡ WA ZH
COL_WA_EN    = 26  # Z  ⚡ WA EN
# Col 27 = spare
COL_WA_MS    = 28  # AB ⚡ WA MS

DATA_START_ROW = 4

# ── Badge → icon 对应 ─────────────────────────────────────────────────────────
BADGE_ICON = {
    "🏢 Condo 公寓":        "fa-building",
    "🏠 Apartment":         "fa-home",
    "🏡 Terrace 排屋":      "fa-house",
    "🏘️ Semi-D":           "fa-home",
    "🏰 Bungalow 独立洋房":  "fa-home",
    "🏬 Shop Lot 商铺":     "fa-store",
    "🏗️ New Launch 新盘":   "fa-drafting-compass",
    "🏢 SOHO":              "fa-city",
}

# ── 房产类型的三语翻译 ─────────────────────────────────────────────────────────
TYPE_TRANS = {
    "公寓": {"en": "Condo", "ms": "Kondominium"},
    "Condo": {"en": "Condo", "ms": "Kondominium"},
    "排屋": {"en": "Terrace House", "ms": "Rumah Teres"},
    "洋房": {"en": "Bungalow", "ms": "Banglo"},
    "商铺": {"en": "Shop Lot", "ms": "Lot Kedai"},
    "SOHO": {"en": "SOHO", "ms": "SOHO"},
}

# ── 城市名三语对照 ─────────────────────────────────────────────────────────────
CITY_TRANS = {
    "亚庇": {"en": "Kota Kinabalu", "ms": "Kota Kinabalu"},
    "斗湖": {"en": "Tawau", "ms": "Tawau"},
    "山打根": {"en": "Sandakan", "ms": "Sandakan"},
    "拿笃": {"en": "Lahad Datu", "ms": "Lahad Datu"},
    "吧巴": {"en": "Papar", "ms": "Papar"},
    "根地咬": {"en": "Keningau", "ms": "Keningau"},
    "兰脑": {"en": "Ranau", "ms": "Ranau"},
    "古达": {"en": "Kudat", "ms": "Kudat"},
}

SHEETS = {
    "rentals":     "🏠 出租房源 Rentals",
    "forSale":     "🏡 出售房源 For Sale",
    "newLaunches": "🏗️ 新楼盘 New Launches",
}


def cv(ws, row, col):
    """读取单元格，返回干净字符串，None 或空白返回 ''。"""
    v = ws.cell(row=row, column=col).value
    s = str(v).strip() if v is not None else ""
    return "" if s in ("nan", "None") else s


def get_icon(badge):
    for key, icon in BADGE_ICON.items():
        if key in badge:
            return icon
    return "fa-home"


def build_badge(badge_raw, remarks):
    if remarks and len(remarks) < 25:
        return f"✨ {remarks}"
    return badge_raw or "🏠 房源"


def auto_translate_title(name_zh):
    """
    自动将中文楼名翻译为英文/马来文。
    逻辑：识别城市名和房型关键词替换；无法识别的保留原文。
    """
    name_en = name_zh
    name_ms = name_zh

    # 替换城市名
    for zh, trans in CITY_TRANS.items():
        if zh in name_zh:
            name_en = name_en.replace(zh, trans["en"])
            name_ms = name_ms.replace(zh, trans["ms"])

    # 替换房型关键词
    for zh, trans in TYPE_TRANS.items():
        if zh in name_en:
            name_en = name_en.replace(zh, trans["en"])
        if zh in name_ms:
            name_ms = name_ms.replace(zh, trans["ms"])

    return name_en, name_ms


def build_features(beds, baths, sqft, facil, guard, cctv, access, lang):
    if lang == "zh":
        parts = [f"📍 {beds}房{baths}卫"] if beds and baths else []
        if sqft:  parts.append(f"面积 {sqft} sqft")
        if facil: parts.append(facil)
    elif lang == "en":
        parts = [f"📍 {beds}BR {baths}BA"] if beds and baths else []
        if sqft:  parts.append(f"{sqft} sqft")
        if facil: parts.append(facil)
    else:  # ms
        parts = [f"📍 {beds}Bilik {baths}Bilik Air"] if beds and baths else []
        if sqft:  parts.append(f"{sqft} sqft")
        if facil: parts.append(facil)

    sec = " · ".join(filter(None, [guard, cctv, access]))
    if sec:
        parts.append(f"🔒 {sec}")
    return " · ".join(parts)


def build_price(price_rm, category, lang):
    try:
        price_str = f"{float(price_rm):,.0f}"
    except (ValueError, TypeError):
        price_str = price_rm or ""

    if not price_str:
        if category == "newLaunches":
            return {"zh": "🔥 欢迎咨询价格", "en": "🔥 Price Upon Request", "ms": "🔥 Harga atas Permintaan"}[lang]
        return {"zh": "💰 欢迎咨询", "en": "💰 Enquire Now", "ms": "💰 Hubungi Kami"}[lang]

    if category == "rentals":
        return {"zh": f"💰 月租 RM {price_str}",
                "en": f"💰 Monthly Rent RM {price_str}",
                "ms": f"💰 Sewa Bulanan RM {price_str}"}[lang]
    elif category == "newLaunches":
        return {"zh": "🔥 欢迎咨询价格",
                "en": "🔥 Price Upon Request",
                "ms": "🔥 Harga atas Permintaan"}[lang]
    else:
        return {"zh": f"💰 售价 RM {price_str}",
                "en": f"💰 Selling Price RM {price_str}",
                "ms": f"💰 Harga Jualan RM {price_str}"}[lang]


def build_wa(title_zh, title_en, title_ms, price_zh, price_en, price_ms,
             beds, baths, category, lang):
    if category == "rentals":
        return {
            "zh": f"你好Rex，我想了解出租房源：{title_zh}（{price_zh}）。\n📍 {beds}房{baths}卫。\n能否发送该房源的照片？谢谢！",
            "en": f"Hi Rex, I'm interested in the rental: {title_en} ({price_en}).\n📍 {beds}BR {baths}BA.\nCould you send photos? Thanks!",
            "ms": f"Hai Rex, saya berminat dengan sewa: {title_ms} ({price_ms}).\n📍 {beds}Bilik {baths}Bilik Air.\nBoleh hantar gambar? Terima kasih!",
        }[lang]
    elif category == "newLaunches":
        return {
            "zh": f"你好Rex，我想了解新楼盘：{title_zh}。\n能否发送项目照片/户型图？谢谢！",
            "en": f"Hi Rex, I'm interested in the new launch: {title_en}.\nCould you send project photos/floor plans? Thanks!",
            "ms": f"Hai Rex, saya berminat dengan projek baru: {title_ms}.\nBoleh hantar gambar projek/pelan lantai? Terima kasih!",
        }[lang]
    else:
        return {
            "zh": f"你好Rex，我想了解出售房源：{title_zh}（{price_zh}）。\n📍 {beds}房{baths}卫。\n能否发送照片？谢谢！",
            "en": f"Hi Rex, I'm interested in the property: {title_en} ({price_en}).\n📍 {beds}BR {baths}BA.\nCould you send photos? Thanks!",
            "ms": f"Hai Rex, saya berminat dengan hartanah: {title_ms} ({price_ms}).\n📍 {beds}Bilik {baths}Bilik Air.\nBoleh hantar gambar? Terima kasih!",
        }[lang]


def parse_sheet(ws, category):
    items = []
    for row in range(DATA_START_ROW, ws.max_row + 1):
        status = cv(ws, row, COL_STATUS).lower()
        if status != "active":
            continue
        name = cv(ws, row, COL_NAME)
        if not name:
            continue

        badge_raw = cv(ws, row, COL_BADGE)
        image     = cv(ws, row, COL_IMAGE) or None
        beds      = cv(ws, row, COL_BEDS)
        baths     = cv(ws, row, COL_BATHS)
        sqft      = cv(ws, row, COL_SQFT)
        facil     = cv(ws, row, COL_FACIL)
        guard     = cv(ws, row, COL_GUARD)
        cctv      = cv(ws, row, COL_CCTV)
        access    = cv(ws, row, COL_ACCESS)
        price_rm  = cv(ws, row, COL_PRICE)
        remarks   = cv(ws, row, COL_REMARKS)

        # ── ⚡ 优先读取 Excel 已填写的多语言内容 ──────────────────────────────
        icon_pre     = cv(ws, row, COL_ICON)
        title_zh_pre = cv(ws, row, COL_TITLE_ZH)
        title_en_pre = cv(ws, row, COL_TITLE_EN)
        title_ms_pre = cv(ws, row, COL_TITLE_MS)
        feat_zh_pre  = cv(ws, row, COL_FEAT_ZH)
        feat_en_pre  = cv(ws, row, COL_FEAT_EN)
        feat_ms_pre  = cv(ws, row, COL_FEAT_MS)
        price_zh_pre = cv(ws, row, COL_PRICE_ZH)
        price_en_pre = cv(ws, row, COL_PRICE_EN)
        price_ms_pre = cv(ws, row, COL_PRICE_MS)
        wa_zh_pre    = cv(ws, row, COL_WA_ZH)
        wa_en_pre    = cv(ws, row, COL_WA_EN)
        wa_ms_pre    = cv(ws, row, COL_WA_MS)

        # ── 自动生成缺失的内容 ────────────────────────────────────────────────
        icon  = icon_pre  or get_icon(badge_raw)
        badge = build_badge(badge_raw, remarks)

        # 标题：中文用楼名，英文/马来文尝试自动翻译
        title_zh = title_zh_pre or name
        if title_en_pre:
            title_en = title_en_pre
        else:
            title_en, _ = auto_translate_title(name)
        if title_ms_pre:
            title_ms = title_ms_pre
        else:
            _, title_ms = auto_translate_title(name)

        # 特点
        feat_zh = feat_zh_pre or build_features(beds, baths, sqft, facil, guard, cctv, access, "zh")
        feat_en = feat_en_pre or build_features(beds, baths, sqft, facil, guard, cctv, access, "en")
        feat_ms = feat_ms_pre or build_features(beds, baths, sqft, facil, guard, cctv, access, "ms")

        # 价格
        price_zh = price_zh_pre or build_price(price_rm, category, "zh")
        price_en = price_en_pre or build_price(price_rm, category, "en")
        price_ms = price_ms_pre or build_price(price_rm, category, "ms")

        # WhatsApp 文字
        wa_zh = wa_zh_pre or build_wa(title_zh, title_en, title_ms, price_zh, price_en, price_ms, beds, baths, category, "zh")
        wa_en = wa_en_pre or build_wa(title_zh, title_en, title_ms, price_zh, price_en, price_ms, beds, baths, category, "en")
        wa_ms = wa_ms_pre or build_wa(title_zh, title_en, title_ms, price_zh, price_en, price_ms, beds, baths, category, "ms")

        items.append({
            "badge":    badge,
            "icon":     icon,
            "image":    image,
            "title":    {"zh": title_zh, "en": title_en, "ms": title_ms},
            "features": {"zh": feat_zh,  "en": feat_en,  "ms": feat_ms},
            "price":    {"zh": price_zh, "en": price_en, "ms": price_ms},
            "waText":   {"zh": wa_zh,    "en": wa_en,    "ms": wa_ms},
        })
    return items


def main():
    parser = argparse.ArgumentParser(description="Convert listing_manager.xlsx → listingsData.js")
    parser.add_argument("--excel",  default="listing_manager.xlsx")
    parser.add_argument("--output", default="listingsData.js")
    args = parser.parse_args()

    excel_path = Path(args.excel)
    if not excel_path.exists():
        print(f"❌ 找不到文件: {excel_path}")
        sys.exit(1)

    print(f"📖 读取: {excel_path}")
    wb = openpyxl.load_workbook(excel_path, data_only=True)

    data, total = {}, 0
    for key, sheet_name in SHEETS.items():
        if sheet_name not in wb.sheetnames:
            print(f"⚠️  找不到工作表: '{sheet_name}' — 跳过")
            data[key] = []
            continue
        items = parse_sheet(wb[sheet_name], key)
        data[key] = items
        total += len(items)
        print(f"   ✅ {sheet_name}: {len(items)} 条")
        for it in items:
            print(f"      • ZH: {it['title']['zh']}")
            print(f"        EN: {it['title']['en']}")
            print(f"        MS: {it['title']['ms']}")

    js = (
        "// listingsData.js — 由 convert.py 自动生成，请勿手动编辑\n"
        "// Auto-generated by convert.py — DO NOT EDIT MANUALLY\n"
        f"// 最后更新 Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
        f"var listingsData = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    )

    Path(args.output).write_text(js, encoding="utf-8")
    print(f"\n✅ 完成！共 {total} 条房源 → {args.output}")
    print()
    print("💡 提示：如需自定义英文/马来文标题，可在 Excel 的 ⚡ Title EN / ⚡ Title MS 列直接填写。")


if __name__ == "__main__":
    main()
