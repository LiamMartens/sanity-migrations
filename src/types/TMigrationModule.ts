export type TMigrationModule = {
  default: (
    client: import('@sanity/client').SanityClient,
    opts: {
      lastMigrationTs: number | null
    }
  ) => Promise<void>
}