import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import User from './User'
import Channel from './Channel'

export default class ChannelKick extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public channelId: number

  @column()
  public kickedUserId: number

  @column()
  public kickerUserId: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @belongsTo(() => Channel)
  public channel: BelongsTo<typeof Channel>

  @belongsTo(() => User, { foreignKey: 'kickedUserId' })
  public kickedUser: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'kickerUserId' })
  public kickerUser: BelongsTo<typeof User>
}