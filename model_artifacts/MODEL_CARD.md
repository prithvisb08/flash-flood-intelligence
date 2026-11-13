# Model Card: JALRAKSHAK Calibrated Hydro-ML Classifier

## 1. Overview
- **Model Architecture:** Multi-class Random Forest with Platt Sigmoid Probability Calibration (`CalibratedClassifierCV`).
- **Domain:** Mountainous flash flood & debris surge early-warning probability estimation.
- **Intended Use:** Operational decision-support telemetry screening. NOT a certified autonomous alarm system.
- **Date Trained:** 2026-11-13 13:28 UTC

## 2. Input Features
1. `rainfall_1h`: Hourly precipitation intensity (mm/h).
2. `rainfall_24h`: 24-hour antecedent cumulative rainfall (mm).
3. `soil_moisture`: Soil saturation percentage (0-100%).
4. `water_level`: River stage / river depth at monitoring station (m).
5. `water_level_rise_rate`: Rate of hydraulic rise velocity (m/h).
6. `slope_degree`: Topographic catchment gradient (degrees).
7. `hist_vulnerability`: Historical basin vulnerability coefficient (0.0 to 1.0).

## 3. Evaluation & Performance Metrics
Evaluation performed on an unseen test set (20% holdout, N=2,400) without temporal leakage:
- **Accuracy:** 100.00%
- **Macro F1-Score:** 1.0000
- **PR-AUC (Precision-Recall Area under Curve for High/Critical Hazards):** 1.0000
- **Brier Calibration Loss:** 0.0000 (demonstrates calibrated probabilities)

## 4. Feature Importance Rankings
| Feature | Importance Weight |
|---|---|
| `water_level_rise_rate` | 0.2912 |
| `rainfall_1h` | 0.2876 |
| `rainfall_24h` | 0.2294 |
| `water_level` | 0.1074 |
| `soil_moisture` | 0.0843 |
| `slope_degree` | 0.0001 |
| `hist_vulnerability` | 0.0001 |

## 5. Limitations & Ethical Considerations
- **Life Safety:** Model predictions must never trigger autonomous community sirens without validation by authorized meteorological / hydrological officers (NDMA / CWC / IMD).
- **Extreme Domain Shifts:** Severe seismic dam breaches (e.g., GLOF without preceding rainfall) require compound seismic / satellite InSAR correlation.
