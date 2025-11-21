// app/Controllers/Http/ChannelsController.ts
import Channel from 'App/Models/Channel'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

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
  // Get ALL channels from DB (no filtering by membership)
    const channels = await Channel.query()
      .preload('members', (query) => {
        query.pivotColumns(['is_admin'])
      })

    return response.json(
      channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
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
}