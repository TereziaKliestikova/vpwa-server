/*
|--------------------------------------------------------------------------
| Websocket events
|--------------------------------------------------------------------------
|
| This file is dedicated for defining websocket namespaces and event handlers.
|
*/

import Ws from '@ioc:Ruby184/Socket.IO/Ws'

// this is dynamic namespace, in controller methods we can use params.name
// start/wsKernel.ts
Ws.namespace('channels/:name')
  // .middleware('auth')
  .on('joinChannel', 'MessageController.joinChannel')
  .on('loadMessages', 'MessageController.loadMessages')
  .on('addMessage', 'MessageController.addMessage')
  .on('leaveChannel', 'MessageController.leaveChannel')
  .on('inviteUsers', 'MessageController.inviteUsers')          
  .on('revokeUser', 'MessageController.revokeUser')             
  .on('acceptInvitation', 'MessageController.acceptInvitation')
  .on('declineInvitation', 'MessageController.declineInvitation')
  .on('getInvitations', 'MessageController.getInvitations')
  // .on("deleteChannel", "MessageController.deleteChannel"); 
  .on('checkBanStatus', 'MessageController.checkBanStatus')