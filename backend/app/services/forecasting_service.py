"""Explainable Freight Rate Forecasting Engine."""

import math
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from app.config.settings import settings
from app.models.database import FreightRateHistory
from app.schemas.schemas import ChartDataPoint


class ForecastingService:
    @staticmethod
    def generate_forecast(
        history: List[FreightRateHistory],
        forecast_days: int = 30,
        target_arrival_date_str: str = "2026-10-15"
    ) -> Dict[str, Any]:
        """
        Computes an explainable moving average + trend forecast with standard deviation uncertainty bounds.
        """
        if not history:
            # Fallback default if empty
            return {
                "expected_rate": 28.0,
                "low_rate": 25.5,
                "high_rate": 30.5,
                "trend_label": "STABLE",
                "uncertainty_level": "MODERATE",
                "volatility_std": 1.2,
                "chart_data": []
            }

        rates = [item.rate_usd_per_mt for item in history]
        dates = [item.date for item in history]

        # 1. 14-day recent window for moving average and trend calculation
        window_size = min(14, len(rates))
        recent_rates = rates[-window_size:]
        weights = np.linspace(0.6, 1.0, window_size)
        weights /= weights.sum()

        weighted_ma = float(np.sum(np.array(recent_rates) * weights))
        std_dev = float(np.std(rates[-30:])) if len(rates) >= 30 else float(np.std(rates))

        # Linear regression slope over recent rates
        x = np.arange(window_size)
        y = np.array(recent_rates)
        slope, intercept = np.polyfit(x, y, 1)

        # 2. Trend classification
        if slope > 0.04:
            trend_label = "RISING"
        elif slope < -0.04:
            trend_label = "FALLING"
        else:
            trend_label = "STABLE"

        # 3. Uncertainty classification
        if std_dev < 1.0:
            uncertainty_level = "LOW"
        elif std_dev < 2.2:
            uncertainty_level = "MODERATE"
        else:
            uncertainty_level = "HIGH"

        # 4. Generate Chart Data Points (Historical + Forecast)
        chart_data: List[ChartDataPoint] = []

        # Historical points
        for item in history:
            chart_data.append(
                ChartDataPoint(
                    date=item.date,
                    historical_rate=item.rate_usd_per_mt,
                    forecast_rate=None,
                    forecast_low=None,
                    forecast_high=None,
                    is_forecast=False,
                    source_label=settings.PROVENANCE_HISTORICAL
                )
            )

        # Last historical date
        last_date = datetime.strptime(dates[-1], "%Y-%m-%d")

        # Connect historical and forecast at seam
        chart_data[-1].forecast_rate = chart_data[-1].historical_rate
        chart_data[-1].forecast_low = chart_data[-1].historical_rate
        chart_data[-1].forecast_high = chart_data[-1].historical_rate

        forecast_rates = []
        for d in range(1, forecast_days + 1):
            future_date = last_date + timedelta(days=d)
            future_date_str = future_date.strftime("%Y-%m-%d")

            # Project forward with dampening slope
            dampened_slope = slope * math.exp(-d / 20.0)
            projected_rate = round(weighted_ma + (dampened_slope * d), 2)

            # Expanding uncertainty cone over time
            expansion_factor = math.sqrt(1 + (d / 15.0))
            forecast_low = round(max(5.0, projected_rate - (1.96 * std_dev * expansion_factor)), 2)
            forecast_high = round(projected_rate + (1.96 * std_dev * expansion_factor), 2)

            forecast_rates.append((future_date_str, projected_rate, forecast_low, forecast_high))

            chart_data.append(
                ChartDataPoint(
                    date=future_date_str,
                    historical_rate=None,
                    forecast_rate=projected_rate,
                    forecast_low=forecast_low,
                    forecast_high=forecast_high,
                    is_forecast=True,
                    source_label=settings.PROVENANCE_SIMULATED
                )
            )

        # 5. Extract expected rate for target arrival / window
        # Find closest date to target
        target_point = None
        for pt_date, pt_rate, pt_low, pt_high in forecast_rates:
            if pt_date >= target_arrival_date_str:
                target_point = (pt_rate, pt_low, pt_high)
                break
        if not target_point and forecast_rates:
            target_point = (forecast_rates[-1][1], forecast_rates[-1][2], forecast_rates[-1][3])

        expected_rate = target_point[0] if target_point else round(weighted_ma, 2)
        low_rate = target_point[1] if target_point else round(expected_rate - 1.96 * std_dev, 2)
        high_rate = target_point[2] if target_point else round(expected_rate + 1.96 * std_dev, 2)

        return {
            "expected_rate": expected_rate,
            "low_rate": low_rate,
            "high_rate": high_rate,
            "trend_label": trend_label,
            "uncertainty_level": uncertainty_level,
            "volatility_std": round(std_dev, 2),
            "chart_data": chart_data
        }
