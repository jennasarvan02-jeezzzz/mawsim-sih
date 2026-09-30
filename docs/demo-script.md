# Smart India Hackathon (SIH) 2026 — 3 to 5 Minute Live Demo Script

**Platform:** FreightIQ — Intelligent Freight Forecasting and Vessel Chartering Decision Platform  
**Presenter Role:** Lead Full-Stack Architect / Chartering Strategist  

---

### Step 1: The Problem & Landing Page (0:00 – 0:45)
- **Screen:** Open `http://localhost:5173/`
- **Narration:**
  > *"Good morning, esteemed judges. India's steel industry relies heavily on overseas coking coal imports from Australia and Indonesia to East Coast ports like Paradip and Vizag. Currently, chartering managers make reactive, single-voyage spot bookings that expose them to severe freight volatility, port congestion demurrage, and physical berth clearance failures.*
  > *FreightIQ transforms this into an explainable, data-backed multi-voyage planning workflow."*
- **Action:** Click **"Analyze Charter Requirement"**.

---

### Step 2: Input Requirement & Corridor Guard (0:45 – 1:30)
- **Screen:** `/analyze`
- **Narration:**
  > *"Here is our default SIH scenario: An industrial buyer requires 75,000 MT of Metallurgical Coking Coal from the Port of Newcastle, Australia to Paradip Port, India, arriving between October 10 and October 20, 2026.*
  > *Notice that we transparently tag every parameter with its Data Provenance badge. Non-MVP routes are gracefully restricted."*
- **Action:** Click **"Execute Decision Analysis"**.
- **Visual:** Point out the multi-step loading animation verifying berth envelopes, moving averages, and queuing buffers.

---

### Step 3: Explainable Forecast Dashboard (1:30 – 2:45)
- **Screen:** `/dashboard/:recommendationId`
- **Narration:**
  > *"Within seconds, FreightIQ synthesizes a complete recommendation:*
  > *1. **Recommended Vessel:** Panamax/Kamsarmax (optimal capacity fit for 75,000 MT).*
  > *2. **Strategy:** Short-Term Multiple Voyage COA.*
  > *3. **Market Entry Window:** Fix the charter between Sept 15 and Sept 22 (18–25 days before laycan).*
  > *4. **Interactive Freight Chart:** Shows 60 days of historical spot rates, the 30-day forecast trajectory ($28.40/MT), and a 95% statistical confidence interval band.*
  > *5. **Explainable Reasons:** No black box — 4 explicit plain-language reasons explain why this option was chosen."*
- **Action:** Scroll down to the **Vessel Comparison Matrix**.
- **Key Demo Highlight:**
  > *"Notice that Capesize is explicitly marked as REJECTED because Paradip Mechanized Coal Berth has a 14.5m draft restriction, while Capesize requires 17.5m. A naive buyer seeking the lowest nominal Capesize rate would face catastrophic berth rejection."*

---

### Step 4: Port Intelligence & Risk Center (2:45 – 3:45)
- **Screen:** Click **"Port & Route Intelligence"** (`/port-intelligence/:id`)
- **Narration:**
  > *"Our Port Intelligence module maps the 5,600 NM corridor timeline, breaking down the 21.5-day total turnaround: 17.9 days sailing, 1.3 days loading at Newcastle, 1.7 days discharge at Paradip, and 1.8 days congestion waiting."*
- **Action:** Navigate to **"Risk Center"** (`/risks/:id`).
- **Narration:**
  > *"Our 0–100 composite risk engine scores this fixture at 45/100 (Moderate Risk). Each risk card provides clear operational impacts and concrete mitigation steps."*

---

### Step 5: Multi-Voyage Contract Planner & Financial Value (3:45 – 4:45)
- **Screen:** Navigate to **"Multi-Voyage Planner"** (`/contract-planner/:id`).
- **Narration:**
  > *"Finally, we help the buyer transition from spot to contract planning. Over a 90-day period moving 300,000 MT in 4 Panamax rotations, structured COA contracting reduces unhedged spot volatility premiums:*
  > *• **Spot Cost:** \$9.03M USD (65% operational reliability)*
  > *• **Contract COA Cost:** \$8.18M USD (88% operational reliability)*
  > *• **Estimated Strategic Efficiency:** \$852,000 USD (9.4% savings).*
  > *Every calculation includes visible provenance labels and prototype disclaimers."*

---

### Step 6: Conclusion (4:45 – 5:00)
- **Narration:**
  > *"FreightIQ delivers a local-first, explainable, and production-ready decision platform that empowers India's bulk importers to charter smarter, safer, and with complete operational visibility. Thank you!"*
