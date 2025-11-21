// app/Controllers/Http/ChannelsController.ts
import Channel from 'App/Models/Channel'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class ChannelsController {
  public async index({ response, auth }: HttpContextContract) {
    // 2. Ak je používateľ prihlásený, získaj jeho ID
    const currentUserId = auth.user?.id
    
    if (!currentUserId) {
      return response.unauthorized({ error: 'Not authenticated' })
   }

    // 1. Načítaj kanály s členmi
    const channels = await Channel.query()
    .whereHas('members', (query) => {
      query.where('user_id', currentUserId) // ← Add this filter
    })
    .preload('members', (query) => {
      query.pivotColumns(['is_admin'])
    })

    // 3. Mapuj na frontend formát
    return response.json(
      channels.map((ch) => {
        // Map members with their admin status
        const members = ch.members.map((m) => {
          const isAdmin = m.$extras.pivot_is_admin === true
          return {
            id: m.id,
            name: m.displayName,
            avatar: m.avatarUrl,
            isAdmin, // ← per member
          }
        })

        // Check if CURRENT user is admin of this channel
        const currentUserMember = ch.members.find(m => m.id === currentUserId)
        const isCurrentUserAdmin = currentUserMember?.$extras.pivot_is_admin === true || false

        return {
          id: ch.id,
          name: ch.name,
          type: ch.type,
          members,
          isAdmin: isCurrentUserAdmin, // ← for current user only
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

    // Add creator as admin
    await channel.related('members').attach({
      [currentUserId]: { is_admin: true }
    })

    // Add other members (not admins)
    if (memberIds && memberIds.length > 0) {
      const membersToAdd = memberIds.reduce((acc: any, id: number) => {
        acc[id] = { is_admin: false }
        return acc
      }, {})
      await channel.related('members').attach(membersToAdd)
    }

    // Load members and return
    await channel.load('members', (query) => {
      query.pivotColumns(['is_admin'])
    })

    const members = channel.members.map((m) => ({
      id: m.id,
      name: m.displayName,
      avatar: m.avatarUrl,
      isAdmin: m.$extras.pivot_is_admin === true,
    }))

    return response.created({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      members,
      isAdmin: true,
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
}