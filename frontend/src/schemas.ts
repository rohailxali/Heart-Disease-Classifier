// Zod schemas and TypeScript types for all JSON data files
import { z } from 'zod'

// meta.json
export const MetaSchema = z.object({
  paper: z.object({
    title: z.string(),
    authors: z.string(),
    journal: z.string(),
    volume: z.number(),
    issue: z.number(),
    year: z.number(),
    pages: z.string(),
  }),
  dataset: z.object({
    source: z.string(),
    rows: z.number(),
    columns: z.number(),
    features: z.array(z.string()),
    target: z.string(),
  }),
  seeds: z.array(z.number()),
  split: z.object({
    train: z.number(),
    test: z.number(),
    disease_in_test: z.number(),
    healthy_in_test: z.number(),
  }),
  one_patient_pct: z.number(),
  generated_at: z.string(),
  library_versions: z.record(z.string(), z.string()),
})
export type Meta = z.infer<typeof MetaSchema>

// eda.json
export const HistogramSchema = z.object({
  edges: z.array(z.number()),
  healthy: z.array(z.number()),
  disease: z.array(z.number()),
})
export type Histogram = z.infer<typeof HistogramSchema>

export const EdaSchema = z.object({
  class_counts: z.object({ healthy: z.number(), disease: z.number() }),
  num_histograms: z.record(z.string(), HistogramSchema),
  cat_counts: z.record(z.string(), z.record(z.string(), z.object({ healthy: z.number(), disease: z.number() }))),
  corr_matrix: z.object({
    columns: z.array(z.string()),
    data: z.array(z.array(z.number())),
  }),
  data_quality: z.object({
    total_rows: z.number(),
    missing_values: z.number(),
    duplicates: z.number(),
    zero_cholesterol_rows: z.number(),
    zero_restingbp_rows: z.number(),
    disease_rate_zero_cholesterol_pct: z.number(),
    disease_rate_nonzero_cholesterol_pct: z.number(),
    cholesterol_zero_x_disease: z.object({
      zero_chol_disease: z.number(),
      zero_chol_healthy: z.number(),
      nonzero_chol_disease: z.number(),
      nonzero_chol_healthy: z.number(),
      total_zero_chol: z.number(),
      total_nonzero_chol: z.number(),
    }).optional(),
    cholesterol_all_hist: HistogramSchema,
    cholesterol_nonzero_hist: HistogramSchema,
  }),
  describe: z.record(z.string(), z.record(z.string(), z.number())),
})
export type Eda = z.infer<typeof EdaSchema>

// results.json
export const PerSeedRowSchema = z.object({
  seed: z.number(),
  model: z.string(),
  cv_acc: z.number().nullable(),
  accuracy: z.number(),
  precision0: z.number(),
  precision1: z.number(),
  recall0: z.number(),
  recall1: z.number(),
  f1_0: z.number(),
  f1_1: z.number(),
  auc: z.number(),
  TN: z.number(),
  FP: z.number(),
  FN: z.number(),
  TP: z.number(),
})
export type PerSeedRow = z.infer<typeof PerSeedRowSchema>

export const StatSchema = z.object({ mean: z.number().nullable(), std: z.number().nullable() })
export type Stat = z.infer<typeof StatSchema>

export const ModelResultSchema = z.object({
  stats: z.record(z.string(), StatSchema),
  per_seed: z.array(PerSeedRowSchema),
  confusion_pooled: z.object({ TN: z.number(), FP: z.number(), FN: z.number(), TP: z.number() }),
  confusion_per_seed: z.array(z.object({
    seed: z.number(), TN: z.number(), FP: z.number(), FN: z.number(), TP: z.number(),
  })),
})
export type ModelResult = z.infer<typeof ModelResultSchema>

export const ResultsSchema = z.record(z.string(), ModelResultSchema)
export type Results = Record<string, ModelResult>

// comparison.json
export const CompRowSchema = z.object({
  model: z.string(),
  metric: z.string(),
  paper: z.number(),
  mine: z.number(),
  std: z.number(),
  diff: z.number(),
  z: z.number().nullable(),
  verdict: z.enum(['within noise', 'higher', 'lower']),
})
export const ComparisonSchema = z.array(CompRowSchema)
export type CompRow = z.infer<typeof CompRowSchema>

// params.json
export const ParamsSchema = z.record(z.string(), z.array(z.record(z.string(), z.union([z.string(), z.number()]))))
export type Params = Record<string, Array<Record<string, string | number>>>

// curves.json
export const CurveSchema = z.object({
  note: z.string(),
  best_config: z.object({
    batch: z.number().nullable(),
    lr: z.number().nullable(),
    epochs: z.number().nullable(),
  }),
  epochs: z.array(z.number()),
  loss: z.array(z.number()),
  val_loss: z.array(z.number()),
  accuracy: z.array(z.number()),
  val_accuracy: z.array(z.number()),
})
export type Curve = z.infer<typeof CurveSchema>

export const CurvesSchema = z.record(z.string(), CurveSchema)
export type Curves = Record<string, Curve>

// assumptions.json
export const AssumptionSchema = z.object({
  id: z.string(),
  source: z.enum(['paper', 'assumption']),
  text: z.string(),
})
export const AssumptionsSchema = z.array(AssumptionSchema)
export type Assumption = z.infer<typeof AssumptionSchema>

// variants.json
export const VariantStatSchema = z.object({ mean: z.number(), std: z.number() })
export const DeltaBSchema = z.object({
  baseline_accuracy: z.number(),
  variant_b_accuracy: z.number(),
  delta_accuracy_pp: z.number(),
  baseline_auc: z.number(),
  variant_b_auc: z.number(),
  delta_auc_pp: z.number(),
})
export const DeltaASchema = z.object({
  baseline_accuracy: z.number(),
  variant_a_accuracy: z.number(),
  delta_accuracy_pp: z.number(),
  baseline_auc: z.number(),
  variant_a_auc: z.number(),
  delta_auc_pp: z.number(),
})

export const VariantsSchema = z.object({
  variant_a_dnn_early_stopping: z.object({
    title: z.string(),
    description: z.string(),
    hypothesis: z.string(),
    status: z.enum(['not_run', 'executed']),
    models: z.record(z.string(), z.record(z.string(), VariantStatSchema)).optional(),
    deltas_vs_baseline: z.record(z.string(), DeltaASchema).optional(),
  }),
  variant_b_median_imputation: z.object({
    title: z.string(),
    description: z.string(),
    hypothesis: z.string(),
    status: z.enum(['not_run', 'executed']),
    models: z.record(z.string(), z.record(z.string(), VariantStatSchema)).optional(),
    deltas_vs_baseline: z.record(z.string(), DeltaBSchema).optional(),
  }),
})
export type Variants = z.infer<typeof VariantsSchema>
