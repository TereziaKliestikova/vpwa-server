import BaseSeeder from '@ioc:Adonis/Lucid/Seeder';
import UserSeeder from './UserSeeder'
import ChannelSeeder from './ChannelSeeder'

export default class MainSeeder extends BaseSeeder {
  public async run() {
    // 1. Spusti UserSeeder
    const userSeeder = new UserSeeder(this.client)
    await userSeeder.run()

    // 2. Spusti ChannelSeeder
    const channelSeeder = new ChannelSeeder(this.client)
    await channelSeeder.run()
  }
}