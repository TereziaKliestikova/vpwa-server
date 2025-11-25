import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'remove_unique_constraint_from_channel_invitations'

  public async up() {
  this.schema.alterTable('channel_invitations', (table) => {
     // Nahraďte 'channel_invitations_channel_id_invited_user_id_unique'
     // skutočným názvom constraintu v DB, ak bol explicitne pomenovaný.
     // Ak nebol pomenovaný, použite:
     table.dropUnique(['channel_id', 'invited_user_id']) 
  })
}

public async down() {
  // V down metóde ho môžete vrátiť, ak to považujete za nutné
  this.schema.alterTable('channel_invitations', (table) => {
     table.unique(['channel_id', 'invited_user_id'])
  })
}
}
