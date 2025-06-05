require('dotenv').config();
const { webcrypto } = require('node:crypto');
if (!global.crypto) global.crypto = webcrypto;

const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const QRCode = require('qrcode');
const express = require('express');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

// Planner LLM
const { decidir } = require('../agent/planner/routerLLM');
const { skillsMap } = require('../agent/skills');

// ✅ Set para rastrear mensagens já processadas
const mensagensProcessadas = new Set();
setInterval(() => mensagensProcessadas.clear(), 10 * 60 * 1000);

// 🔥 NOVO: Memória de contexto por usuário
const sessions = {};

// Servidor Express para expor QR Code (Railway/produção)
const app = express();
app.use(express.static('public'));
app.listen(3000, () => console.log('🌐 Servidor web rodando em http://localhost:3000'));

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // QR não vai pro terminal, só pro PNG/web
    markOnlineOnConnect: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      const qrPath = path.join(__dirname, '../public/qrcode.png');
      try {
        await QRCode.toFile(qrPath, qr);
        console.log('\n✅ QR Code gerado!');
        console.log('👉 Acesse o link: http://localhost:3000/qrcode.png\n');
      } catch (err) {
        console.error('❌ Erro ao gerar QR Code:', err);
      }
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
    const numero = sender.replace('@s.whatsapp.net', '');

    // Extrai texto
    let texto = '';
    if (msg.message.conversation) {
      texto = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
      texto = msg.message.extendedTextMessage.text;
    } else if (msg.message.imageMessage?.caption) {
      texto = msg.message.imageMessage.caption;
    }

    const msgId = msg.key.id;
    if (mensagensProcessadas.has(msgId)) {
      console.log(`🔁 Mensagem duplicada ignorada: ${msgId}`);
      return;
    }
    mensagensProcessadas.add(msgId);

    const verificarAutorizacao = require('../tools/verificarAutorizacao');
    const autorizado = await verificarAutorizacao(numero);

    if (!autorizado) {
      console.log(`❌ Número não autorizado: ${numero}`);
      await sock.sendMessage(sender, {
        text: "🚫 Este número não está autorizado a usar o assistente AutoWork IA. Para liberar o uso, adquira sua licença."
      });
      return;
    }

    if (!texto.trim()) {
      console.log(`📭 Mensagem sem texto de ${sender}`);
      return;
    }

    console.log(`🤖 Mensagem recebida de ${sender}: ${texto}`);
    await sock.sendPresenceUpdate('composing', sender);

    try {
      const { skill, args } = await decidir(texto);
      let resposta;
      try {
        resposta = await skillsMap[skill].exec(args, { user_id: msg.key.remoteJid });
      } catch (e) {
        console.error(e);
        resposta = '❌ Ocorreu um erro interno. Tente novamente.';
      }
      await sock.sendMessage(sender, { text: resposta }, { quoted: msg });
    } catch (error) {
      console.error('Erro no planner:', error.message);
      await sock.sendMessage(sender, { text: '⚠️ Ocorreu um erro interno ao processar sua mensagem.' });
    }
  });
}

startSock();
