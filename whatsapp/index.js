require('dotenv').config();
const { webcrypto } = require('node:crypto');
if (!global.crypto) global.crypto = webcrypto;

const fs = require('fs-extra');
const path = require('path');
const qrcode = require('qrcode'); // alterado
const mime = require('mime-types');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const agent = require('../agent/agent'); // << CÉREBRO IA

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.toDataURL(qr, (err, url) => {
        if (err) {
          console.error('Erro ao gerar QR Code:', err);
          return;
        }

        const html = `
          <html>
            <body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#111">
              <img src="${url}" alt="QR Code do WhatsApp" />
            </body>
          </html>
        `;

        const filePath = path.join(__dirname, 'qrcode.html');
        fs.writeFileSync(filePath, html);
        console.log("🌐 Abrindo QR Code no navegador...");
        require('child_process').exec(`start ${filePath}`);
      });
    }

    if (connection === 'close') {
      const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔁 Reconectando...', lastDisconnect?.error);
      if (shouldReconnect) startSock();
    } else if (connection === 'open') {
      console.log('✅ Conectado com sucesso ao WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;

    const verificarAutorizacao = require('../tools/verificarAutorizacao'); // novo

    const numero = msg.key.remoteJid.replace('@s.whatsapp.net', '');
    const autorizado = await verificarAutorizacao(numero);
    
    if (!autorizado) {
      console.log(`❌ Número não autorizado: ${numero}`);
      await sock.sendMessage(sender, { text: "🚫 Este número não está autorizado a usar o assistente AutoWork IA. Para liberar o uso, adquira sua licença." });
      return;
    }

    let texto = '';
    if (msg.message.conversation) {
      texto = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
      texto = msg.message.extendedTextMessage.text;
    } else if (msg.message.imageMessage?.caption) {
      texto = msg.message.imageMessage.caption;
    }

    if (!texto.trim()) {
      console.log(`📭 Mensagem sem texto de ${sender}`);
      return;
    }

    console.log(`🤖 Mensagem recebida de ${sender}: ${texto}`);
    await sock.sendPresenceUpdate('composing', sender);

    try {
      const numero = msg.key.remoteJid.replace('@s.whatsapp.net', '');
      const resposta = await agent(texto, [], numero);

      if (typeof resposta === 'string') {
        await sock.sendMessage(sender, { text: resposta });
      } else if (resposta?.tipo === 'texto') {
        await sock.sendMessage(sender, { text: resposta.conteudo });
      } else if (resposta?.tipo === 'imagem') {
        for (let imagem of resposta.imagens) {
          const buffer = fs.readFileSync(imagem.caminho);
          const mimeType = mime.lookup(imagem.caminho);
          await sock.sendMessage(sender, {
            image: buffer,
            mimetype: mimeType,
            caption: imagem.legenda
          });
        }
      }

    } catch (error) {
      console.error('Erro no agente:', error.message);
      await sock.sendMessage(sender, { text: '⚠️ Ocorreu um erro interno ao processar sua mensagem.' });
    }
  });
}

startSock();
