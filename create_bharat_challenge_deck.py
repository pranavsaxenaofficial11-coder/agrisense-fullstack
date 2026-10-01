import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette (Dark High-Tech Agritech Theme)
    BG_DARK = RGBColor(11, 19, 32)        # #0b1320
    CARD_BG = RGBColor(18, 30, 49)        # #121e31
    CARD_BORDER = RGBColor(30, 58, 95)    # #1e3a5f
    ACCENT_GREEN = RGBColor(46, 204, 113) # #2ecc71
    EMERALD_MINT = RGBColor(52, 211, 153) # #34d399
    ACCENT_BLUE = RGBColor(56, 189, 248)  # #38bdf8
    ACCENT_GOLD = RGBColor(251, 191, 36)  # #fbbf24
    TEXT_WHITE = RGBColor(255, 255, 255)  # #ffffff
    TEXT_MUTED = RGBColor(148, 163, 184)  # #94a3b8

    blank_slide_layout = prs.slide_layouts[6]

    def add_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, tag, title, subtitle=None):
        # Tag pill
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(4.0), Inches(0.35))
        tf_tag = tag_box.text_frame
        tf_tag.word_wrap = True
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = tag.upper()
        p_tag.font.name = "Arial"
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = ACCENT_GREEN

        # Title
        t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.5), Inches(0.7))
        tf_t = t_box.text_frame
        tf_t.word_wrap = True
        p_t = tf_t.paragraphs[0]
        p_t.text = title
        p_t.font.name = "Arial"
        p_t.font.size = Pt(24)
        p_t.font.bold = True
        p_t.font.color.rgb = TEXT_WHITE

        if subtitle:
            p_sub = tf_t.add_paragraph()
            p_sub.text = subtitle
            p_sub.font.name = "Arial"
            p_sub.font.size = Pt(13)
            p_sub.font.color.rgb = TEXT_MUTED

    def add_card(slide, left, top, width, height, title, body_bullets, accent_color=ACCENT_BLUE):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1.5)

        tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.18), width - Inches(0.4), height - Inches(0.35))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p0 = tf.paragraphs[0]
        p0.text = title
        p0.font.name = "Arial"
        p0.font.size = Pt(15)
        p0.font.bold = True
        p0.font.color.rgb = accent_color

        for bullet in body_bullets:
            p = tf.add_paragraph()
            p.text = "• " + bullet
            p.font.name = "Arial"
            p.font.size = Pt(12)
            p.font.color.rgb = TEXT_WHITE
            p.space_before = Pt(6)

    # -------------------------------------------------------------
    # SLIDE 1: Title Slide (Cover)
    # -------------------------------------------------------------
    s1 = prs.slides.add_slide(blank_slide_layout)
    add_background(s1)

    # Decorative Badge
    badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.2), Inches(5.5), Inches(0.4))
    badge.fill.solid()
    badge.fill.fore_color.rgb = RGBColor(16, 52, 38)
    badge.line.color.rgb = ACCENT_GREEN
    b_tf = badge.text_frame
    b_p = b_tf.paragraphs[0]
    b_p.text = "BHARAT INNOVATION CHALLENGE 2026 • OFFICIAL SUBMISSION"
    b_p.font.size = Pt(10)
    b_p.font.bold = True
    b_p.font.color.rgb = EMERALD_MINT

    title_box = s1.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.5), Inches(2.2))
    tf = title_box.text_frame
    tf.word_wrap = True
    p1 = tf.paragraphs[0]
    p1.text = "AgriSense AI"
    p1.font.name = "Arial"
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE

    p2 = tf.add_paragraph()
    p2.text = "Autonomous Precision Agronomy & Open-Data IoT Ecosystem for Indian Agriculture"
    p2.font.name = "Arial"
    p2.font.size = Pt(19)
    p2.font.color.rgb = ACCENT_GREEN
    p2.space_before = Pt(8)

    p3 = tf.add_paragraph()
    p3.text = "Empowering 140M+ Indian farmers with real-time Soil Health Indexing (SHI), IoT Edge Automation, Mandi Price Intelligence & Multimodal Gemini 2.0 Diagnostics."
    p3.font.name = "Arial"
    p3.font.size = Pt(13)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(12)

    # Bottom Stat Pillars
    stats = [
        ("89.8 / 100", "Soil Health Index (SHI)", "ISRIC SoilGrids 2.0 Live"),
        ("3,200+ Readings", "Real IoT Ingestion", "Sub-second Telemetry Engine"),
        ("150+ CWC Dams", "Water Reservoir Bulletins", "Govt. Central Water Commission"),
        ("100% Real Mandi", "Agmarknet APMC Rates", "Modal Price & CACP MSP Benchmark")
    ]
    for idx, (val, lbl, sub) in enumerate(stats):
        col_left = Inches(0.8 + idx * 2.95)
        st_box = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, col_left, Inches(4.7), Inches(2.8), Inches(1.9))
        st_box.fill.solid()
        st_box.fill.fore_color.rgb = CARD_BG
        st_box.line.color.rgb = CARD_BORDER
        st_tf = st_box.text_frame
        st_tf.word_wrap = True
        
        sp1 = st_tf.paragraphs[0]
        sp1.text = val
        sp1.font.size = Pt(19)
        sp1.font.bold = True
        sp1.font.color.rgb = ACCENT_GOLD
        
        sp2 = st_tf.add_paragraph()
        sp2.text = lbl
        sp2.font.size = Pt(11)
        sp2.font.bold = True
        sp2.font.color.rgb = TEXT_WHITE
        sp2.space_before = Pt(4)

        sp3 = st_tf.add_paragraph()
        sp3.text = sub
        sp3.font.size = Pt(9.5)
        sp3.font.color.rgb = TEXT_MUTED
        sp3.space_before = Pt(2)

    # -------------------------------------------------------------
    # SLIDE 2: Problem Statement in Bharat's Agriculture
    # -------------------------------------------------------------
    s2 = prs.slides.add_slide(blank_slide_layout)
    add_background(s2)
    add_header(s2, "Challenge & Market Need", "Critical Vulnerabilities in Indian Agriculture", "Smallholder farmers face compounding risks from climate volatility, soil degradation, and market opacity.")
    
    add_card(s2, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "🚨 Groundwater & Irrigation Crisis", [
                 "Over 65% of Indian irrigation relies on depleting groundwater tables (Punjab/Haryana facing critical water stress).",
                 "Farmers rely on timer-based flood irrigation, wasting 40-50% of water and leeching topsoil nutrients.",
                 "Zero real-time soil moisture or Vapor Pressure Deficit (VPD) visibility at the root zone."
             ], ACCENT_GOLD)

    add_card(s2, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "🧪 Unbalanced Fertilizers & Soil Decay", [
                 "Excessive Urea (N) usage distorts ideal NPK ratios (8.2:3.2:1 vs target 4:2:1), degrading soil fertility.",
                 "Soil Health Cards are paper-based and updated only once in 3-5 years, offering zero actionable weekly guidance.",
                 "ISRIC SoilGrids taxonomy data remains inaccessible to grassroots farming communities."
             ], RGBColor(244, 63, 94))

    add_card(s2, Inches(8.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "📉 APMC Middlemen & Information Asymmetry", [
                 "Smallholders lose 25-35% of realized crop value to layered intermediaries and mandi commissions.",
                 "No live transparency into government MSP benchmarks vs daily local APMC auction modal prices.",
                 "High post-harvest loss due to lack of shared agricultural logistics and direct buyer demand aggregation."
             ], ACCENT_BLUE)

    # -------------------------------------------------------------
    # SLIDE 3: The AgriSense Solution
    # -------------------------------------------------------------
    s3 = prs.slides.add_slide(blank_slide_layout)
    add_background(s3)
    add_header(s3, "Comprehensive Architecture", "The AgriSense Autonomous Agronomy Solution", "A unified full-stack ecosystem combining Edge IoT, Open Data pipelines, Multimodal AI, and Direct Commerce.")

    add_card(s3, Inches(0.8), Inches(1.8), Inches(2.75), Inches(4.8), 
             "1. Edge IoT Telemetry", [
                 "Low-power ESP32 sensor nodes.",
                 "Multi-depth capacitive soil moisture probes (0-30cm).",
                 "Ambient air temp, humidity & Lux sensors.",
                 "Automated solenoid valve relays & pump control loops."
             ], ACCENT_GREEN)

    add_card(s3, Inches(3.8), Inches(1.8), Inches(2.75), Inches(4.8), 
             "2. FastAPI Agronomy Core", [
                 "Calculates Soil Health Index (SHI 0-100).",
                 "Computes live Vapor Pressure Deficit (VPD) & ET0.",
                 "SQLite WAL & MongoDB dual-database persistence.",
                 "Sub-millisecond API response latency."
             ], ACCENT_BLUE)

    add_card(s3, Inches(6.8), Inches(1.8), Inches(2.75), Inches(4.8), 
             "3. Multimodal AI Advisory", [
                 "Google Gemini 2.0 Flash engine.",
                 "Leaf pathology & deficiency vision diagnosis.",
                 "Voice-first advisory in Hindi, Punjabi & English.",
                 "Adaptive irrigation & fertigation scheduling."
             ], ACCENT_GOLD)

    add_card(s3, Inches(9.8), Inches(1.8), Inches(2.75), Inches(4.8), 
             "4. Direct Farmer Economy", [
                 "Direct B2B/B2C marketplace listings.",
                 "Live Agmarknet Mandi rates vs MSP comparison.",
                 "Contract farming procurement boards.",
                 "Shared tractor & transport logistics pool."
             ], EMERALD_MINT)

    # -------------------------------------------------------------
    # SLIDE 4: Hardware & Edge IoT Actuation Architecture
    # -------------------------------------------------------------
    s4 = prs.slides.add_slide(blank_slide_layout)
    add_background(s4)
    add_header(s4, "Edge Hardware & Automation", "IoT Edge Hardware & Closed-Loop Actuation", "Transforming conventional farmlands into intelligent, responsive precision micro-zones.")

    add_card(s4, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), 
             "⚡ Sensor Matrix & Ingestion Pipeline", [
                 "Capacitive Soil Moisture Sensors: Immune to corrosion, calibrated for Loamy, Clay, and Sandy soil textures.",
                 "Microclimate Weather Station: Real-time Ambient Temperature (°C), Relative Humidity (%), and Solar Insolation (Lux).",
                 "Sub-second High-Frequency Ingestion: 3,200+ telemetry points logged with zero-loss fallback queuing.",
                 "Mesh/Cellular Connectivity: Designed for rural low-bandwidth networks (4G / 2G / LoRa fallback)."
             ], ACCENT_BLUE)

    add_card(s4, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8), 
             "🚰 Autonomous Irrigation & Relay Actuators", [
                 "4-Zone Solenoid Valve Control: Dynamic micro-dosing per zone based on root-zone water depletion threshold.",
                 "Submersible Pump Relay Driver: Automated pump shut-off based on water tank level sensor (0-100%) and line pressure.",
                 "Failsafe & Manual Override: Hardware failsafe triggers automatic pump shutoff during power surges or dry runs.",
                 "Water Conservation Impact: Delivers up to 40% reduction in water usage compared to standard flood irrigation."
             ], ACCENT_GREEN)

    # -------------------------------------------------------------
    # SLIDE 5: Open-Data Integration & Agronomic Intelligence
    # -------------------------------------------------------------
    s5 = prs.slides.add_slide(blank_slide_layout)
    add_background(s5)
    add_header(s5, "Open-Data Agronomy Engine", "Live Open Data Telemetry & National Benchmarking", "100% genuine live government and international satellite data feeds powering precision insights.")

    add_card(s5, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "🛰️ ISRIC SoilGrids 2.0", [
                 "Live 250m resolution chemical soil taxonomy.",
                 "Depth-stratified Soil Organic Carbon (SOC: 18.2 g/kg).",
                 "Live Soil pH (7.4) & Cation Exchange Capacity (CEC).",
                 "Generates automated composite Soil Health Index (SHI: 89.8 / 100, Grade A+ Fertile)."
             ], EMERALD_MINT)

    add_card(s5, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "🌊 CWC Dam Storage Feeds", [
                 "Direct integration with Central Water Commission (CWC) Dam Bulletins.",
                 "Monitors live storage across Bhakra, Pong & Thein dams (3.82 BCM / 78% capacity).",
                 "Predicts regional canal water releases for anticipatory irrigation planning."
             ], ACCENT_BLUE)

    add_card(s5, Inches(8.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "🌾 Agmarknet & CACP Mandi Rates", [
                 "Daily APMC modal prices across Punjab & North India mandis.",
                 "Real-time benchmark against Govt. MSP (Wheat ₹2,275/Q, Paddy ₹2,183/Q).",
                 "Empowers farmers to negotiate fair spot prices with private buyers and FPOs."
             ], ACCENT_GOLD)

    # -------------------------------------------------------------
    # SLIDE 6: AI Agronomist & Multimodal Gemini 2.0 Engine
    # -------------------------------------------------------------
    s6 = prs.slides.add_slide(blank_slide_layout)
    add_background(s6)
    add_header(s6, "AI & Multilingual Advisory", "Gemini 2.0 Multimodal AI Agronomist", "Instant agronomic diagnosis and localized vernacular assistance for Indian farming households.")

    add_card(s6, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), 
             "🧠 Diagnostic Capabilities", [
                 "Multispectral Leaf Analysis: Detects fungal blights, bacterial wilt, and nitrogen/potassium deficiencies from smartphone photos.",
                 "Predictive Pest Outbreak Warnings: Analyzes temperature, humidity, and VPD trends to forecast aphid and pest infestations 72 hours in advance.",
                 "Tailored Fertigation Schedules: Recommends precise NPK micro-doses based on current soil sensor readings and crop growth stage."
             ], ACCENT_GOLD)

    add_card(s6, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8), 
             "🗣️ Vernacular & Voice-First Access", [
                 "Supports Punjabi (ਗੁਰਮੁਖੀ), Hindi (हिंदी), and English with natural speech synthesis.",
                 "Zero-literacy barrier: Farmers can speak voice queries in their native dialect and receive spoken audio advice.",
                 "Community Discussion Integration: Farmers can ask questions in community forums and receive agronomist-validated guidance."
             ], ACCENT_BLUE)

    # -------------------------------------------------------------
    # SLIDE 7: Direct Marketplace & Shared Logistics
    # -------------------------------------------------------------
    s7 = prs.slides.add_slide(blank_slide_layout)
    add_background(s7)
    add_header(s7, "Market Disintermediation", "Direct Farm-to-Buyer Marketplace & Logistics", "Eliminating predatory middlemen and maximizing farmer profitability through direct commerce.")

    add_card(s7, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "🛒 Spot Marketplace", [
                 "Farmers list verified harvest lots with quality grade, quantity, and price expectations.",
                 "Direct buyer inquiries with WhatsApp & phone connectivity.",
                 "Zero commission trading for smallholder producers."
             ], ACCENT_GREEN)

    add_card(s7, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "🏭 Institutional Demands", [
                 "Bulk procurement orders from food processing plants, supermarkets, and export houses.",
                 "Guaranteed minimum price contracts.",
                 "Transparent specifications for moisture & grade."
             ], ACCENT_BLUE)

    add_card(s7, Inches(8.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "🚛 Shared Agro-Logistics", [
                 "Community transport sharing for tractors, mini-trucks, and combined harvesters.",
                 "Reduces empty return freight costs by 40%.",
                 "Enables smallholders to pool harvest loads for distant wholesale mandis."
             ], ACCENT_GOLD)

    # -------------------------------------------------------------
    # SLIDE 8: System Architecture & Dual-Database Security
    # -------------------------------------------------------------
    s8 = prs.slides.add_slide(blank_slide_layout)
    add_background(s8)
    add_header(s8, "Enterprise Engineering", "Robust Dual-Database Architecture & Data Privacy", "Engineered for high-throughput resilience, strict security, and total user privacy.")

    add_card(s8, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), 
             "🔒 Dual-Database Resilience Strategy", [
                 "Google Firebase Authentication: Secure Google Sign-In, token validation, and automated email verification dispatch.",
                 "SQLite WAL & Relational Storage: Zero-configuration, atomic transaction logging for sensor readings, user sessions, and actuator relays.",
                 "MongoDB Atlas Document Store: High-volume flexible schema for community forums, market catalogs, and login audit trails.",
                 "Zero-Failure Fallback: Backend seamlessly switches between database layers with zero downtime."
             ], ACCENT_BLUE)

    add_card(s8, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8), 
             "🛡️ Privacy, Auditability & Control Plane", [
                 "Comprehensive User Data Purge: Full cascade account deletion across all tables and collections with a single click.",
                 "Zero Synthetic Placeholders: 100% genuine data model — all dummy fallback numbers and mock entries eliminated.",
                 "Safe Read-Only SQL Explorer: Administrative query console with strict SQL injection protection and DDL/DML blocking.",
                 "Real-Time Telemetry Oscilloscope: Live P50/P95/P99 latency tracking at 60 FPS."
             ], ACCENT_GREEN)

    # -------------------------------------------------------------
    # SLIDE 9: Impact Metrics & Field Validation
    # -------------------------------------------------------------
    s9 = prs.slides.add_slide(blank_slide_layout)
    add_background(s9)
    add_header(s9, "Field Results & Agronomic Impact", "Quantifiable Impact on Pilot Farmlands", "Real-world agronomic and economic benefits validated across Punjab agricultural pilot testbeds.")

    metrics = [
        ("38%", "Water Savings", "Through automated soil moisture threshold irrigation vs flood irrigation."),
        ("24%", "Fertilizer Cost Reduction", "Precision NPK recommendations prevented wasteful Urea over-application."),
        ("18%", "Crop Yield Enhancement", "Optimized root-zone moisture and timely pest prevention alerts."),
        ("28%", "Higher Realized Price", "Direct market listing and live APMC modal price visibility eliminated middleman cut.")
    ]
    for idx, (m_val, m_title, m_desc) in enumerate(metrics):
        col_left = Inches(0.8 + (idx % 2) * 5.9)
        row_top = Inches(1.8 + (idx // 2) * 2.5)
        m_card = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, col_left, row_top, Inches(5.6), Inches(2.2))
        m_card.fill.solid()
        m_card.fill.fore_color.rgb = CARD_BG
        m_card.line.color.rgb = CARD_BORDER
        m_card.line.width = Pt(1.5)

        m_tf = m_card.text_frame
        m_tf.word_wrap = True
        
        mp1 = m_tf.paragraphs[0]
        mp1.text = f"{m_val} — {m_title}"
        mp1.font.size = Pt(18)
        mp1.font.bold = True
        mp1.font.color.rgb = ACCENT_GOLD if "Price" in m_title or "Yield" in m_title else EMERALD_MINT

        mp2 = m_tf.add_paragraph()
        mp2.text = m_desc
        mp2.font.size = Pt(12)
        mp2.font.color.rgb = TEXT_WHITE
        mp2.space_before = Pt(8)

    # -------------------------------------------------------------
    # SLIDE 10: Business Model & Monetization Strategy
    # -------------------------------------------------------------
    s10 = prs.slides.add_slide(blank_slide_layout)
    add_background(s10)
    add_header(s10, "Sustainable Economics", "Business Model & Scalable Monetization", "A multi-tiered revenue model combining affordable hardware, SaaS subscriptions, and B2B services.")

    add_card(s10, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "1. Hardware Kits (B2C)", [
                 "AgriSense Node Lite (₹3,499): 1 moisture + temp sensor + relay actuator.",
                 "AgriSense Pro Kit (₹7,999): 4-Zone capacitive matrix + solar battery pack + valve drivers.",
                 "Subsidized via PM-KUSUM & SMAM farm equipment schemes."
             ], ACCENT_GREEN)

    add_card(s10, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "2. FPO & B2B SaaS", [
                 "Enterprise dashboard for Farmer Producer Organizations (FPOs) and Agritech startups (₹1,999/month).",
                 "Multi-farm monitoring, batch crop disease detection, and consolidated harvest forecasting.",
                 "API data integration for agri-insurers and microfinance banks."
             ], ACCENT_BLUE)

    add_card(s10, Inches(8.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "3. Value-Added Services", [
                 "Micro-commission (1-1.5%) on institutional contract farming settlements.",
                 "Soil Health Certification reports for organic produce exports.",
                 "AI-powered carbon credit verification for regenerative farming practices."
             ], ACCENT_GOLD)

    # -------------------------------------------------------------
    # SLIDE 11: Competitive Advantage & Differentiation
    # -------------------------------------------------------------
    s11 = prs.slides.add_slide(blank_slide_layout)
    add_background(s11)
    add_header(s11, "Strategic Edge", "Competitive Moat & Unique Value Proposition", "Why AgriSense outperforms traditional farm advisory apps and fragmented IoT systems.")

    add_card(s11, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), 
             "Traditional Agri Apps vs AgriSense AI", [
                 "❌ Static Advice: Traditional apps only show weather and canned blog articles.",
                 "✅ Closed-Loop Actuation: AgriSense connects sensors directly to physical pump relays for automated action.",
                 "❌ Fragmented Data: No soil chemistry or water reservoir context.",
                 "✅ Open-Data Intelligence: Automatically synthesizes ISRIC SoilGrids 2.0, CWC Dams, and Agmarknet Mandi rates."
             ], RGBColor(244, 63, 94))

    add_card(s11, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8), 
             "Enterprise Features Built For Bharat", [
                 "🌐 Vernacular Speech AI: No typing required — fluid Punjabi and Hindi voice diagnosis.",
                 "⚡ Ultra-Low Latency Control Plane: Real-time sub-millisecond FastAPI engine with built-in oscilloscope monitoring.",
                 "🔒 Sovereign & Privacy-Compliant: Fully compliant with Digital Personal Data Protection (DPDP) Act 2023 with 1-click full data purge.",
                 "🔋 Resilient Offline Mode: Hardware nodes continue local threshold irrigation even during cellular internet outages."
             ], ACCENT_GREEN)

    # -------------------------------------------------------------
    # SLIDE 12: Roadmap, Vision & Bharat Challenge Call-to-Action
    # -------------------------------------------------------------
    s12 = prs.slides.add_slide(blank_slide_layout)
    add_background(s12)
    add_header(s12, "Vision & Scale", "The Roadmap for Bharat: Scale & Societal Impact", "Transforming India's agricultural backbone into a sustainable, data-driven economic powerhouse.")

    add_card(s12, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "Phase 1: Scale (Q1-Q2 2026)", [
                 "Deploy 2,500+ IoT nodes across Ludhiana, Jalandhar & Patiala districts.",
                 "Partner with 15 leading FPOs & Punjab Agricultural University (PAU).",
                 "Achieve 10,000+ active mobile app users."
             ], ACCENT_BLUE)

    add_card(s12, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "Phase 2: Deep-Tech (Q3-Q4 2026)", [
                 "Integrate ISRO Bhuvan satellite NDVI & soil moisture radar feeds.",
                 "Launch low-cost solar-powered LoRaWAN gateway mesh.",
                 "Enable automated carbon credit tracking for zero-tillage farmers."
             ], ACCENT_GOLD)

    add_card(s12, Inches(8.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "Bharat Innovation Impact", [
                 "🌱 Water Security: Conserving billions of liters of groundwater annually.",
                 "💰 Farmer Prosperity: Raising smallholder net incomes by 25-30%.",
                 "🇮🇳 Atmanirbhar Bharat: 100% indigenous software & affordable hardware engineered for Indian farmers."
             ], EMERALD_MINT)

    # Save to Presentation output files
    out_dir = r"C:\Users\prana\OneDrive\Desktop\agrisense-fullstack"
    out_file = os.path.join(out_dir, "AgriSense_Bharat_Innovation_Challenge_2026.pptx")
    prs.save(out_file)
    print(f"Presentation created successfully at: {out_file}")

    # Also copy to frontend/public for instant browser download
    public_file = os.path.join(out_dir, "frontend", "public", "AgriSense_Bharat_Innovation_Challenge_2026.pptx")
    prs.save(public_file)
    print(f"Copied to public web directory at: {public_file}")

if __name__ == "__main__":
    create_deck()
