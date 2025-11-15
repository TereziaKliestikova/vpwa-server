import { DateTime } from "luxon";
import { BaseModel, column, HasMany, hasMany, ManyToMany, manyToMany } from "@ioc:Adonis/Lucid/Orm";
import Message from "App/Models/Message";
import User from "App/Models/User";

export default class Channel extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public name: string;

  @column()
  public type: 'public' | 'private';

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @hasMany(() => Message, {
    foreignKey: "channelId",
  })
  public messages: HasMany<typeof Message>;

  @manyToMany(() => User, {
    pivotTable: 'channel_users',
    pivotForeignKey: 'channel_id',
    pivotRelatedForeignKey: 'user_id',
    pivotTimestamps: true,
  })
  public members: ManyToMany<typeof User>
}