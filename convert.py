#!/usr/bin/env python3
"""
convert.py — Rex Yap Property Listings Converter
将 listing_manager.xlsx 转换为 listingsData.js

列结构 (listing_manager.xlsx):
  输入列 (你填写的):
    A(1)  状态 Status        — active / inactive
    B(2)  徽章 Badge         — 下拉选择
    C(3)  图片文件名 Image    — 逗号分隔多图
    D(4)  楼名·地点 Name     — 中文填写即可
    E(5)  房间数 Bedrooms
    F(6)  卫生间数 Bathrooms
    G(7)  面积 sqft
    H(8)  娱乐设施 Facilities
    I(9)  保安人员 Guard Type
    J(10) CCTV 监控
    K(11) 门禁 Access Level
    L(12) 价格 RM (数字)
    M(13) 备注 Remarks

  ⚡ 自动生成 (convert.py 直接从以上数据生成 JS，不依赖 Excel 公式):
    标题 ZH/EN/MS、特点 ZH/EN/MS、价格 ZH/EN/MS、WA ZH/EN/MS

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

# ── 列号定义 (1-based) ─────────────────────────────────────────────────────────
COL_STATUS  = 1   # A  active / inactive
COL_BADGE   = 2   # B  徽章 Badge
COL_IMAGE   = 3   # C  图片文件名 (逗号分隔多图)
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

DATA_START_ROW = 4  # 第4行开始是数据 (1-3行是标题/说明)

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

SHEETS = {
    "rentals":     "🏠 出租房源 Rentals",
    "forSale":     "🏡 出售房源 For Sale",
    "newLaunches": "🏗️ 新楼盘 New Launches",
}


def cv(ws, row, col):
    v = ws.cell(row=row, column=col).value
    return str(v).strip() if v is not None else ""


def get_icon(badge):
    for key, icon in BADGE_ICON.items():
        if key in badge:
            return icon
    return "fa-home"


def build_badge(badge_raw, remarks):
    if remarks and len(remarks) < 25:
        return f"✨ {remarks}"
    return badge_raw or "🏠 房源"


def build_features(beds, baths, sqft, facil, guard, cctv, access, lang):
    if lang == "zh":
        parts = [f"📍 {beds}房{baths}卫"]
        if sqft:  parts.append(f"面积 {sqft} sqft")
        if facil: parts.append(facil)
    elif lang == "en":
        parts = [f"📍 {beds}BR {baths}BA"]
        if sqft:  parts.append(f"{sqft} sqft")
        if facil: parts.append(facil)
    else:  # ms
        parts = [f"📍 {beds}Bilik {baths}Bilik Air"]
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
        price_str = price_rm or "欢迎咨询"

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


def build_wa(title, price_zh, beds, baths, category, lang):
    if category == "rentals":
        return {
            "zh": f"你好Rex，我想了解出租房源：{title}（{price_zh}）。\n📍 {beds}房{baths}卫。\n能否发送该房源的照片？谢谢！",
            "en": f"Hi Rex, I'm interested in the rental: {title} ({price_zh}).\n📍 {beds}BR {baths}BA.\nCould you send photos? Thanks!",
            "ms": f"Hai Rex, saya berminat dengan sewa: {title} ({price_zh}).\n📍 {beds}Bilik {baths}Bilik Air.\nBoleh hantar gambar? Terima kasih!",
        }[lang]
    elif category == "newLaunches":
        return {
            "zh": f"你好Rex，我想了解新楼盘：{title}。\n能否发送项目照片/户型图？谢谢！",
            "en": f"Hi Rex, I'm interested in the new launch: {title}.\nCould you send project photos/floor plans? Thanks!",
            "ms": f"Hai Rex, saya berminat dengan projek baru: {title}.\nBoleh hantar gambar projek/pelan lantai? Terima kasih!",
        }[lang]
    else:
        return {
            "zh": f"你好Rex，我想了解出售房源：{title}（{price_zh}）。\n📍 {beds}房{baths}卫。\n能否发送照片？谢谢！",
            "en": f"Hi Rex, I'm interested in the property: {title} ({price_zh}).\n📍 {beds}BR {baths}BA.\nCould you send photos? Thanks!",
            "ms": f"Hai Rex, saya berminat dengan hartanah: {title} ({price_zh}).\n📍 {beds}Bilik {baths}Bilik Air.\nBoleh hantar gambar? Terima kasih!",
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

        icon  = get_icon(badge_raw)
        badge = build_badge(badge_raw, remarks)
        feat  = {l: build_features(beds, baths, sqft, facil, guard, cctv, access, l) for l in ("zh","en","ms")}
        price = {l: build_price(price_rm, category, l) for l in ("zh","en","ms")}
        wa    = {l: build_wa(name, price["zh"], beds, baths, category, l) for l in ("zh","en","ms")}

        items.append({
            "badge":    badge,
            "icon":     icon,
            "image":    image,
            "title":    {"zh": name, "en": name, "ms": name},
            "features": feat,
            "price":    price,
            "waText":   wa,
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

    js = (
        "// listingsData.js — 由 convert.py 自动生成，请勿手动编辑\n"
        "// Auto-generated by convert.py — DO NOT EDIT MANUALLY\n"
        f"// 最后更新 Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
        f"var listingsData = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    )

    Path(args.output).write_text(js, encoding="utf-8")
    print(f"\n✅ 完成！共 {total} 条房源 → {args.output}")


if __name__ == "__main__":
    main()
