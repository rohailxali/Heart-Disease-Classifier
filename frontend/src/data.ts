// Data loader with Zod validation
import { z } from 'zod'
import {
  MetaSchema, EdaSchema, ResultsSchema, ComparisonSchema,
  ParamsSchema, CurvesSchema, AssumptionsSchema, VariantsSchema,
  type Meta, type Eda, type Results, type CompRow,
  type Params, type Curves, type Assumption, type Variants,
} from './schemas'

const BASE = import.meta.env.BASE_URL + 'data/'

async function loadJson<T>(file: string, schema: z.ZodType<T>): Promise<T> {
  const url = BASE + file
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const raw = await res.json()
  const result = schema.safeParse(raw)
  if (!result.success) {
    console.error(`Schema validation failed for ${file}:`, result.error.issues)
    throw new Error(`Data validation error in ${file}: ${result.error.issues[0]?.message}`)
  }
  return result.data
}

async function loadOptionalVariants(): Promise<Variants | null> {
  try {
    return await loadJson('variants.json', VariantsSchema)
  } catch {
    return null
  }
}

export interface AllData {
  meta: Meta
  eda: Eda
  results: Results
  comparison: CompRow[]
  params: Params
  curves: Curves
  assumptions: Assumption[]
  variants: Variants | null
}

let _cache: AllData | null = null

export async function loadAllData(): Promise<AllData> {
  if (_cache) return _cache
  const [meta, eda, results, comparison, params, curves, assumptions, variants] = await Promise.all([
    loadJson('meta.json', MetaSchema),
    loadJson('eda.json', EdaSchema),
    loadJson('results.json', ResultsSchema),
    loadJson('comparison.json', ComparisonSchema),
    loadJson('params.json', ParamsSchema),
    loadJson('curves.json', CurvesSchema),
    loadJson('assumptions.json', AssumptionsSchema),
    loadOptionalVariants(),
  ])
  _cache = { meta, eda, results, comparison, params, curves, assumptions, variants }
  return _cache
}
