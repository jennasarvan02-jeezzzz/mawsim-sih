# Data Inventory & Provenance Dictionary — FreightIQ

Every data element in FreightIQ has an explicitly declared provenance category to maintain auditability and trust during procurement decision support.

| Data Field / Entity | Source Category | Prototype Status | How it is Used in FreightIQ | Operational Caveat |
| :--- | :--- | :--- | :--- | :--- |
| **Port Draft, LOA & Beam Limits** | `Official-source Prototype Configuration` | Calibrated Baseline | Enforces physical vessel clearance rules (e.g. Paradip MCB 14.5m max draft). | Must validate live local port marine notices and official daily tide tables before fixture. |
| **Terminal Handling Rates** | `Official-source Prototype Configuration` | Calibrated Baseline | Determines cargo loading & discharge duration (e.g. Newcastle 60,000 MT/day; Paradip 45,000 MT/day). | Assumes continuous conveyor mechanical operations under standard weather conditions. |
| **Historical Freight Rate Series** | `Sample Historical Prototype Data` | Deterministic Synthetic Series | Powers 60-day historical trend curves and calculates historical volatility standard deviation. | Calibrated to reflect realistic Baltic dry index levels; not live commercial broker quotes. |
| **Port Congestion & Wait Hours** | `Simulated Scenario Data` | Scenario Simulation | Determines queuing waiting days and waiting cost contingency buffers. | Simulates seasonal monsoonal delays and berth queue conditions. |
| **Vessel DWT & Dimensions** | `Prototype Assumption` | Industry Standard Classes | Evaluates Handysize, Supramax, Panamax, and Capesize capacity fit and geometric compatibility. | Individual ship particulars vary slightly per vessel build specification. |
| **Contract Volatility Premium (+6%)** | `Prototype Assumption` | Heuristic Parameter | Accounts for spot market price volatility and unhedged positioning risk. | Actual spot risk depends on spot market cycle and supply-demand balance. |
| **COA Volume Discount (-4%)** | `Prototype Assumption` | Heuristic Parameter | Simulates volume rebate negotiated with shipowners for committed 90-day multiple voyages. | Subject to bilateral charter party negotiations and credit terms. |
| **Market Entry Window (18–25d)** | `Prototype Assumption` | Operational Rule | Calculates recommended chartering fixture window prior to laycan commencement. | Optimal fixture lead time may shift during acute tonnage shortages. |
