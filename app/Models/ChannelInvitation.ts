import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import User from './User'
import Channel from './Channel'

export default class ChannelInvitation extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public channelId: number

  @column()
  public invitedUserId: number

  @column()
  public invitedBy: number

  @column()
  public status: 'pending' | 'accepted' | 'declined' = 'pending'

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Channel)
  public channel: BelongsTo<typeof Channel>

  @belongsTo(() => User, { foreignKey: 'invitedUserId' })
  public invitedUser: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'invitedBy' })
  public inviter: BelongsTo<typeof User>
}