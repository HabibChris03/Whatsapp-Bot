const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppBot {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    
    this.conversations = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('qr', (qr) => {
      console.log('Scan this QR code with your WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('🤖 Advanced WhatsApp Bot is ready!');
      this.showBotStatus();
    });

    this.client.on('message', this.handleMessage.bind(this));
  }

  async handleMessage(message) {
    if (this.shouldIgnoreMessage(message)) return;

    try {
      const contact = await message.getContact();
      const isNew = !this.conversations.has(message.from);
      
      if (isNew) {
        await this.handleNewContact(message, contact);
      } else {
        await this.handleExistingContact(message, contact);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  shouldIgnoreMessage(message) {
    return message.from === 'status@broadcast' || 
           message.isGroup || 
           message.fromMe;
  }

  async handleNewContact(message, contact) {
    const contactName = contact.name || contact.pushname || 'there';
    
    this.conversations.set(message.from, {
      name: contactName,
      messageCount: 1,
      messages: [message.body],
      firstContact: new Date(),
      lastActivity: new Date()
    });

    const welcomeMessage = this.generateWelcomeMessage(contactName);
    await message.reply(welcomeMessage);
    
    console.log(`👋 Welcomed new contact: ${contactName}`);
  }

  async handleExistingContact(message, contact) {
    const conversation = this.conversations.get(message.from);
    conversation.messageCount++;
    conversation.messages.push(message.body);
    conversation.lastActivity = new Date();

    const response = await this.generateResponse(message.body, conversation);
    await message.reply(response);
    
    console.log(`💬 Responded to ${conversation.name}`);
  }

  generateWelcomeMessage(contactName) {
    const greetings = [
      `👋 Hello ${contactName}! Thanks for reaching out.`,
      `🤖 Hi ${contactName}! I'm currently away from my phone.`,
      `✨ Welcome ${contactName}! I'll get back to you soon.`
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    const mainMessage = `
I'm currently unavailable, but I'll respond as soon as possible.

In the meantime, feel free to:
• Share details about your inquiry
• Let me know if it's urgent
• Ask any questions you might have

I'll make sure to address everything when I'm back!`;
    
    return `${greeting}${mainMessage}`;
  }

  async generateResponse(message, conversation) {
    const messageLower = message.toLowerCase();
    
    // Response templates
    const templates = {
      greeting: [
        "Thanks for your message! I'll respond when I'm available.",
        "I appreciate you reaching out. I'll get back to you soon.",
        "Hello! I've received your message and will reply shortly."
      ],
      question: [
        "That's a good question. I'll provide a detailed answer when I'm back.",
        "I'll make sure to address your question as soon as I return.",
        "Thanks for asking! I'll get back to you with more information."
      ],
      urgent: [
        "I understand this is urgent. I'll prioritize your message.",
        "Noted as urgent. I'll respond to this as soon as possible.",
        "I see this needs immediate attention. I'll be in touch quickly."
      ],
      default: [
        "Thank you for your message. I'll respond when I'm available.",
        "I've received your message and will get back to you soon.",
        "Thanks for reaching out! I'll reply as soon as I can."
      ]
    };

    let responseType = 'default';
    
    if (this.isGreeting(messageLower)) responseType = 'greeting';
    if (this.isQuestion(messageLower)) responseType = 'question';
    if (this.isUrgent(messageLower)) responseType = 'urgent';
    
    const responses = templates[responseType];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  isGreeting(message) {
    return message.includes('hello') || message.includes('hi') || 
           message.includes('hey') || message.includes('good morning') || 
           message.includes('good afternoon') || message.includes('good evening');
  }

  isQuestion(message) {
    return message.includes('?') || message.includes('how to') || 
           message.includes('can you') || message.includes('could you') ||
           message.includes('what is') || message.includes('when will');
  }

  isUrgent(message) {
    return message.includes('urgent') || message.includes('emergency') || 
           message.includes('asap') || message.includes('important') ||
           message.includes('quick') || message.includes('immediately');
  }

  showBotStatus() {
    console.log('\n📊 Bot Status:');
    console.log('✅ Auto-reply: Enabled');
    console.log('✅ New contacts: Will be greeted automatically');
    console.log('✅ Ongoing conversations: Will receive responses');
    console.log('✅ Conversation tracking: Active\n');
  }

  start() {
    this.client.initialize();
  }
}

// Start the advanced bot
const bot = new WhatsAppBot();
bot.start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down advanced bot...');
  await bot.client.destroy();
  process.exit(0);
});