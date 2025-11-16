import type { WsContextContract } from "@ioc:Ruby184/Socket.IO/WsContext";
import type { MessageRepositoryContract } from "@ioc:Repositories/MessageRepository";
import { inject } from "@adonisjs/core/build/standalone";
import Channel from "App/Models/Channel";

@inject(["Repositories/MessageRepository"])
export default class MessageController {
  constructor(private messageRepository: MessageRepositoryContract) {}

  public async joinChannel({ params, auth, socket }: WsContextContract) {
    const channelName = params.name
    const userId = auth.user!.id

    // NAJDI ALEBO VYTVOŘ KANÁL
    let channel = await Channel.firstOrCreate(
        { name: channelName },
        {
        name: channelName,
        type: 'public',
        createdBy: userId,
        }
    )

    // SKONTROLUJ, ČI UŽ JE ČLENOM (použi users.id!)
    const isMember = await channel
        .related('members')
        .query()
        .where('users.id', userId)  // ← SPRÁVNE!
        .first()

    if (!isMember) {
        await channel.related('members').attach([userId])
    }

    socket.join(channelName)

    console.log('USER JOINED:', auth.user!.email, '→', channelName, '(admin:', channel.createdBy === userId, ')')
    
    return { success: true, channel: channelName, isAdmin: channel.createdBy === userId }
    }


  public async loadMessages({ params, auth }: WsContextContract) {
    const channelName = params.name;
    const userId = auth.user!.id;

    // SKONTROLUJ ČLENSTVO
    const channel = await Channel.query()
      .where("name", channelName)
      .whereHas('members', (q) => q.where('users.id', userId))  
      .first();

    if (!channel) {
      throw new Error("You are not a member of this channel");
    }

    return this.messageRepository.getAll(channelName);
  }

  public async addMessage(
    { params, socket, auth }: WsContextContract,
    content: string
  ) {
    console.log("ADD_MESSAGE:", {
    channel: params.name,
    userId: auth.user!.id,
    content,
    socketId: socket.id,
    });
    const channelName = params.name;
    const userId = auth.user!.id;

    // SKONTROLUJ ČLENSTVO
    const channel = await Channel.query()
      .where("name", channelName)
      .whereHas("members", (q) => q.where("users.id", userId))
      .firstOrFail();

    // PRIpoj do room (ak ešte nie je)
    socket.join(channelName);

    // Vytvor správu
    const message = await this.messageRepository.create(
      channelName,
      userId,
      content
    );
    console.log("SAVED & BROADCAST:", message);

    // POŠLI VŠETKÝM V KANÁLI (vrátane odosielateľa)
    socket.nsp.to(channelName).emit("message", message);

    return message;
  }
}