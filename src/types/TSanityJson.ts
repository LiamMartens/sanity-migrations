export type TSanityJson = {
  root: boolean
  project: {
    name: string
  }
  api: {
    projectId: string
    dataset: string
  }
  plugins?: string[]
  env?: Record<string, TSanityJson>
  parts?: ({
    name: string
    path: string
  } | {
    implements: string
    path: string
  })[]
}