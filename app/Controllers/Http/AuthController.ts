import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import RegisterUserValidator from 'App/Validators/RegisterUserValidator'

export default class AuthController {
  public async register({ request, response }: HttpContextContract) {
    try {
    const data = await request.validate(RegisterUserValidator)
    const user = await User.create(data)

    return response.created({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    })
  } catch (error) {
    // Ak je to validácia → 400 s chybami
    if (error.messages) {
      return response.badRequest({
        errors: Object.values(error.messages).flat(), // ← plochý zoznam chýb
      })
    }

    // Iné chyby
    console.error('Register error:', error)
    return response.internalServerError({
      errors: [{ message: 'Server error' }],
    })
  }
  }

async login({ auth, request, response }: HttpContextContract) {
  const email = request.input('email')
  const password = request.input('password')

  try {
    const token = await auth.use('api').attempt(email, password)
    return token
  } catch (err) {
    // Tu vieme rozlíšiť neexistujúceho usera vs zlé heslo
    return response.status(400).send({
      errors: [
        {
          message: 'Invalid email or password'
        }
      ]
    })
  }
}


  async logout({ auth }: HttpContextContract) {
    return auth.use('api').logout()
  }

  async me({ auth }: HttpContextContract) {
    await auth.user!.load('channels')
    return auth.user
  }

  public async validateNicknames({ request, response }: HttpContextContract) {
    const { nicknames } = request.only(['nicknames'])
    
    if (!nicknames || nicknames.length === 0) {
      return response.json({ invalidNicknames: [] })
    }

    const invalidNicknames: string[] = []

    for (const nickname of nicknames) {
      const user = await User.query().where('nickname', nickname).first()
      if (!user) {
        invalidNicknames.push(nickname)
      }
    }

    return response.json({ invalidNicknames })
}
}