import Channel from 'App/Models/Channel';

export default class ChannelsController {
    public async index({ response }) {
    try {
      const channels = await Channel.all()
      return response.json(channels)
    } catch (error) {
      console.error('Error fetching channels:', error)
      return response.status(500).json({ message: 'Failed to fetch channels' })
    }
  }
  //tu bude metody pre novy channel
}