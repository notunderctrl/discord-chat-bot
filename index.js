require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const conversationContext = require('./context');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

const configuration = new Configuration({
  organization: process.env.OPENAI_ORGANIZATION,
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// EVENTS
client.on('ready', (c) => {
  console.log(`Logged in as ${c.user.tag}!`);
});

const msgLengthLimit = 1000;
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (message.channel.id !== process.env.CHAT_BOT_CHANNEL) return;
    if (message.content.startsWith('!')) return;

    await message.channel.sendTyping();

    if (message.content.length > msgLengthLimit) {
      message.reply("Whoa now, I'm not going to read all that. Maybe summarize?");
      return;
    }

    let prevMessages = await message.channel.messages.fetch({ limit: 50 });
    prevMessages = prevMessages.sort((a, b) => a - b);

    let conversationLog = '';

    prevMessages.forEach((msg) => {
      if (msg.content.length > msgLengthLimit) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.content.startsWith('!')) return;

      conversationLog += `\n${msg.author.tag}: ${msg.content}`;
    });

    const result = await openai.createCompletion({
      model: 'gpt-3.5-turbo-0301',
      prompt: `${conversationContext(client.user.tag)}
             ${conversationLog}
             ${client.user.tag}:
             `,
      max_tokens: 256,
      temperature: 0.7,
    });

    if (result.data.choices[0].finish_reason === 'length') {
      message.reply(result.data.choices[0].text + '...');
    } else {
      message.reply(result.data.choices[0].text);
    }
  } catch (error) {
    console.log(`Error: ${error}`);
  }
});

client.login(process.env.TOKEN);
