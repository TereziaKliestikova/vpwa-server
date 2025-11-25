import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class ChannelInvitations extends BaseSchema {
  protected tableName = 'channel_invitations'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('channel_id').unsigned().references('channels.id').onDelete('CASCADE')
      table.integer('invited_user_id').unsigned().references('users.id').onDelete('CASCADE')
      table.integer('invited_by').unsigned().references('users.id').onDelete('CASCADE')
      table.enum('status', ['pending', 'accepted', 'declined']).defaultTo('pending')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      table.unique(['channel_id', 'invited_user_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}