// app/Controllers/Http/ChannelsController.ts
import Channel from 'App/Models/Channel'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Ws from '@ioc:Ruby184/Socket.IO/Ws'
import User from 'App/Models/User'
import ChannelKick from 'App/Models/ChannelKick'
import ChannelBan from 'App/Models/ChannelBan'

export default class ChannelsController {
  public async index({ response, auth }: HttpContextContract) {
    const currentUserId = auth.user?.id
    if (!currentUserId) {
      return response.unauthorized({ error: 'Not authenticated' })
    }

    const channels = await Channel.query()
      .whereHas('members', (query) => {
        query.where('user_id', currentUserId)
      })
      .preload('members')

    return response.json(
      channels.map((ch) => {
        const members = ch.members.map((m) => ({
          id: m.id,
          name: m.displayName,
          avatar: m.avatarUrl,
        }))

        // Check if CURRENT user is the creator (admin)
        const isCurrentUserAdmin = ch.createdBy === currentUserId

        return {
          id: ch.id,
          name: ch.name,
          type: ch.type,
          createdBy: ch.createdBy,
          members,
          isAdmin: isCurrentUserAdmin,
        }
      })
    )
  }

  public async create({ request, response, auth }: HttpContextContract) {
    const { name, type, memberIds } = request.only(['name', 'type', 'memberIds'])
    const currentUserId = auth.user?.id
    if (!currentUserId) {
      return response.unauthorized({ error: 'Not authenticated' })
    }

    // Create channel
    const channel = await Channel.create({
      name,
      type: type || 'public',
      createdBy: currentUserId,
    })

    // Add creator as member (no is_admin column needed)
    await channel.related('members').attach([currentUserId])

    // Add other members
    if (memberIds && memberIds.length > 0) {
      await channel.related('members').attach(memberIds)
    }

    // Load members and return
    await channel.load('members')

    const members = channel.members.map((m) => ({
      id: m.id,
      name: m.displayName,
      avatar: m.avatarUrl,
    }))

    return response.created({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      createdBy: channel.createdBy,
      members,
      isAdmin: true, // Creator is always admin
    })
  }

