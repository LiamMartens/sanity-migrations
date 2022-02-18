# Sanity Migrations
[![NPM](https://badge.fury.io/npm/sanity-migrations-tool.svg)](npmjs.com/package/sanity-migrations-tool)

This is a simple migrations tool for Sanity

## Usage
### Creating a new migration
You can run the following command to generate a new migration. (this should be run inside a Sanity studio project)
`yarn sanity-migrations new my-migration`

A new file will be created in the `migrations` directory in your studio. It will receive 2 arguments. The first one being a raw sanity client to use for your migration, the second one is an options object. At this time the only option is `lastMigrationTs` which contain a unix timestamp of the last run migration. (this is so you could query for documents after this time)

### Running migrations
In your studio project you can run `yarn sanity-migrations migrate` to run the migrations.

The tool will respect your `NODE_ENV` and will use the appropriate dataset as defined in the `env` key of your `sanity.json`.

It will check the `migration-log.json` file to determine which migrations need to be executed. Before actually running the migrations you will be given an overview and asked whether to proceed or not.