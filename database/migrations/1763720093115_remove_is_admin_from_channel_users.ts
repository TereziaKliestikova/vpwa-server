import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'remove_is_admin_from_channel_users'

  public async up () {
    this.schema.alterTable('channel_users', (table) => {
      table.dropColumn('is_admin')
    })
  }

  public async down () {
    this.schema.alterTable('channel_users', (table) => {
      table.boolean('is_admin').defaultTo(false)
    })
  }
}


//musis si Ivka dat node ace migration:run
//potom aj seed samozrejme