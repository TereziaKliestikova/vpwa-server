import BaseSeeder from '@ioc:Adonis/Lucid/Seeder';
import Channel from 'App/Models/Channel'
import User from 'App/Models/User'

export default class ChannelSeeder extends BaseSeeder {
  public async run() {
    // 1. Načítaj používateľov
    const milan = await User.query().where('email', 'milan@example.com').first()
    const katka = await User.query().where('email', 'katka@example.com').first()
    const tomas = await User.query().where('email', 'tomas@example.com').first()
    const you = await User.query().where('email', 'you@example.com').first()

    if (!milan || !katka || !tomas || !you) {
      throw new Error('Required seed users not found: ensure milan@example.com, katka@example.com, tomas@example.com and you@example.com exist before running this seeder')
    }

    // 2. Vytvor kanály
    const general = await Channel.firstOrCreate({
      name: 'General',
      type: 'public',
    })

    const unilife = await Channel.firstOrCreate({
      name: 'UniLife',
      type: 'private',
    })

    const attachIfNotExists = async (channel: Channel, userId: number, extras = {}) => {
      const pivot = await channel.related('members').query().where('user_id', userId).first()
      if (!pivot) {
        await channel.related('members').attach({ [userId]: extras })
      }
    }

    // General
    await attachIfNotExists(general, milan.id, { is_admin: true })
    await attachIfNotExists(general, katka.id, { is_admin: false })
    await attachIfNotExists(general, tomas.id, { is_admin: false })
    await attachIfNotExists(general, you.id, { is_admin: true })

    // UniLife
    await attachIfNotExists(unilife, milan.id, { is_admin: true })
    await attachIfNotExists(unilife, you.id, { is_admin: true })

    console.log('Channels and members seeded successfully!')
  }
}