  //vrati vseetky channels z databazy, nie iba ktorych je clenom
  public async all({ response }: HttpContextContract) {
    const channels = await Channel.query()
      .preload('members') // len počet členov, žiadne pivot stĺpce!

    return response.json(
      channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type as 'public' | 'private',
        memberCount: ch.members.length,
      }))
    )
  }

  public async destroy({ params, response, auth }: HttpContextContract) {
    const currentUserId = auth.user?.id
    if (!currentUserId) {
      return response.unauthorized({ error: 'Not authenticated' })
    }

    const channel = await Channel.find(params.id)
    
    if (!channel) {
      return response.notFound({ error: 'Channel not found' })
    }

    // Only creator can delete
    if (channel.createdBy !== currentUserId) {
      return response.forbidden({ error: 'Only the channel creator can delete it' })
    }

    await channel.delete()
    
    return response.ok({ message: 'Channel deleted successfully' })
  }

  public async leave({ params, response, auth }: HttpContextContract) {
    const userId = auth.user!.id
    const channel = await Channel.find(params.id)
    if (!channel) return response.notFound()

    await channel.load('members')

    await channel.related('members').detach([userId])
    await channel.load('members')

    const leavingUser = await User.find(userId)

    // ✅ Emit member:left
    Ws.io.to(channel.name).emit('member:left', {
      userId,
      nickname: leavingUser?.displayName || leavingUser?.email.split('@')[0],
      avatar: leavingUser?.avatarUrl || '',
      channelName: channel.name,
    })

    // ✅ Emit members:update
    const updatedMembersList = channel.members.map((m) => ({
      id: m.id,
      name: m.displayName || m.nickname || m.email.split('@')[0],
      avatar: m.avatarUrl || '',
    }))

    Ws.io.to(channel.name).emit('members:update', {
      channelId: channel.id,
      members: updatedMembersList,
    })

    // ✅ Ak je posledný člen, zmaž kanál
    if (channel.members.length === 0) {
      const channelName = channel.name
      await channel.delete()

      Ws.io.to(channelName).emit('channel:deleted', {
        channelId: channel.id,
        channelName,
      })

      return response.ok({ deleted: true, message: 'Last member left -> channel deleted' })
    }

    return response.ok({ deleted: false })
  }

  public async kick({ params, request, response, auth }: HttpContextContract) {
  const currentUserId = auth.user?.id
  if (!currentUserId) {
    return response.unauthorized({ error: 'Not authenticated' })
  }

  const channelId = params.id
  const { nickname } = request.only(['nickname'])

  if (!nickname) {
    return response.badRequest({ error: 'Nickname is required' })
  }

  // Load channel
  const channel = await Channel.find(channelId)
  if (!channel) {
    return response.notFound({ error: 'Channel not found' })
  }

  // Check if channel is public
  if (channel.type !== 'public') {
    return response.forbidden({ error: 'Kick voting only works in public channels' })
  }

  // Find user to kick by nickname
  const userToKick = await User.query().where('nickname', nickname).first()
  if (!userToKick) {
    return response.notFound({ error: 'User not found' })
  }

  // Can't kick yourself
  if (userToKick.id === currentUserId) {
    return response.badRequest({ error: 'You cannot kick yourself' })
  }

  // Check if user is member of channel
  await channel.load('members')
  const isMember = channel.members.some(m => m.id === userToKick.id)
  if (!isMember) {
    return response.badRequest({ error: 'User is not a member of this channel' })
  }

  // Check if current user is admin
  const isAdmin = channel.createdBy === currentUserId

  if (isAdmin) {
    // Admin kick = instant ban
    // Check if already banned
    const existingBan = await ChannelBan.query()
      .where('channel_id', channelId)
      .where('user_id', userToKick.id)
      .first()

    if (existingBan) {
      return response.badRequest({ error: 'User is already banned' })
    }

    // Create ban
    await ChannelBan.create({
      channelId,
      userId: userToKick.id,
      bannedBy: currentUserId,
    })

    // Remove from channel members
    await channel.related('members').detach([userToKick.id])

    // Emit WebSocket event so its dynamic
    const Ws = (await import('@ioc:Ruby184/Socket.IO/Ws')).default
      Ws.io.to(`channels:${channel.name}`).emit('user:kicked', {
        userId: userToKick.id,
        nickname: userToKick.nickname,
        displayName: userToKick.displayName,
        bannedBy: isAdmin ? auth.user?.nickname : 'vote',
        isAdmin: isAdmin,
      })

    return response.ok({ 
      message: `${userToKick.displayName} has been banned from the channel`,
      banned: true
    })
  }

  // Non-admin kick = vote
  // Check if already voted
  const existingVote = await ChannelKick.query()
    .where('channel_id', channelId)
    .where('kicked_user_id', userToKick.id)
    .where('kicker_user_id', currentUserId)
    .first()

  if (existingVote) {
    return response.badRequest({ error: 'You already voted to kick this user' })
  }

  // Add vote
  await ChannelKick.create({
    channelId,
    kickedUserId: userToKick.id,
    kickerUserId: currentUserId,
  })

  // Count total votes
  const voteCount = await ChannelKick.query()
    .where('channel_id', channelId)
    .where('kicked_user_id', userToKick.id)
    .count('* as total')

  const votes = voteCount[0].$extras.total

  // If 3+ votes, ban the user
  if (votes >= 3) {
    await ChannelBan.create({
      channelId,
      userId: userToKick.id,
      bannedBy: null, // Vote-based ban
    })

    // Remove from channel members
    await channel.related('members').detach([userToKick.id])

    // Emit WebSocket event so its dynamic
    const Ws = (await import('@ioc:Ruby184/Socket.IO/Ws')).default
    Ws.io.to(`channels:${channel.name}`).emit('user:kicked', {
      userId: userToKick.id,
      nickname: userToKick.nickname,
      displayName: userToKick.displayName,
      bannedBy: isAdmin ? auth.user?.nickname : 'vote',
      isAdmin: isAdmin,
    })

    return response.ok({ 
      message: `${userToKick.displayName} has been banned (${votes} votes)`,
      banned: true,
      votes
    })
  }

  return response.ok({ 
    message: `Vote recorded (${votes}/3 votes to ban)`,
    banned: false,
    votes
  })
}
}