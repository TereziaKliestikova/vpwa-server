// database/seeders/UserSeeder.ts
import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import User from 'App/Models/User'

export default class UserSeeder extends BaseSeeder {
  public async run() {
    const users = [
      {
        email: 'milan@example.com',
        password: 'Ahoj123.',
        firstName: 'Milan',
        lastName: 'Kováč',
        nickname: 'Milan',
      },
      {
        email: 'katka@example.com',
        password: 'Ahoj123.',
        firstName: 'Katarína',
        lastName: 'Nováková',
        nickname: 'Katka',
      },
      {
        email: 'tomas@example.com',
        password: 'Ahoj123.',
        firstName: 'Tomáš',
        lastName: 'Horváth',
        nickname: 'Tomas',
      },
      {
        email: 'you@example.com',
        password: 'Ahoj123.',
        firstName: 'Ty',
        lastName: 'Používateľ',
        nickname: 'You',
      },
    ]

    for (const userData of users) {
      await User.updateOrCreate(
        { email: userData.email },
        {
          ...userData,
          password: userData.password, // ← keep it plain, let model hash it
        }
      )
    }

    console.log('Users seeded (or already exist) successfully!')
  }
}