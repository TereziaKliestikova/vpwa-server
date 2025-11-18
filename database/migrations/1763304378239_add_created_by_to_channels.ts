import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'channels'

  public async up() {
      this.schema.alterTable(this.tableName, (table) => {
        // Pridaj stĺpec created_by
        table
          .integer('created_by')
          .unsigned()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE')
          .after('type') // voliteľné, pre poriadok

        // Nastav predvolenú hodnotu pre existujúce kanály (napr. admin ID = 1)
        // ALEBO použi nullable, ak nechceš
        // table.integer('created_by').unsigned().references('id').inTable('users').nullable()
      })
    }

    public async down() {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('created_by')
      })
    }
  }