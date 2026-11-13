import { z } from 'zod';

export const TrajectoryPointSchema = z.object({
  timestamp: z.string(),
  risk_probability: z.number(),
});

export const SatelliteSourceInfoSchema = z.object({
  isro_insat_cct: z.number(),
  nasa_gpm_flux: z.number(),
  sentinel_soil_idx: z.number(),
  imd_radar_dbz: z.number(),
}).optional().nullable();

export const ModelEnsembleDataSchema = z.object({
  logistic_regression: z.number(),
  random_forest: z.number(),
  xgboost: z.number(),
  ensemble_score: z.number(),
  model_agreement: z.string(),
}).optional().nullable();

export const ExposureDataSchema = z.object({
  population_exposed: z.number(),
  critical_infrastructure: z.number(),
  road_segments_affected: z.number(),
}).optional().nullable();

export const PredictionResultSchema = z.object({
  location_id: z.string(),
  location_name: z.string(),
  risk_level: z.string(),
  flood_probability: z.number(),
  landslide_probability: z.number(),
  compound_hazard_level: z.string(),
  confidence: z.number(),
  contributing_factors: z.record(z.string(), z.number()),
  negative_factors: z.record(z.string(), z.number()),
  recommended_action: z.string(),
  safe_zone: z.string(),
  trajectory: z.array(TrajectoryPointSchema),
  trajectory_trend: z.string(),
  lead_time_window: z.string(),
  lat: z.number(),
  lng: z.number(),
  is_simulated: z.boolean().default(false),
  data_source: z.string().default('LIVE_TELEMETRY'),
  disclaimer: z.string().default('DECISION SUPPORT ONLY'),
  satellite_info: SatelliteSourceInfoSchema,
  ensemble_data: ModelEnsembleDataSchema,
  exposure: ExposureDataSchema,
});

export type PredictionResult = z.infer<typeof PredictionResultSchema>;

export const SensorStatusSchema = z.object({
  id: z.string(),
  type: z.string(),
  reading: z.string(),
  battery: z.number(),
  online: z.boolean(),
  last_updated: z.string(),
  health_score: z.number(),
  status_label: z.string(),
  anomaly_detected: z.boolean(),
  is_simulated: z.boolean().default(false),
  source: z.string().default('Ground & Satellite Array'),
});

export type SensorStatus = z.infer<typeof SensorStatusSchema>;

export const SatelliteFeedItemSchema = z.object({
  constellation: z.string(),
  satellite: z.string(),
  agency: z.string(),
  sensor_type: z.string(),
  coverage: z.string(),
  status: z.string(),
  latency_ms: z.number(),
  resolution: z.string(),
  data_stream: z.string(),
  last_ping: z.string(),
  is_simulated: z.boolean().default(false),
});

export type SatelliteFeedItem = z.infer<typeof SatelliteFeedItemSchema>;
