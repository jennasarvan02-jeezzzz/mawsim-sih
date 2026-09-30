# Decision Logic & Mathematical Formulation — FreightIQ

This document details the quantitative models, deterministic algorithms, and heuristic rules powering FreightIQ.

---

## 1. Port & Vessel Feasibility Clearance Engine

A vessel class $v$ is classified as **FEASIBLE** at origin port $P_{orig}$ and destination port $P_{dest}$ if and only if all physical boundary constraints are satisfied:

$$\text{Draft Check: } \text{Draft}_v \le \min(\text{Draft}_{P_{orig}}, \text{Draft}_{P_{dest}})$$
$$\text{LOA Check: } \text{LOA}_v \le \min(\text{LOA}_{P_{orig}}, \text{LOA}_{P_{dest}})$$
$$\text{Beam Check: } \text{Beam}_v \le \min(\text{Beam}_{P_{orig}}, \text{Beam}_{P_{dest}})$$

### Status Classification:
- **`FEASIBLE`**: Vessel satisfies 100% of physical dimensional limits AND parcel volume fits comfortably within nominal deadweight capacity ($\text{Capacity Fit} \ge 0.85$).
- **`CONDITIONALLY_FEASIBLE`**: Physical constraints pass, but parcel size necessitates split shipments or incurs minor deadfreight ($0.50 \le \text{Capacity Fit} < 0.85$).
- **`REJECTED`**: Any physical draft, LOA, or beam check fails (e.g. Capesize draft $17.5\text{m} > 14.5\text{m}$ Paradip limit).

---

## 2. Explainable Time-Series Freight Forecasting

FreightIQ deliberately utilizes an explainable linear-trend weighted moving average (WMA) with a statistical volatility envelope rather than opaque deep-learning models.

### Weighted Moving Average (14-Day Window):
$$\bar{R}_{t} = \sum_{i=1}^{W} w_i \cdot R_{t-W+i} \quad \text{where } \sum w_i = 1$$

### Trend Slope Estimation:
Using ordinary least squares linear regression over the recent window:
$$\text{Slope } m = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sum (x_i - \bar{x})^2}$$

- If $m > +0.04\text{ \$/day} \implies \textbf{RISING}$
- If $m < -0.04\text{ \$/day} \implies \textbf{FALLING}$
- Otherwise $\implies \textbf{STABLE}$

### 95% Confidence / Uncertainty Interval ($d$ days forward):
$$\text{Range}(d) = \hat{R}(d) \pm 1.96 \cdot \sigma \cdot \sqrt{1 + \frac{d}{15}}$$
where $\sigma$ is the sample standard deviation over historical fixtures.

---

## 3. Total Landed Freight Cost Formulation

$$\text{Total Cost} = \text{Freight}_{\text{base}} + \text{Buffer}_{\text{congestion}} + \text{Buffer}_{\text{operational}}$$

$$\text{Freight}_{\text{base}} = \hat{R} \times Q_{\text{cargo}}$$
$$\text{Buffer}_{\text{congestion}} = \text{Freight}_{\text{base}} \times r_{\text{congestion}}$$
$$\text{Buffer}_{\text{operational}} = \text{Freight}_{\text{base}} \times r_{\text{operational}}$$

| Congestion Level | $r_{\text{congestion}}$ | Operational Risk Level | $r_{\text{operational}}$ |
| :--- | :--- | :--- | :--- |
| **LOW** | $2.0\%$ | **LOW** | $2.0\%$ |
| **MODERATE** | $5.0\%$ | **MODERATE** | $4.0\%$ |
| **HIGH** | $9.0\%$ | **HIGH / CRITICAL** | $7.0\%$ |

---

## 4. Multi-Factor 0–100 Composite Risk Scoring

$$\text{Risk Score} = 0.35 \cdot S_{\text{volatility}} + 0.25 \cdot S_{\text{congestion}} + 0.25 \cdot S_{\text{deadline}} + 0.15 \cdot S_{\text{idle}}$$

- **$S_{\text{volatility}}$:** Scaled standard deviation of historical rates.
- **$S_{\text{congestion}}$:** Scaled total queuing wait hours ($H_{orig} + H_{dest}$).
- **$S_{\text{deadline}}$:** Transit slack days relative to arrival window.
- **$S_{\text{idle}}$:** Vessel capacity fit and berth turnaround delay risk.

### Score Mapping:
- $0 \le \text{Score} \le 30 \implies \textbf{LOW}$
- $31 \le \text{Score} \le 60 \implies \textbf{MODERATE}$
- $61 \le \text{Score} \le 80 \implies \textbf{HIGH}$
- $81 \le \text{Score} \le 100 \implies \textbf{CRITICAL}$

---

## 5. Multi-Voyage Contract Planning Logic (Spot vs COA)

$$\text{Spot Total Cost} = \bar{R}_{\text{base}} \times (1 + \Delta_{\text{spot}}) \times Q_{\text{total}}$$
$$\text{Contract Total Cost} = \bar{R}_{\text{base}} \times (1 - \Delta_{\text{contract}}) \times Q_{\text{total}}$$

$$\text{Estimated Savings} = \text{Spot Total Cost} - \text{Contract Total Cost}$$

- **Spot Volatility Penalty ($\Delta_{\text{spot}}$):** $+6.0\%$ (reflects market exposure, positioning premiums).
- **Volume Commitment Discount ($\Delta_{\text{contract}}$):** $-4.0\%$ (reflects term volume discount).
- **Spot Operational Reliability:** $65\%$
- **Multi-Voyage Operational Reliability:** $88\%$ (pre-committed vessel rotation and priority berth slots).
