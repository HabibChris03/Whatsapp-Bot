const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Store conversations to maintain context
const conversations = new Map();

// Auto-reply configuration
const autoReplyConfig = {
  enabled: true,
  greetingMessage: "👋 Hello! Thanks for reaching out. I'm currently unavailable, but I'll get back to you as soon as possible.",
  followUpQuestions: [
    "In the meantime, could you let me know what you'd like to discuss?",
    "Feel free to share any details about your inquiry, and I'll respond when I'm back.",
    "If it's urgent, please leave a brief message about the nature of your request."
  ],
  responses: {
    'help': "I can help you with general inquiries. Please describe what you need assistance with.",
    'hello': "Hello! Thanks for your message. I'll respond when I'm available.",
    'urgent': "I understand this is urgent. I'll prioritize your message and get back to you ASAP.",
    'default': "Thank you for your message. I'll get back to you as soon as I'm available."
  }
};

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Generate QR code for authentication
client.on('qr', (qr) => {
  console.log('Scan this QR code with your WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// When client is ready
client.on('ready', () => {
  console.log('🤖 WhatsApp Bot is ready!');
  console.log('Bot is now listening for new messages...');
});

// Function to detect if message is from new contact
function isNewContact(message) {
  // Check if we have previous conversation with this number
  return !conversations.has(message.from);
}

// Function to handle new contact messages
async function handleNewContact(message) {
  const contact = await message.getContact();
  const contactName = contact.name || contact.pushname || 'there';
  
  console.log(`📱 New contact: ${contactName} (${message.from})`);
  
  // Store conversation
  conversations.set(message.from, {
    name: contactName,
    messageCount: 1,
    lastMessage: message.body,
    timestamp: new Date()
  });
  
  // Send a greeting and follow-up questions
  const greeting = `${autoReplyConfig.greetingMessage}\n\n${autoReplyConfig.followUpQuestions.join('\n')}`;
  
  await message.reply(greeting);
  console.log(`✅ Sent auto-reply to ${contactName}`);
}

// Function to handle ongoing conversations
async function handleOngoingConversation(message) {
  const conversation = conversations.get(message.from);
  const contactName = conversation.name;
  //update conversation details
  conversation.messageCount++;
  conversation.lastMessage = message.body;
  conversation.timestamp = new Date();
  
  console.log(`💬 Ongoing conversation with ${contactName}: ${message.body.substring(0, 50)}...`);
  
  //To Analyze message content and send appropriate response
  const messageLower = message.body.toLowerCase();
  
  let response = autoReplyConfig.responses.default;
  
  if (messageLower.includes('help') || messageLower.includes('assist')) {
    response = autoReplyConfig.responses.help;
  } else if (messageLower.includes('hello') || messageLower.includes('hi')) {
    response = autoReplyConfig.responses.hello;
  } else if (messageLower.includes('urgent') || messageLower.includes('emergency')) {
    response = autoReplyConfig.responses.urgent;
  }
  
  // Add some variation to responses
  const variations = [
    "I'll make sure to check this when I'm back.",
    "Thanks for sharing this information.",
    "I appreciate you reaching out."
  ];
  
  const randomVariation = variations[Math.floor(Math.random() * variations.length)];
  const finalResponse = `${response} ${randomVariation}`;
  
  await message.reply(finalResponse);
}

// Handle incoming messages
client.on('message', async (message) => {
  // Ignore messages from groups and status messages
  if (message.from === 'status@broadcast' || message.isGroup) return;
  
  // Ignore messages sent by the bot itself
  if (message.fromMe) return;
  
  // Check if auto-reply is enabled
  if (!autoReplyConfig.enabled) return;
  
  try {
    if (isNewContact(message)) {
      await handleNewContact(message);
    } else {
      await handleOngoingConversation(message);
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
  console.log('🔌 Client was logged out:', reason);
});

client.initialize();

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down bot...');
  await client.destroy();
  process.exit(0);
});