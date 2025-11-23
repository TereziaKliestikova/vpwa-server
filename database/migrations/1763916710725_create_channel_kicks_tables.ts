import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'channel_kicks'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('channel_id').unsigned().references('channels.id').onDelete('CASCADE')
      table.integer('kicked_user_id').unsigned().references('users.id').onDelete('CASCADE')
      table.integer('kicker_user_id').unsigned().references('users.id').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true })
      
      // Prevent same user from voting multiple times
      table.unique(['channel_id', 'kicked_user_id', 'kicker_user_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}