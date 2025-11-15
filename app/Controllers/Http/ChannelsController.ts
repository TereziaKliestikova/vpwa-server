// app/Controllers/Http/ChannelsController.ts
import Channel from 'App/Models/Channel'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class ChannelsController {
  public async index({ response, auth }: HttpContextContract) {
    // 1. Načítaj kanály s členmi
    const channels = await Channel.query()
    .preload('members', (query) => {
      query.pivotColumns(['is_admin']) // ← Load the is_admin from pivot table
    })

    // 2. Ak je používateľ prihlásený, získaj jeho ID
    const currentUserId = auth.user?.id

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
}