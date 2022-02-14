import path from 'path'
import fs from 'fs-extra'
import merge from 'lodash.merge'
import Configstore from 'configstore'
import SanityClient from '@sanity/client'
import Case from 'case'
import ora from 'ora'
import inquirer from 'inquirer'
import { program } from 'commander'
import { findUp } from 'find-up'
import { TMigrateOpts, TSanityJson, TSanityMigrationLog, TMigrationModule, TNewOpts } from './types'

program
  .name('Sanity Migration tool')

program.command('new')
  .argument('<name>', 'The name of the migration')
  .option('--sanity-project-dir <dir>', 'Which Sanity project use')
  .action(async (name: string, opts: TNewOpts) => {
    const sanityJsonFile = await findUp('sanity.json', {
      cwd: path.resolve(opts.sanityProjectDir ?? process.cwd())
    })
    if (!sanityJsonFile) {
      throw new Error('Could not find Sanity project in parent directory tree')
    }

    const sanityProjectDir = path.dirname(sanityJsonFile)

    const migrationsDir = path.join(sanityProjectDir, 'migrations')
    await fs.ensureDir(migrationsDir)
    const availableMigrations = await fs.readdir(migrationsDir)

    const date = new Date()
    const filename = [
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ].join('') + '_' + Case.snake(name) + '.js'

    if (availableMigrations.includes(filename)) {
      throw new Error(`Migration already exists [${filename}]`)
    }

    await fs.writeFile(
      path.join(migrationsDir, filename),
`/**
* @type {import('sanity-migrations').TMigrationModule}
*/
module.exports = function migrate(sanityClient, opts) {
}`
    )

    console.log(`Written new migration file "${filename}"`)
  })

program.command('migrate')
  .option('--sanity-project-dir <dir>', 'Which Sanity project use')
  .option('--sanity-token <token>', 'The Sanity token to use for API interaction')
  .action(async (opts: TMigrateOpts) => {
    const SanityConfigStore = new Configstore('sanity', {}, {
      globalConfigPath: true,
    })

    const sanityJsonFile = await findUp('sanity.json', {
      cwd: path.resolve(opts.sanityProjectDir ?? process.cwd())
    })
    if (!sanityJsonFile) {
      throw new Error('Could not find Sanity project in parent directory tree')
    }

    const sanityToken: string | undefined =
      opts.sanityToken ||
      SanityConfigStore.get('authToken') ||
      process.env.SANITY_TOKEN
    if (!sanityToken) {
      console.log('Hi! It seems you are not logged in to Sanity locally, please run:')
      console.log('sanity login')
      throw new Error('Not logged in')
    }

    const env = process.env.NODE_ENV ?? 'development'

    let sanityJson = await fs.readJSON(sanityJsonFile) as TSanityJson

    if (sanityJson.env?.[env]) {
      sanityJson = merge({...sanityJson}, sanityJson.env[env])
      delete sanityJson.env
    }

    const dataset = sanityJson.api.dataset
    const sanityProjectDir = path.dirname(sanityJsonFile)

    const migrationsDir = path.join(sanityProjectDir, 'migrations')
    await fs.ensureDir(migrationsDir)
    const availableMigrations = await fs.readdir(migrationsDir)
    availableMigrations.sort()

    const migrationLogFile = path.join(sanityProjectDir, 'migration-log.json')
    const migrationLog = fs.existsSync(migrationLogFile)
      ? await fs.readJSON(migrationLogFile) as TSanityMigrationLog
      : {}

    if (!migrationLog?.[dataset]) {
      migrationLog[dataset] = {}
    }

    const migrationTimestamp = Object.values(migrationLog[dataset])
    migrationTimestamp.sort((a, b) => a < b ? 1 : -1)
    const lastMigrationTs = migrationTimestamp?.[0] ?? null

    const migrationsToRun = availableMigrations.filter(migration => (
      !migrationLog?.[dataset]?.[path.basename(migration, '.js')]
    ))

    const client = new SanityClient({
      useCdn: false,
      apiVersion: '2022-02-11',
      projectId: sanityJson.api.projectId,
      dataset: sanityJson.api.dataset,
      token: sanityToken,
    })

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: [
          `\nProject: ${sanityJson.api.projectId}`,
          `Dataset: ${sanityJson.api.dataset}`,
          `Migrations:\n${[
            migrationsToRun.map(v => `  ${v}`),
          ].join('\n')}\n`
        ].join('\n')
      }
    ])

    if (!confirm) {
      return
    }

    for (const migration of migrationsToRun) {
      const spinner = ora({
        text: `Running migration [${migration}]`,
        color: 'red',
      }).start()
      const mod: TMigrationModule = await import(path.join(sanityProjectDir, 'migrations', migration))
      await mod.default(client, {
        lastMigrationTs,
      })
      migrationLog[dataset][path.basename(migration, '.js')] = Math.floor(new Date().getTime() / 1000)
      await fs.writeJSON(path.join(sanityProjectDir, 'migration-log.json'), migrationLog, {
        spaces: 2,
      })
      spinner.stop()
    }
  })
program.parse();

export {
  TMigrationModule
}
