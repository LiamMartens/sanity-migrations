type Environment = string
export type TSanityMigrationLog = Record<
  Environment,
  Record<string, number>
>