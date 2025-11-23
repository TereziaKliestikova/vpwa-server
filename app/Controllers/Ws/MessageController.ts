// app/Controllers/Ws/MessageController.ts
import type { WsContextContract } from "@ioc:Ruby184/Socket.IO/WsContext";
import type { MessageRepositoryContract } from "@ioc:Repositories/MessageRepository";
import { inject } from "@adonisjs/core/build/standalone";
import Channel from "App/Models/Channel";
// import User from "App/Models/User";

@inject(["Repositories/MessageRepository"])
export default class MessageController {
  constructor(private messageRepository: MessageRepositoryContract) {}
  public async joinChannel({ params, auth, socket }: WsContextContract) {
    const channelName = params.name;
    const user = auth.user!;
    const userId = user.id;
    // const userNickname = user.displayName || user.email.split("@")[0];
    // const userAvatar = user.avatarUrl || "";

    // 1. Nájdi alebo vytvor kanál
    let channel = await Channel.firstOrCreate(
      { name: channelName },
      {
        name: channelName,
        type: "public",
        createdBy: userId,
      }
    );

    // 2. Načítaj členov
    await channel.load("members");

    // 3. Skontroluj, či už bol členom
    const wasAlreadyMember = channel.members.some((m) => m.id === userId);

    // 4. Ak nie je člen → pridaj ho
    if (!wasAlreadyMember) {
      await channel.related("members").attach([userId]);
      await channel.load("members"); // znova načítaj po attach
    }

    // 5. Pripoj socket do roomu
    socket.join(channelName);

    // 6. ✅ EMIT members:update pre VŠETKÝCH (aj nového člena)
    const updatedMembersList = channel.members.map((m) => ({
      id: m.id,
      name: m.displayName || m.nickname || m.email.split("@")[0],
      avatar: m.avatarUrl || "",
    }));

    // ✅ Pošli VŠETKÝM v kanáli (vrátane toho, kto sa práve pridal)
    socket.nsp.to(channelName).emit("members:update", {
      channelId: channel.id,
      members: updatedMembersList,
    });

    // ✅ ODSTRÁŇ member:joined event - nie je potrebný!
    // members:update už obsahuje všetkých členov
    // if (!wasAlreadyMember) { ... } // <-- VYMAŽ CELÝ TENTO BLOK

    console.log(`USER JOINED: ${user.email} → #${channelName} (admin: ${channel.createdBy === userId})`);

    // 7. Vráť info pre frontend
    return {
      success: true,
      channel: channelName,
      channelId: channel.id,
      isAdmin: channel.createdBy === userId,
    };
  }
  // public async joinChannel({ params, auth, socket }: WsContextContract) {
  //   const channelName = params.name;
  //   const user = auth.user!;
  //   const userId = user.id;
  //   const userNickname = user.displayName || user.email.split("@")[0];
  //   const userAvatar = user.avatarUrl || "";

  //   // 1. Nájdi alebo vytvor kanál
  //   let channel = await Channel.firstOrCreate(
  //     { name: channelName },
  //     {
  //       name: channelName,
  //       type: "public",
  //       createdBy: userId,
  //     }
  //   );

  //   // 2. Načítaj členov
  //   await channel.load("members");

  //   // 3. Skontroluj, či už bol členom
  //   const wasAlreadyMember = channel.members.some((m) => m.id === userId);

  //   // 4. Ak nie je člen → pridaj ho
  //   if (!wasAlreadyMember) {
  //     await channel.related("members").attach([userId]);
  //     // Emit fresh members list to everyone in the channel
  //     await channel.load("members"); // znova načítaj po attach
  //     const updatedMembersList = channel.members.map((m) => ({
  //       id: m.id,
  //       name: m.displayName || m.nickname || m.email.split("@")[0],
  //       avatar: m.avatarUrl || "",
  //     }));

  //     socket.nsp.to(channelName).emit("members:update", {
  //       channelId: channel.id,
  //       members: updatedMembersList,
  //     });
  //   }

  //   // 5. Pripoj socket do roomu (používame len channelName ako room)
  //   socket.join(channelName);

  //   // 6. Pošli aktuálny zoznam členov iba novopripojenému
  //   const membersList = channel.members.map((m) => ({
  //     id: m.id,
  //     name: m.displayName || m.nickname || m.email.split("@")[0],
  //     avatar: m.avatarUrl || "",
  //   }));

  //   socket.emit("members:list", membersList);

  //   // 7. Ak je to NOVÝ člen → oznám všetkým (vrátane seba)
  //   if (!wasAlreadyMember) {
  //     const joinPayload = {
  //       userId,
  //       nickname: userNickname,
  //       avatar: userAvatar,
  //       channelName,
  //       channelId: channel.id,
  //       isAdmin: channel.createdBy === userId,
  //     };

  //     // Broadcast všetkým v kanáli (vrátane odosielateľa)
  //     socket.to(channelName).emit("member:joined", joinPayload);
  //   }

  //   console.log(`USER JOINED: ${user.email} → #${channelName} (admin: ${channel.createdBy === userId})`);

  //   // 8. Vráť info pre frontend (napr. isAdmin)
  //   return {
  //     success: true,
  //     channel: channelName,
  //     channelId: channel.id,
  //     isAdmin: channel.createdBy === userId,
  //   };
  // }

  public async loadMessages({ params, auth }: WsContextContract) {
    const channelName = params.name;
    const userId = auth.user!.id;

    const channel = await Channel.query()
      .where("name", channelName)
      .whereHas("members", (q) => q.where("users.id", userId))
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
    const channelName = params.name;
    const userId = auth.user!.id;

    // Over, či je členom
    const channel = await Channel.query()
      .where("name", channelName)
      .whereHas("members", (q) => q.where("users.id", userId))
      .firstOrFail();

    // Zabezpeč, že je v roome
    socket.join(channelName);

    // Vytvor správu
    const message = await this.messageRepository.create(channelName, userId, content);

    // Pošli všetkým v kanáli
    socket.nsp.to(channelName).emit("message", message);

    return message;
  }

  // NOVÁ METÓDA: leaveChannel
  public async leaveChannel({ socket, params, auth }: WsContextContract) {
    const channelName = params.name;
    const user = auth.user!;

    const channel = await Channel.findByOrFail("name", channelName);
    
    // ✅ NAJPRV disconnect socket
    socket.leave(channelName);
    
    // ✅ POTOM detach user
    await channel.related("members").detach([user.id]);
    await channel.load("members");

    // ✅ Emit members:update PRED member:left
    const updatedMembersList = channel.members.map((m) => ({
      id: m.id,
      name: m.displayName || m.nickname || m.email.split("@")[0],
      avatar: m.avatarUrl || "",
    }));

    socket.nsp.to(channelName).emit("members:update", {
      channelId: channel.id,
      members: updatedMembersList,
    });

    // ✅ POTOM emit member:left
    socket.nsp.to(channelName).emit("member:left", {
      userId: user.id,
      nickname: user.displayName || user.email.split("@")[0],
      avatar: user.avatarUrl || "",
      channelName,
    });

    console.log(`USER LEFT via socket: ${user.email} → #${channelName}`);
    
    // ✅ Vráť success
    return { success: true };   

  }
}