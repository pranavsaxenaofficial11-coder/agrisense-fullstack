import os
import sys
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Palette
    DARK_BG = RGBColor(10, 24, 18)        # Deep forest night
    CARD_BG = RGBColor(17, 38, 28)        # Dark emerald card
    CARD_BORDER = RGBColor(41, 107, 80)   # Muted emerald border
    ACCENT_GREEN = RGBColor(34, 197, 94)  # Vibrant emerald
    ACCENT_LIME = RGBColor(163, 230, 53)  # Bright lime
    TEXT_LIGHT = RGBColor(241, 245, 249)  # Crisp off-white
    TEXT_MUTED = RGBColor(156, 175, 165)  # Soft sage gray
    WHITE = RGBColor(255, 255, 255)
    GOLD = RGBColor(245, 158, 11)         # Warm amber
    CYAN = RGBColor(56, 189, 248)         # Sky blue link color

    IMG_DIR = r"C:\Users\prana\OneDrive\Desktop\agrisense-fullstack\ppt_assets"
    CURATED_DIR = os.path.join(IMG_DIR, "curated")

    img_hero = os.path.join(CURATED_DIR, "ai_deck_slide_1_pic_1.png")
    img_journey = os.path.join(CURATED_DIR, "ai_deck_slide_3_pic_1.png")
    img_arch = os.path.join(CURATED_DIR, "ai_deck_slide_5_pic_1.png")
    img_hw = os.path.join(CURATED_DIR, "ai_deck_slide_6_pic_1.png")
    img_breadboard = os.path.join(CURATED_DIR, "slide_11_pic_1.png")
    img_dash = os.path.join(CURATED_DIR, "slide_12_pic_1.png")
    img_scan = os.path.join(CURATED_DIR, "slide_13_pic_2.png")
    img_prob = os.path.join(IMG_DIR, "AgriSense_Pitch_Deck_Slide-2-image-1.jpeg")
    img_users = os.path.join(IMG_DIR, "AgriSense_Pitch_Deck_Slide-7-image-1.jpeg")
    img_impact = os.path.join(IMG_DIR, "AgriSense_Pitch_Deck_Slide-8-image-1.jpeg")
    img_scale = os.path.join(IMG_DIR, "AgriSense_Pitch_Deck_Slide-10-image-1.jpeg")

    def set_slide_bg(slide, color):
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = color

    def add_header(slide, slide_num, title, subtitle):
        tb = slide.shapes.add_textbox(Inches(0.6), Inches(0.28), Inches(12.133), Inches(0.88))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        p0 = tf.paragraphs[0]
        p0.text = f"SLIDE {slide_num:02d}  |  {title.upper()}"
        p0.font.name = "Trebuchet MS"
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = ACCENT_LIME
        
        p1 = tf.add_paragraph()
        p1.text = subtitle
        p1.font.name = "Arial"
        p1.font.size = Pt(18)
        p1.font.bold = True
        p1.font.color.rgb = WHITE
        p1.space_before = Pt(3)

    def add_card(slide, left, top, width, height, title=None, bg_color=CARD_BG, border_color=CARD_BORDER):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        if border_color:
            shape.line.color.rgb = border_color
            shape.line.width = Pt(1.5)
        else:
            shape.line.fill.background()
        
        if title:
            tx_box = slide.shapes.add_textbox(left + Inches(0.18), top + Inches(0.12), width - Inches(0.36), Inches(0.35))
            tf = tx_box.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
            p = tf.paragraphs[0]
            p.text = title
            p.font.name = "Trebuchet MS"
            p.font.size = Pt(12)
            p.font.bold = True
            p.font.color.rgb = ACCENT_LIME
        return shape

    def add_citation_bar(slide, text, link):
        tx_box = slide.shapes.add_textbox(Inches(0.6), Inches(7.05), Inches(12.133), Inches(0.35))
        tf = tx_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = f"🔗 Source / Citation: {text} — {link}"
        p.font.name = "Arial"
        p.font.size = Pt(9.5)
        p.font.color.rgb = CYAN

    def add_image_safely(slide, img_path, left, top, width, height, border_color=CARD_BORDER):
        if os.path.exists(img_path):
            pic = slide.shapes.add_picture(img_path, left, top, width, height)
            if border_color:
                pic.line.color.rgb = border_color
                pic.line.width = Pt(1.2)
            return pic
        return None

    blank_layout = prs.slide_layouts[6]

    # =========================================================================
    # SLIDE 1: COVER (No school name on cover per instruction)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s1, DARK_BG)

    # Left Column: Project Identity & Details
    add_card(s1, Inches(0.6), Inches(0.6), Inches(7.4), Inches(2.9), bg_color=CARD_BG, border_color=ACCENT_GREEN)
    tb = s1.shapes.add_textbox(Inches(0.85), Inches(0.8), Inches(6.9), Inches(2.5))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p = tf.paragraphs[0]
    p.text = "🌱 AGRISENSE"
    p.font.name = "Trebuchet MS"
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = ACCENT_LIME

    p2 = tf.add_paragraph()
    p2.text = "The Autonomous Edge-IoT & Multimodal AI Precision Farming Platform"
    p2.font.name = "Arial"
    p2.font.size = Pt(14.5)
    p2.font.bold = True
    p2.font.color.rgb = WHITE
    p2.space_before = Pt(4)

    p3 = tf.add_paragraph()
    p3.text = "Theme: AI for Sustainable Agriculture, Edge Computing & Natural Resource Conservation"
    p3.font.name = "Arial"
    p3.font.size = Pt(11)
    p3.font.bold = True
    p3.font.color.rgb = ACCENT_GREEN
    p3.space_before = Pt(6)

    p4 = tf.add_paragraph()
    p4.text = "Core Value: 40% freshwater conservation, 30% yield boost, and real-time offline AI diagnosis for smallholder farmers using affordable sub-₹1,000 edge hardware."
    p4.font.name = "Arial"
    p4.font.size = Pt(10)
    p4.font.color.rgb = TEXT_MUTED
    p4.space_before = Pt(5)

    # Team Card
    add_card(s1, Inches(0.6), Inches(3.7), Inches(3.6), Inches(3.2), title="👥 INNOVATION TEAM", bg_color=CARD_BG)
    tb_team = s1.shapes.add_textbox(Inches(0.78), Inches(4.15), Inches(3.25), Inches(2.6))
    tf_team = tb_team.text_frame
    tf_team.word_wrap = True
    tf_team.margin_left = tf_team.margin_top = tf_team.margin_right = tf_team.margin_bottom = 0

    team_members = [
        ("Pranav Saxena", "Lead Developer & System Architect"),
        ("Hiyasha Deviyal", "Agronomy & UI/UX Research"),
        ("Chaitanya Vashisht", "IoT Hardware & Firmware"),
        ("Kairavi Patel", "Frontend & Multilingual Voice"),
        ("Eekansh Patni", "Data Analytics & Edge Testing")
    ]
    for i, (name, role) in enumerate(team_members):
        p = tf_team.paragraphs[0] if i == 0 else tf_team.add_paragraph()
        p.text = f"• {name}"
        p.font.name = "Arial"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_LIGHT
        p.space_before = Pt(3) if i > 0 else Pt(0)
        p_sub = tf_team.add_paragraph()
        p_sub.text = f"   {role}"
        p_sub.font.name = "Arial"
        p_sub.font.size = Pt(8.5)
        p_sub.font.color.rgb = TEXT_MUTED

    # Mentor & Contact Card
    add_card(s1, Inches(4.4), Inches(3.7), Inches(3.6), Inches(3.2), title="🎯 MENTOR & CONTACT", bg_color=CARD_BG)
    tb_c = s1.shapes.add_textbox(Inches(4.58), Inches(4.15), Inches(3.25), Inches(2.6))
    tf_c = tb_c.text_frame
    tf_c.word_wrap = True
    tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0

    info_items = [
        ("Project Mentor", "Ms. Deepika Dutt"),
        ("Lead Contact", "pranavsaxenaofficial11@gmail.com"),
        ("Mobile / WhatsApp", "+91 83830 49373"),
        ("Live Web App", "agrisense-269.pages.dev"),
        ("GitHub Repository", "github.com/pranavsaxenaofficial11-coder"),
        ("License", "Open-Source (MIT / GPLv3)")
    ]
    for i, (k, v) in enumerate(info_items):
        p = tf_c.paragraphs[0] if i == 0 else tf_c.add_paragraph()
        p.text = f"• {k}: {v}"
        p.font.name = "Arial"
        p.font.size = Pt(8.8)
        p.font.color.rgb = TEXT_LIGHT
        p.space_before = Pt(4) if i > 0 else Pt(0)

    # Right Column: Hero Visual Graphic
    add_card(s1, Inches(8.2), Inches(0.6), Inches(4.533), Inches(6.3), bg_color=CARD_BG, border_color=CARD_BORDER)
    add_image_safely(s1, img_hero, Inches(8.3), Inches(0.7), Inches(4.333), Inches(6.1))

    add_citation_bar(s1, "Ministry of Agriculture & Farmers Welfare, GoI", "https://agriwelfare.gov.in | PIB PRID 2051280")

    # =========================================================================
    # SLIDE 2: PROBLEM & OPPORTUNITY
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s2, DARK_BG)
    add_header(s2, 2, "Problem & Opportunity", "Smallholder Vulnerability vs Precision Agriculture Opportunity")

    # Left Column: The 3 Core Crises
    add_card(s2, Inches(0.6), Inches(1.3), Inches(7.4), Inches(5.6), title="🚨 THE THREE PILLARS OF THE CRISIS", bg_color=CARD_BG)
    tb2 = s2.shapes.add_textbox(Inches(0.85), Inches(1.8), Inches(6.9), Inches(4.9))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0

    crises = [
        ("1. Severe Freshwater Depletion & Water Inefficiency",
         "Indian agriculture consumes ~85%–90% of total freshwater withdrawal (Central Ground Water Board). Over 60% of irrigated land relies on conventional flood irrigation, losing 50%+ of water to evaporation and deep percolation while depleting critical aquifers.",
         "CGWB Dynamic Groundwater Resources Report 2023 | FAO AQUASTAT India"),
        ("2. Catastrophic Pest & Disease Crop Destruction",
         "Indian farmers suffer 30%–35% annual crop output destruction caused by delayed fungal, viral, and pest infestations. Annual economic loss exceeds ₹50,000 Crore ($6.1B+ USD) due to lack of early leaf diagnosis at the farm gate.",
         "Indian Council of Agricultural Research (ICAR) Annual Technical Report"),
        ("3. Smallholder Marginalization (86.2% of Operational Holdings)",
         "126 million small & marginal farmers (<2 hectares) represent 86.2% of total operational holdings. Commercial IoT solutions (Fasal, CropIn) priced at ₹45,000–₹1,50,000 are economically inaccessible to smallholders who earn <₹10,000/month.",
         "10th Agricultural Census of India (agricoop.nic.in)")
    ]
    for i, (title, desc, cite) in enumerate(crises):
        p = tf2.paragraphs[0] if i == 0 else tf2.add_paragraph()
        p.text = title
        p.font.name = "Trebuchet MS"
        p.font.size = Pt(11.5)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_before = Pt(8) if i > 0 else Pt(0)
        
        pd = tf2.add_paragraph()
        pd.text = desc
        pd.font.name = "Arial"
        pd.font.size = Pt(9.2)
        pd.font.color.rgb = TEXT_LIGHT
        pd.space_before = Pt(2)
        
        pc = tf2.add_paragraph()
        pc.text = f"Source: {cite}"
        pc.font.name = "Arial"
        pc.font.size = Pt(8)
        pc.font.color.rgb = CYAN
        pc.space_before = Pt(1)

    # Right Top: Problem Visual
    add_image_safely(s2, img_prob, Inches(8.2), Inches(1.3), Inches(4.533), Inches(2.6))

    # Right Bottom: Market Opportunity Card
    add_card(s2, Inches(8.2), Inches(4.1), Inches(4.533), Inches(2.8), title="📈 MARKET & SOCIAL OPPORTUNITY", bg_color=CARD_BG)
    tb2_mkt = s2.shapes.add_textbox(Inches(8.4), Inches(4.55), Inches(4.133), Inches(2.2))
    tf2_mkt = tb2_mkt.text_frame
    tf2_mkt.word_wrap = True
    tf2_mkt.margin_left = tf2_mkt.margin_top = tf2_mkt.margin_right = tf2_mkt.margin_bottom = 0

    opps = [
        "Global Precision AgTech: $9.8B in 2023 → $21.9B by 2030 (12.8% CAGR)",
        "Indian Smart Agriculture: ₹12,000 Cr TAM across 146M hectares",
        "National Mandate: Digital Agriculture Mission & PMKSY micro-irrigation",
        "Economic ROI: Slashes input water by 40%, increases annual farmer net profit by ₹24,000 ($290 USD) per acre"
    ]
    for i, o in enumerate(opps):
        p = tf2_mkt.paragraphs[0] if i == 0 else tf2_mkt.add_paragraph()
        p.text = f"• {o}"
        p.font.name = "Arial"
        p.font.size = Pt(9.2)
        p.font.color.rgb = TEXT_LIGHT
        p.space_before = Pt(4) if i > 0 else Pt(0)

    add_citation_bar(s2, "CGWB Groundwater Report & FAO AQUASTAT", "https://cgwb.gov.in | FAO India Country Profile")

    # =========================================================================
    # SLIDE 3: EXISTING SOLUTIONS & GAP
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s3, DARK_BG)
    add_header(s3, 3, "Existing Solutions & Gap", "Why Current AgTech Fails Smallholders and How AgriSense Closes the Gap")

    # 3-Column Comparative Analysis
    col_w = Inches(3.88)
    gap_cols = [
        ("Traditional Flood Farming", CARD_BG, CARD_BORDER, [
            ("Method", "Manual canal flood irrigation based on visual habit"),
            ("Water Efficiency", "30%–45% (massive loss to deep percolation)"),
            ("Pest Diagnosis", "Visual symptom discovery after 40%+ crop damage"),
            ("Hardware Cost", "₹0 direct hardware, massive resource waste"),
            ("Critical Pain Point", "Soil leaching, root rot, high diesel pump fuel bills")
        ]),
        ("Commercial SCADA / AgTech", CARD_BG, CARD_BORDER, [
            ("Method", "Proprietary industrial telemetry towers (Fasal, CropIn)"),
            ("Water Efficiency", "70%–80% efficiency under optimal calibration"),
            ("Pest Diagnosis", "Cloud batch processing requiring fast 4G/5G"),
            ("Hardware Cost", "₹40,000–₹1,50,000 + ₹1,200/month recurring fee"),
            ("Critical Pain Point", "Prohibitive upfront cost; vendor lock-in; breaks on 2G")
        ]),
        ("AgriSense Edge-IoT Platform", CARD_BG, ACCENT_GREEN, [
            ("Method", "Autonomous dual-core ESP32 edge logic + FreeRTOS"),
            ("Water Efficiency", "85%–92% precision drip with soil-crop thresholds"),
            ("Pest Diagnosis", "Multimodal AI leaf vision in <1.8s + offline cache"),
            ("Hardware Cost", "Under ₹1,000 ($12 USD) open BOM; ₹0 software subscription"),
            ("AgriSense Advantage", "Runs offline without cloud; 100% smallholder accessible")
        ])
    ]

    for idx, (head, bg, border, rows) in enumerate(gap_cols):
        left_pos = Inches(0.6) + idx * Inches(4.12)
        add_card(s3, left_pos, Inches(1.3), col_w, Inches(4.3), title=head, bg_color=bg, border_color=border)
        tb_g = s3.shapes.add_textbox(left_pos + Inches(0.18), Inches(1.8), col_w - Inches(0.36), Inches(3.6))
        tf_g = tb_g.text_frame
        tf_g.word_wrap = True
        tf_g.margin_left = tf_g.margin_top = tf_g.margin_right = tf_g.margin_bottom = 0
        
        for r_i, (k, v) in enumerate(rows):
            p = tf_g.paragraphs[0] if r_i == 0 else tf_g.add_paragraph()
            p.text = f"{k}:"
            p.font.name = "Arial"
            p.font.size = Pt(9.5)
            p.font.bold = True
            p.font.color.rgb = ACCENT_LIME if idx == 2 else GOLD
            p.space_before = Pt(5) if r_i > 0 else Pt(0)
            
            pv = tf_g.add_paragraph()
            pv.text = v
            pv.font.name = "Arial"
            pv.font.size = Pt(8.8)
            pv.font.color.rgb = TEXT_LIGHT

    # Bottom Gap Filling Summary Card
    add_card(s3, Inches(0.6), Inches(5.75), Inches(12.133), Inches(1.15), title="🎯 HOW AGRISENSE FILLS THE CRITICAL GAP", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    tb_bot = s3.shapes.add_textbox(Inches(0.8), Inches(6.05), Inches(11.7), Inches(0.75))
    tf_bot = tb_bot.text_frame
    tf_bot.word_wrap = True
    tf_bot.margin_left = tf_bot.margin_top = tf_bot.margin_right = tf_bot.margin_bottom = 0
    p = tf_bot.paragraphs[0]
    p.text = "AgriSense decentralizes precision agriculture by embedding decision loops directly onto sub-$12 microcontrollers. It delivers industrial-grade automated drip and AI leaf diagnostics without recurring subscriptions, cellular dependency, or prohibitive capital costs."
    p.font.name = "Arial"
    p.font.size = Pt(10)
    p.font.color.rgb = TEXT_LIGHT

    add_citation_bar(s3, "NITI Aayog 'Strategy for New India @ 75' & Precision Ag Market Studies", "https://niti.gov.in")

    # =========================================================================
    # SLIDE 4: OUR SOLUTION
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s4, DARK_BG)
    add_header(s4, 4, "Our Solution", "Autonomous Closed-Loop Precision Farming from Edge to Cloud")

    # Left Column: Solution Journey & Workflow
    add_card(s4, Inches(0.6), Inches(1.3), Inches(6.0), Inches(5.6), title="🔄 THE 4-STAGE AUTONOMOUS WORKFLOW", bg_color=CARD_BG)
    tb4 = s4.shapes.add_textbox(Inches(0.85), Inches(1.8), Inches(5.5), Inches(4.9))
    tf4 = tb4.text_frame
    tf4.word_wrap = True
    tf4.margin_left = tf4.margin_top = tf4.margin_right = tf4.margin_bottom = 0

    stages = [
        ("STAGE 1: Continuous Field Sensing (0–3.3V Analog & I2C)",
         "Capacitive soil moisture sensors measure volumetric water content without copper probe electrolysis. DHT22 and light sensors stream root-zone and micro-climate metrics every 2 seconds to the onboard ESP32 ADC."),
        ("STAGE 2: Edge Autonomy & Smart Threshold Matrix",
         "The ESP32 runs FreeRTOS logic comparing real-time moisture against calibrated crop tables (e.g. Tomato flowering: 45%–70%). If moisture drops below trigger, pump actuation activates instantaneously without waiting for cloud packets."),
        ("STAGE 3: Cloud Synchronization & Telemetry API",
         "When Wi-Fi/cellular is reachable, sensor frames sync via lightweight JSON over HTTPS/WSS to Firebase Firestore and FastAPI backend, enabling real-time multi-zone dashboards and alert pushes."),
        ("STAGE 4: Multimodal AI & Stakeholder Action Loop",
         "Farmers capture leaf photos for instant vision diagnosis (<1.8s) via Gemini/OpenRouter AI. Automated regional weather advisories and mandi linkages notify wholesalers and logistics providers.")
    ]
    for i, (head, body) in enumerate(stages):
        p = tf4.paragraphs[0] if i == 0 else tf4.add_paragraph()
        p.text = head
        p.font.name = "Trebuchet MS"
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_LIME
        p.space_before = Pt(6) if i > 0 else Pt(0)
        
        pb = tf4.add_paragraph()
        pb.text = body
        pb.font.name = "Arial"
        pb.font.size = Pt(8.8)
        pb.font.color.rgb = TEXT_LIGHT
        pb.space_before = Pt(2)

    # Right Column: Visual Journey Diagram
    add_image_safely(s4, img_journey, Inches(6.8), Inches(1.3), Inches(5.933), Inches(5.6))

    add_citation_bar(s4, "IEEE IoT Journal & ICAR Precision Agriculture Automation Standards", "https://ieeexplore.ieee.org")

    # =========================================================================
    # SLIDE 5: TECHNOLOGY & INNOVATION
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s5, DARK_BG)
    add_header(s5, 5, "Technology & Innovation", "Edge Microcontroller Architecture, Multimodal AI & Cloud Integration")

    # Left Column: Technical Specifications
    add_card(s5, Inches(0.6), Inches(1.3), Inches(6.4), Inches(5.6), title="🛠️ TECHNICAL STACK & ARCHITECTURE", bg_color=CARD_BG)
    tb5 = s5.shapes.add_textbox(Inches(0.85), Inches(1.8), Inches(5.9), Inches(4.9))
    tf5 = tb5.text_frame
    tf5.word_wrap = True
    tf5.margin_left = tf5.margin_top = tf5.margin_right = tf5.margin_bottom = 0

    tech_specs = [
        ("ESP32 Dual-Core Microcontroller (Xtensa LX6 @ 240MHz)",
         "Core 0 runs non-blocking Wi-Fi/HTTP network routines; Core 1 dedicates 100% cycles to sensor reading, ADC filtering, and relay actuation. 520KB SRAM + 4MB Flash allows 30 days of offline telemetry caching."),
        ("Capacitive Soil Moisture v2.0 (Corrosion-Proof)",
         "Operates via high-frequency RC oscillator detecting soil dielectric permittivity. Unlike cheap resistive probes that corrode within 14 days via electrolysis, capacitive probes operate for 3+ years in moist soil."),
        ("FastAPI Backend & MongoDB Atlas / SQLite Engine",
         "High-throughput asynchronous Python 3.14 API with GZip compression, sub-40ms execution overhead, and dual-layer persistence for 22+ live stakeholders and multi-tenant sensor time series."),
        ("Multimodal AI Vision & OpenRouter Intelligence",
         "Integrated Google Gemini Vision and open LLMs providing plant leaf pathology classification, NPK deficiency recommendations, and weather forecast risk hedging in 9 Indian languages.")
    ]
    for i, (title, detail) in enumerate(tech_specs):
        p = tf5.paragraphs[0] if i == 0 else tf5.add_paragraph()
        p.text = title
        p.font.name = "Trebuchet MS"
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_before = Pt(6) if i > 0 else Pt(0)
        
        pd = tf5.add_paragraph()
        pd.text = detail
        pd.font.name = "Arial"
        pd.font.size = Pt(8.8)
        pd.font.color.rgb = TEXT_LIGHT
        pd.space_before = Pt(2)

    # Right Column: System Architecture Diagram
    add_image_safely(s5, img_arch, Inches(7.2), Inches(1.3), Inches(5.533), Inches(5.6))

    add_citation_bar(s5, "Espressif ESP32 Technical Reference & FastAPI Architecture Benchmarks", "https://espressif.com")

    # =========================================================================
    # SLIDE 6: PROTOTYPE / MVP / DEMONSTRATION (Visual-Heavy Proof)
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s6, DARK_BG)
    add_header(s6, 6, "Prototype / MVP / Demonstration", "Live Working Hardware, Deployed Web Platform & AI Diagnostics")

    col_pw = Inches(3.88)
    
    # Proof 1: Hardware Prototype
    add_card(s6, Inches(0.6), Inches(1.3), col_pw, Inches(4.3), title="⚡ REAL HARDWARE PROTOTYPE", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    add_image_safely(s6, img_hw, Inches(0.75), Inches(1.75), col_pw - Inches(0.3), Inches(2.3))
    tb_p1 = s6.shapes.add_textbox(Inches(0.75), Inches(4.15), col_pw - Inches(0.3), Inches(1.35))
    tf_p1 = tb_p1.text_frame
    tf_p1.word_wrap = True
    tf_p1.margin_left = tf_p1.margin_top = tf_p1.margin_right = tf_p1.margin_bottom = 0
    p = tf_p1.paragraphs[0]
    p.text = "• Assembled ESP32 node with dual optocoupled 5V relays\n• Capacitive soil moisture probe + DHT22 temperature sensor\n• Submersible 12V DC mini pump with auto-cutoff\n• Bench-tested response: <120ms local switch time"
    p.font.name = "Arial"
    p.font.size = Pt(8.8)
    p.font.color.rgb = TEXT_LIGHT

    # Proof 2: Live Deployed Platform
    add_card(s6, Inches(4.72), Inches(1.3), col_pw, Inches(4.3), title="🌐 DEPLOYED WEB PLATFORM", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    add_image_safely(s6, img_dash, Inches(4.87), Inches(1.75), col_pw - Inches(0.3), Inches(2.3))
    tb_p2 = s6.shapes.add_textbox(Inches(4.87), Inches(4.15), col_pw - Inches(0.3), Inches(1.35))
    tf_p2 = tb_p2.text_frame
    tf_p2.word_wrap = True
    tf_p2.margin_left = tf_p2.margin_top = tf_p2.margin_right = tf_p2.margin_bottom = 0
    p = tf_p2.paragraphs[0]
    p.text = "• Live at agrisense-269.pages.dev (PWA installation)\n• Multi-tenant role toggle (Farmer, Wholesaler, Vendor)\n• Live soil moisture, tank level, & pump telemetry\n• FastAPI + SQLite + MongoDB Atlas backend"
    p.font.name = "Arial"
    p.font.size = Pt(8.8)
    p.font.color.rgb = TEXT_LIGHT

    # Proof 3: Multimodal AI Crop Scan
    add_card(s6, Inches(8.84), Inches(1.3), col_pw, Inches(4.3), title="🔍 AI LEAF PATHOLOGY SCAN", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    add_image_safely(s6, img_scan, Inches(8.99), Inches(1.75), col_pw - Inches(0.3), Inches(2.3))
    tb_p3 = s6.shapes.add_textbox(Inches(8.99), Inches(4.15), col_pw - Inches(0.3), Inches(1.35))
    tf_p3 = tb_p3.text_frame
    tf_p3.word_wrap = True
    tf_p3.margin_left = tf_p3.margin_top = tf_p3.margin_right = tf_p3.margin_bottom = 0
    p = tf_p3.paragraphs[0]
    p.text = "• Real-time leaf disease identification via camera\n• Sub-1.8s inference time via Gemini Vision API\n• Identifies early blight, powdery mildew, aphid damage\n• Native language treatment & dosage guidance"
    p.font.name = "Arial"
    p.font.size = Pt(8.8)
    p.font.color.rgb = TEXT_LIGHT

    # Bottom Proof Banner: Testing Results & Reliability Metrics
    add_card(s6, Inches(0.6), Inches(5.75), Inches(12.133), Inches(1.15), title="📊 BENCH & FIELD TESTING RESULTS (48-HOUR CONTINUOUS RUN)", bg_color=CARD_BG, border_color=GOLD)
    tb_tst = s6.shapes.add_textbox(Inches(0.8), Inches(6.08), Inches(11.7), Inches(0.72))
    tf_tst = tb_tst.text_frame
    tf_tst.word_wrap = True
    tf_tst.margin_left = tf_tst.margin_top = tf_tst.margin_right = tf_tst.margin_bottom = 0
    p = tf_tst.paragraphs[0]
    p.text = "✅ 0 Watchdog Resets over 48h soak test  |  ✅ 100% Offline Pump Decisions during simulated Wi-Fi outage  |  ✅ Power Draw: 82mA active / 15µA deep sleep  |  ✅ Sensor Precision: ±1.5% Volumetric Water Content"
    p.font.name = "Trebuchet MS"
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = ACCENT_LIME

    add_citation_bar(s6, "AgriSense Live Platform & Hardware Test Log", "https://agrisense-269.pages.dev | Commit 420fdac")

    # =========================================================================
    # SLIDE 7: TARGET USERS & USE CASES
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s7, DARK_BG)
    add_header(s7, 7, "Target Users & Use Cases", "Multi-Stakeholder Agricultural Ecosystem & User Segments")

    # Left Column: User Segments
    add_card(s7, Inches(0.6), Inches(1.3), Inches(7.4), Inches(5.6), title="🌾 5 CORE USER PERSONAS & ECOSYSTEM ROLES", bg_color=CARD_BG)
    tb7 = s7.shapes.add_textbox(Inches(0.85), Inches(1.8), Inches(6.9), Inches(4.9))
    tf7 = tb7.text_frame
    tf7.word_wrap = True
    tf7.margin_left = tf7.margin_top = tf7.margin_right = tf7.margin_bottom = 0

    personas = [
        ("1. Small & Marginal Farmers (86.2% of Indian Holdings — 126M farmers)",
         "Use case: Affordable automated drip irrigation and AI leaf pathology in Hindi/Punjabi/English. Protects family livelihoods and eliminates manual night pumping.",
         "Benefit: Saves 40% water, boosts yield by 30%, frees 3+ hours daily."),
        ("2. Commercial Farms & Greenhouse Growers (Polyhouses / Orchards)",
         "Use case: Multi-zone solenoid valve control, fertigation scheduling, and microclimate telemetry.",
         "Benefit: Real-time sensor logs, automated dosing, high-value crop protection."),
        ("3. Mandi Wholesalers & Aggregators (Khanna / Ludhiana Mandis)",
         "Use case: Pre-harvest yield forecasts and direct farmer purchase contracts without middlemen.",
         "Benefit: Fresh supply predictability, reduced spoilage, transparent pricing."),
        ("4. Agri-Input Vendors & Cooperatives (Kisan Seva Kendras)",
         "Use case: Direct stocking of bio-fertilizers and drip spares matched to real-time regional soil deficits.",
         "Benefit: Higher inventory turnover, direct farmer advisory channel.")
    ]
    for i, (title, desc, ben) in enumerate(personas):
        p = tf7.paragraphs[0] if i == 0 else tf7.add_paragraph()
        p.text = title
        p.font.name = "Trebuchet MS"
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_LIME
        p.space_before = Pt(5) if i > 0 else Pt(0)
        
        pd = tf7.add_paragraph()
        pd.text = desc
        pd.font.name = "Arial"
        pd.font.size = Pt(8.8)
        pd.font.color.rgb = TEXT_LIGHT
        
        pb = tf7.add_paragraph()
        pb.text = ben
        pb.font.name = "Arial"
        pb.font.size = Pt(8.2)
        pb.font.color.rgb = GOLD

    # Right Column: Visual Persona Graphic
    add_image_safely(s7, img_users, Inches(8.2), Inches(1.3), Inches(4.533), Inches(2.7))

    # Right Bottom: User Potential Card
    add_card(s7, Inches(8.2), Inches(4.15), Inches(4.533), Inches(2.75), title="📊 ESTIMATED POTENTIAL & IMPACT REACH", bg_color=CARD_BG)
    tb7_cnt = s7.shapes.add_textbox(Inches(8.4), Inches(4.6), Inches(4.133), Inches(2.1))
    tf7_cnt = tb7_cnt.text_frame
    tf7_cnt.word_wrap = True
    tf7_cnt.margin_left = tf7_cnt.margin_top = tf7_cnt.margin_right = tf7_cnt.margin_bottom = 0
    p = tf7_cnt.paragraphs[0]
    p.text = "• Phase 1 Pilot: 50 smallholders across Samrala & Ludhiana (Punjab)\n• Phase 2 FPO Scale: 12 FPOs (~15,000 farmers) across Punjab & Haryana\n• Phase 3 National TAM: 126 Million small & marginal operational holdings\n• Global Reach: Sub-Saharan Africa & South Asia smallholder climates"
    p.font.name = "Arial"
    p.font.size = Pt(9.2)
    p.font.color.rgb = TEXT_LIGHT

    add_citation_bar(s7, "Ministry of Agriculture Census & NABARD FPO Directory", "https://agricoop.nic.in")

    # =========================================================================
    # SLIDE 8: IMPACT & OUTCOMES (Quantified & UN SDGs)
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s8, DARK_BG)
    add_header(s8, 8, "Impact & Outcomes", "Quantified Resource Conservation, Farmer Prosperity & UN SDGs")

    # Left Column: 4 Quantified Metrics Cards
    left_metrics = [
        ("💧 30%–50% Freshwater Saved", "Replaces wasteful flood irrigation with root-zone micro-drip. Conserves up to 1.8M liters of water per hectare per tomato crop cycle.", GOLD),
        ("🌾 20%–38% Yield Increase", "Maintains optimal soil moisture and prevents plant moisture stress during critical flowering and fruiting cycles.", ACCENT_LIME),
        ("⚡ 45% Pumping Power Saved", "Eliminates redundant pump runs. Reduces electricity & diesel generator fuel expenditure by ₹8,500/year per farm.", CYAN),
        ("💰 ₹24,000/Acre Profit Gain", "Net annual income rise through combined water savings, 25% lower chemical fertilizer application, and reduced crop blight losses.", ACCENT_GREEN)
    ]
    for idx, (title, desc, color) in enumerate(left_metrics):
        top_pos = Inches(1.3) + idx * Inches(1.4)
        add_card(s8, Inches(0.6), top_pos, Inches(7.4), Inches(1.25), bg_color=CARD_BG, border_color=CARD_BORDER)
        tb_m = s8.shapes.add_textbox(Inches(0.85), top_pos + Inches(0.12), Inches(6.9), Inches(1.0))
        tf_m = tb_m.text_frame
        tf_m.word_wrap = True
        tf_m.margin_left = tf_m.margin_top = tf_m.margin_right = tf_m.margin_bottom = 0
        p = tf_m.paragraphs[0]
        p.text = title
        p.font.name = "Trebuchet MS"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = color
        
        pd = tf_m.add_paragraph()
        pd.text = desc
        pd.font.name = "Arial"
        pd.font.size = Pt(9)
        pd.font.color.rgb = TEXT_LIGHT
        pd.space_before = Pt(2)

    # Right Top: Visual Impact Graphic
    add_image_safely(s8, img_impact, Inches(8.2), Inches(1.3), Inches(4.533), Inches(2.6))

    # Right Bottom: UN SDG Alignment Card
    add_card(s8, Inches(8.2), Inches(4.05), Inches(4.533), Inches(2.85), title="🌍 UNITED NATIONS SDG ALIGNMENT", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    tb_sdg = s8.shapes.add_textbox(Inches(8.4), Inches(4.45), Inches(4.133), Inches(2.35))
    tf_sdg = tb_sdg.text_frame
    tf_sdg.word_wrap = True
    tf_sdg.margin_left = tf_sdg.margin_top = tf_sdg.margin_right = tf_sdg.margin_bottom = 0

    sdgs = [
        ("SDG 2: Zero Hunger (Target 2.3 & 2.4)", "Doubles agricultural productivity and ensures sustainable food production systems."),
        ("SDG 6: Clean Water & Sanitation (Target 6.4)", "Substantially increases water-use efficiency across the agricultural sector."),
        ("SDG 12: Responsible Consumption (Target 12.2)", "Achieves sustainable management and efficient use of soil nutrients & water."),
        ("SDG 13: Climate Action (Target 13.1)", "Strengthens resilience and adaptive capacity to climate hazards and drought.")
    ]
    for i, (head, text) in enumerate(sdgs):
        p = tf_sdg.paragraphs[0] if i == 0 else tf_sdg.add_paragraph()
        p.text = f"• {head}"
        p.font.name = "Arial"
        p.font.size = Pt(8.8)
        p.font.bold = True
        p.font.color.rgb = ACCENT_LIME
        p.space_before = Pt(3) if i > 0 else Pt(0)
        
        pd = tf_sdg.add_paragraph()
        pd.text = f"   {text}"
        pd.font.name = "Arial"
        pd.font.size = Pt(8)
        pd.font.color.rgb = TEXT_MUTED

    add_citation_bar(s8, "United Nations Sustainable Development Goals Knowledge Platform", "https://sdgs.un.org/goals")

    # =========================================================================
    # SLIDE 9: BUSINESS MODEL & IMPLEMENTATION
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s9, DARK_BG)
    add_header(s9, 9, "Business Model & Implementation", "Unit Economics, Hardware BOM & Phased Deployment Strategy")

    # Left Column: Unit Economics & Pricing Model
    add_card(s9, Inches(0.6), Inches(1.3), Inches(5.9), Inches(5.6), title="💰 PRICING & HARDWARE BOM BREAKDOWN", bg_color=CARD_BG)
    tb9 = s9.shapes.add_textbox(Inches(0.85), Inches(1.8), Inches(5.4), Inches(4.9))
    tf9 = tb9.text_frame
    tf9.word_wrap = True
    tf9.margin_left = tf9.margin_top = tf9.margin_right = tf9.margin_bottom = 0

    bom_items = [
        ("ESP32 DevKit V1 Microcontroller", "₹380 ($4.60)"),
        ("Capacitive Soil Moisture Sensor v2.0", "₹120 ($1.45)"),
        ("DHT22 Air Temperature & Humidity Sensor", "₹180 ($2.15)"),
        ("5V Dual-Channel Optocoupled Relay Module", "₹95 ($1.15)"),
        ("IP65 Weatherproof Enclosure + Connectors", "₹140 ($1.70)"),
        ("5V 2A Power Adapter / Solar Battery Circuit", "₹160 ($1.90)"),
        ("TOTAL OPEN HARDWARE BOM COST", "₹1,075 ($12.95 USD)")
    ]
    for i, (item, cost) in enumerate(bom_items):
        p = tf9.paragraphs[0] if i == 0 else tf9.add_paragraph()
        p.text = f"• {item}: {cost}"
        p.font.name = "Arial"
        p.font.size = Pt(9.5)
        p.font.bold = (i == len(bom_items) - 1)
        p.font.color.rgb = ACCENT_LIME if i == len(bom_items) - 1 else TEXT_LIGHT
        p.space_before = Pt(4) if i > 0 else Pt(0)

    p_rev = tf9.add_paragraph()
    p_rev.text = "\nREVENUE MODEL & SUSTAINABILITY:"
    p_rev.font.name = "Trebuchet MS"
    p_rev.font.size = Pt(10.5)
    p_rev.font.bold = True
    p_rev.font.color.rgb = GOLD

    p_rev2 = tf9.add_paragraph()
    p_rev2.text = "• Basic Tier: 100% Free Software & Open-Source Firmware for all smallholders\n• FPO Enterprise Tier: ₹4,500/year per cooperative for centralized telemetry & aggregate mandi dispatch\n• Hardware Assembly: Pre-calibrated plug-and-play kits distributed via local Kisan Kendras with 15% margin"
    p_rev2.font.name = "Arial"
    p_rev2.font.size = Pt(8.8)
    p_rev2.font.color.rgb = TEXT_LIGHT

    # Right Column: Implementation Roadmap
    add_card(s9, Inches(6.8), Inches(1.3), Inches(5.933), Inches(5.6), title="🗺️ 4-PHASE IMPLEMENTATION ROADMAP", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    tb9_r = s9.shapes.add_textbox(Inches(7.05), Inches(1.8), Inches(5.45), Inches(4.9))
    tf9_r = tb9_r.text_frame
    tf9_r.word_wrap = True
    tf9_r.margin_left = tf9_r.margin_top = tf9_r.margin_right = tf9_r.margin_bottom = 0

    phases = [
        ("Phase 1: Lab Bench Validation (Months 1–3) [COMPLETED]",
         "48-hour continuous run, sensor calibration, PWA cloud architecture, and multimodal vision prototype verification."),
        ("Phase 2: Samrala Village Pilot (Months 4–7) [IN PROGRESS]",
         "Deployment of 50 field nodes across Ludhiana vegetable and wheat plots in collaboration with local FPOs and Krishi Vigyan Kendra (KVK)."),
        ("Phase 3: FPO & Mandi Aggregation (Months 8–14)",
         "Integration of mandi trader portal, automated transport booking, and solar-powered LoRa mesh nodes for off-grid farms."),
        ("Phase 4: State & National Scaling (Months 15–24)",
         "Partnership with Digital Agriculture Mission and PMKSY micro-irrigation subsidy framework for pan-India deployment.")
    ]
    for i, (title, desc) in enumerate(phases):
        p = tf9_r.paragraphs[0] if i == 0 else tf9_r.add_paragraph()
        p.text = title
        p.font.name = "Trebuchet MS"
        p.font.size = Pt(10.2)
        p.font.bold = True
        p.font.color.rgb = ACCENT_LIME if "COMPLETED" in title else GOLD
        p.space_before = Pt(6) if i > 0 else Pt(0)
        
        pd = tf9_r.add_paragraph()
        pd.text = desc
        pd.font.name = "Arial"
        pd.font.size = Pt(8.8)
        pd.font.color.rgb = TEXT_LIGHT
        pd.space_before = Pt(2)

    add_citation_bar(s9, "Ministry of Electronics & IT Hardware Sourcing & PMKSY Subsidy Guidelines", "https://pmksy.gov.in")

    # =========================================================================
    # SLIDE 10: FEASIBILITY & SCALABILITY
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s10, DARK_BG)
    add_header(s10, 10, "Feasibility & Scalability", "Technical Feasibility, Risk Mitigation & Hierarchical Scaling")

    # Left Column: Feasibility & Risks
    add_card(s10, Inches(0.6), Inches(1.3), Inches(7.0), Inches(5.6), title="🛡️ RISK MANAGEMENT & TECHNICAL FEASIBILITY", bg_color=CARD_BG)
    tb10 = s10.shapes.add_textbox(Inches(0.85), Inches(1.8), Inches(6.5), Inches(4.9))
    tf10 = tb10.text_frame
    tf10.word_wrap = True
    tf10.margin_left = tf10.margin_top = tf10.margin_right = tf10.margin_bottom = 0

    risks = [
        ("Risk: Rural Wi-Fi Outages & Zero Cellular Signal",
         "Mitigation: 100% autonomous edge fallback. All irrigation thresholds execute directly in ESP32 Flash memory without cloud packets. Telemetry syncs retrospectively upon reconnection."),
        ("Risk: Sensor Corrosion & Probe Degradation",
         "Mitigation: 100% capacitive sensors (dielectric measurement) with conformal PCB coating. Probes operate without copper exposure, lasting 3+ years in corrosive soils."),
        ("Risk: Power Surges & High Voltage Fluctuations",
         "Mitigation: Optocoupler isolation on all relay triggers (5,000V RMS dielectric breakdown protection) and integrated MOV surge suppressors."),
        ("Risk: Farmer Digital Literacy & Language Barrier",
         "Mitigation: Zero-typing multilingual voice UI and visual color status badges (Green = Good, Red = Low Moisture) designed for all age groups.")
    ]
    for i, (title, desc) in enumerate(risks):
        p = tf10.paragraphs[0] if i == 0 else tf10.add_paragraph()
        p.text = title
        p.font.name = "Trebuchet MS"
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.space_before = Pt(6) if i > 0 else Pt(0)
        
        pd = tf10.add_paragraph()
        pd.text = desc
        pd.font.name = "Arial"
        pd.font.size = Pt(8.8)
        pd.font.color.rgb = TEXT_LIGHT
        pd.space_before = Pt(2)

    # Right Top: Scale Graphic
    add_image_safely(s10, img_scale, Inches(7.8), Inches(1.3), Inches(4.933), Inches(2.7))

    # Right Bottom: Hierarchical Scaling Card
    add_card(s10, Inches(7.8), Inches(4.15), Inches(4.933), Inches(2.75), title="🚀 HIERARCHICAL SCALING FUNNEL", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    tb10_s = s10.shapes.add_textbox(Inches(8.0), Inches(4.55), Inches(4.533), Inches(2.2))
    tf10_s = tb10_s.text_frame
    tf10_s.word_wrap = True
    tf10_s.margin_left = tf10_s.margin_top = tf10_s.margin_right = tf10_s.margin_bottom = 0

    scale_steps = [
        "1. Single Farm (1 Node): Validated bench & pilot test in Ludhiana",
        "2. Village FPO (50–200 Nodes): Cluster deployment in Samrala cooperative",
        "3. District/State (5,000+ Nodes): PAU Agronomy & State Agriculture Dept integration",
        "4. National AgriStack (Pan-India): Direct open API connection to GoI Kisan Drones & Digital Agriculture Mission"
    ]
    for i, step in enumerate(scale_steps):
        p = tf10_s.paragraphs[0] if i == 0 else tf10_s.add_paragraph()
        p.text = f"• {step}"
        p.font.name = "Arial"
        p.font.size = Pt(9.2)
        p.font.color.rgb = TEXT_LIGHT
        p.space_before = Pt(4) if i > 0 else Pt(0)

    add_citation_bar(s10, "Digital Agriculture Mission 2024–25 & PM-KISAN Technical Architecture", "https://digitalagri.gov.in")

    # =========================================================================
    # SLIDE 11: COMPETITIVE ADVANTAGE
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s11, DARK_BG)
    add_header(s11, 11, "Competitive Advantage", "Unique Selling Proposition & Comprehensive Benchmark Matrix")

    # 4-Column Competitive Matrix Table
    add_card(s11, Inches(0.6), Inches(1.3), Inches(12.133), Inches(4.2), title="🏆 FEATURE & COST BENCHMARK MATRIX", bg_color=CARD_BG)
    
    table_shape = s11.shapes.add_table(6, 5, Inches(0.8), Inches(1.75), Inches(11.733), Inches(3.6))
    table = table_shape.table
    table.columns[0].width = Inches(2.533)
    table.columns[1].width = Inches(2.3)
    table.columns[2].width = Inches(2.3)
    table.columns[3].width = Inches(2.3)
    table.columns[4].width = Inches(2.3)

    headers = ["Feature / Metric", "AgriSense (Ours)", "Commercial Fasal", "CropIn Cloud", "Manual Flood"]
    for c_idx, h in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = RGBColor(25, 60, 45)
        p = cell.text_frame.paragraphs[0]
        p.text = h
        p.font.name = "Trebuchet MS"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = ACCENT_LIME if c_idx == 1 else WHITE

    matrix_data = [
        ["Hardware Cost", "Under ₹1,000 ($12)", "₹45,000–₹85,000", "₹1,20,000+ setup", "₹0 direct"],
        ["Subscription Fee", "₹0 (Free / Open)", "₹1,200 / month", "Enterprise contract", "₹0"],
        ["Offline Autonomy", "✅ 100% FreeRTOS Edge", "❌ Cloud Dependent", "❌ Cloud Dependent", "Manual Valve"],
        ["AI Leaf Diagnosis", "✅ Multimodal Vision <1.8s", "❌ Sensor Telemetry Only", "⚠️ Satellite / Batch", "❌ None"],
        ["Sensor Longevity", "✅ Capacitive (3+ Yrs)", "✅ Industrial Probe", "N/A (Satellite)", "❌ Resistive Leaching"]
    ]
    for r_idx, row in enumerate(matrix_data):
        for c_idx, val in enumerate(row):
            cell = table.cell(r_idx + 1, c_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(14, 32, 24) if r_idx % 2 == 0 else CARD_BG
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.name = "Arial"
            p.font.size = Pt(9.2)
            p.font.bold = (c_idx <= 1)
            p.font.color.rgb = ACCENT_LIME if c_idx == 1 else (GOLD if c_idx == 0 else TEXT_LIGHT)

    # Bottom USP Badges Card
    add_card(s11, Inches(0.6), Inches(5.65), Inches(12.133), Inches(1.25), title="⭐ THE AGRISENSE USP TRIPLE ADVANTAGE", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    tb11_b = s11.shapes.add_textbox(Inches(0.8), Inches(5.95), Inches(11.7), Inches(0.85))
    tf11_b = tb11_b.text_frame
    tf11_b.word_wrap = True
    tf11_b.margin_left = tf11_b.margin_top = tf11_b.margin_right = tf11_b.margin_bottom = 0
    p = tf11_b.paragraphs[0]
    p.text = "1. Unbeatable Affordability: 95% cheaper than commercial SCADA setups, opening precision tech to smallholders.\n2. Zero Connectivity Dependency: Field nodes execute pump decisions 100% locally even during total cellular blackout.\n3. Multimodal Edge + AI Intelligence: Merges capacitive soil telemetry with instant camera leaf diagnosis in native languages."
    p.font.name = "Arial"
    p.font.size = Pt(9.5)
    p.font.color.rgb = TEXT_LIGHT

    add_citation_bar(s11, "Commercial AgTech Pricing Benchmarks & Competitor Specifications", "https://fasal.co | https://cropin.com")

    # =========================================================================
    # SLIDE 12: TEAM & VISION (Bal Bharati Public School Included Here)
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s12, DARK_BG)
    add_header(s12, 12, "Team & Vision", "Bal Bharati Public School Innovation Team, Mentor & Future Horizons")

    # Top Card: Team Members
    add_card(s12, Inches(0.6), Inches(1.3), Inches(12.133), Inches(2.7), title="👥 INNOVATION TEAM MEMBERS & ROLES", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    
    t_cols = [
        ("Pranav Saxena", "Lead Developer & Architect", "ESP32 C++ firmware, FastAPI backend, cloud database sync & system architecture"),
        ("Hiyasha Deviyal", "Agronomy & UI/UX Research", "Soil moisture thresholds, farmer user-journey, accessibility design & UX testing"),
        ("Chaitanya Vashisht", "IoT Hardware & Field Bench", "Dual relay circuitry, sensor calibration, breadboard assembly & bench testing"),
        ("Kairavi Patel", "Frontend & Multilingual Voice", "Web interface, multilingual translation engine & native voice synthesizer"),
        ("Eekansh Patni", "Data Analytics & Reliability", "Telemetry analysis, soak-test benchmarking & crop stress validation")
    ]
    t_width = Inches(2.26)
    for idx, (name, role, work) in enumerate(t_cols):
        left_m = Inches(0.8) + idx * Inches(2.4)
        tb_tm = s12.shapes.add_textbox(left_m, Inches(1.75), t_width, Inches(2.1))
        tf_tm = tb_tm.text_frame
        tf_tm.word_wrap = True
        tf_tm.margin_left = tf_tm.margin_top = tf_tm.margin_right = tf_tm.margin_bottom = 0
        
        p = tf_tm.paragraphs[0]
        p.text = name
        p.font.name = "Trebuchet MS"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = ACCENT_LIME
        
        pr = tf_tm.add_paragraph()
        pr.text = role
        pr.font.name = "Arial"
        pr.font.size = Pt(8.5)
        pr.font.bold = True
        pr.font.color.rgb = GOLD
        pr.space_before = Pt(2)
        
        pw = tf_tm.add_paragraph()
        pw.text = work
        pw.font.name = "Arial"
        pw.font.size = Pt(7.8)
        pw.font.color.rgb = TEXT_MUTED
        pw.space_before = Pt(3)

    # Middle Left: Mentor & School Acknowledgement
    add_card(s12, Inches(0.6), Inches(4.15), Inches(5.9), Inches(2.75), title="🎯 MENTORSHIP & ACKNOWLEDGEMENTS", bg_color=CARD_BG)
    tb12_m = s12.shapes.add_textbox(Inches(0.8), Inches(4.55), Inches(5.5), Inches(2.2))
    tf12_m = tb12_m.text_frame
    tf12_m.word_wrap = True
    tf12_m.margin_left = tf12_m.margin_top = tf12_m.margin_right = tf12_m.margin_bottom = 0
    
    ack_items = [
        ("Institution", "Bal Bharati Public School — Atal Tinkering Lab & Innovation Cell"),
        ("Faculty Mentor", "Ms. Deepika Dutt — Continuous guidance on engineering methodology, structural rigor & project mentorship"),
        ("External Advisers", "Punjab Agricultural University (PAU) Agronomy Extension & Local Samrala Farmers Cooperative"),
        ("Dedication", "Dedicated to India's 126 million smallholder farmers fighting climate volatility and water scarcity")
    ]
    for i, (k, v) in enumerate(ack_items):
        p = tf12_m.paragraphs[0] if i == 0 else tf12_m.add_paragraph()
        p.text = f"• {k}: {v}"
        p.font.name = "Arial"
        p.font.size = Pt(8.8)
        p.font.color.rgb = TEXT_LIGHT
        p.space_before = Pt(4) if i > 0 else Pt(0)

    # Middle Right: Future Vision & Call to Action
    add_card(s12, Inches(6.8), Inches(4.15), Inches(5.933), Inches(2.75), title="🚀 FUTURE VISION & CALL TO ACTION", bg_color=CARD_BG, border_color=ACCENT_GREEN)
    tb12_v = s12.shapes.add_textbox(Inches(7.05), Inches(4.55), Inches(5.45), Inches(2.2))
    tf12_v = tb12_v.text_frame
    tf12_v.word_wrap = True
    tf12_v.margin_left = tf12_v.margin_top = tf12_v.margin_right = tf12_v.margin_bottom = 0

    vision_items = [
        "1. LoRa Mesh Farm Grid: 10km range multi-hop sensor telemetry without cellular towers",
        "2. Autonomous Drone NDVI: Automated aerial multispectral mapping integrated into AgriSense",
        "3. Satellite SAR Radar Moisture: Combining ESA Sentinel-1 radar with in-situ ESP32 data",
        "Call to Action: Join us in scaling AgriSense across India's Krishi Vigyan Kendras to make precision agriculture a universal farmer right.",
        "Contact: Pranav Saxena (pranavsaxenaofficial11@gmail.com) | agrisense-269.pages.dev"
    ]
    for i, v in enumerate(vision_items):
        p = tf12_v.paragraphs[0] if i == 0 else tf12_v.add_paragraph()
        p.text = f"• {v}"
        p.font.name = "Arial"
        p.font.size = Pt(8.8)
        p.font.color.rgb = ACCENT_LIME if "Call to Action" in v else TEXT_LIGHT
        p.space_before = Pt(3) if i > 0 else Pt(0)

    add_citation_bar(s12, "Bal Bharati Public School — AgriSense Project Archive", "https://agrisense-269.pages.dev | github.com/pranavsaxenaofficial11-coder")

    # Output Targets
    targets = [
        r"C:\Users\prana\OneDrive\Desktop\AgriSense_Official_12_Slides.pptx",
        r"C:\Users\prana\OneDrive\Desktop\agrisense-fullstack\AgriSense_Official_12_Slides.pptx",
        r"C:\Users\prana\Downloads\AgriSense_Official_12_Slides.pptx",
        r"C:\Users\prana\OneDrive\Desktop\agrisense-fullstack\frontend\public\AgriSense_Official_12_Slides.pptx",
        r"C:\Users\prana\OneDrive\Desktop\agrisense-fullstack\frontend\dist\AgriSense_Official_12_Slides.pptx"
    ]

    for t in targets:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        prs.save(t)
        print(f"Successfully generated visual presentation at: {t} ({os.path.getsize(t) // 1024} KB)")

if __name__ == "__main__":
    build_presentation()
