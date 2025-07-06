async function handleProviders(bot, chatId, messageId) {
  const providers = `🏢 Rekomendasi Provider VPS Support KVM:

✅ Provider Lokal:
- Nevacloud
- Flaz VPS
- Warnahost
- OrangeVPS
- Jetorbit
- IDE
- Natanetwork
- RumahWeb
- Biznet Neo Virtual Compute
- Datalix

✅ Provider International:
- LightNode
- Kuroit
- OVH Cloud
- Crunchbits
- Digitalocean
- Hosthatch
- Hetzner
- DedicatedCore
- GreenCloud
- AkileCloud
- Ultahost
- ByteVirt
- Datawagon
- Avoro
- Atlantic
- Vebble`;

  await bot.editMessageText(providers, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '« Kembali', callback_data: 'back_to_menu' }
      ]]
    }
  });
}

module.exports = {
  handleProviders
};