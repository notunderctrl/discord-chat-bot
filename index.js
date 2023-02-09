require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

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

const msgLengthLimit = 300;
client.on('message', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHAT_BOT_CHANNEL) return;
  if (message.content.startsWith('!')) return;

  await message.channel.sendTyping();

  if (message.content.length > msgLengthLimit) {
    message.reply("Whoa now, I'm not going to read all that. Maybe summarize?");
    return;
  }

  let prevMessages = await message.channel.messages.fetch({ limit: 25 });
  prevMessages = prevMessages.sort((a, b) => a - b);

  let conversationLog = '';

  prevMessages.forEach((msg) => {
    if (msg.content.length > msgLengthLimit) return;

    if (msg.author.id === message.author.id || msg.author.id === client.user.id) {
      if (msg.content.startsWith('!')) return;

      conversationLog += `\n${msg.author.username}: ${msg.content}`;
    }
  });

  const result = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `${client.user.username} is a friendly chatbot.

             ${client.user.username}: Hello, how can I help you?${conversationLog}
             ${client.user.username}:
             `,
    max_tokens: 200,
  });

  if (result.data.choices[0].finish_reason === 'length') {
    message.reply(
      result.data.choices[0].text + '...*it costs a lot for me to speak more than this.*'
    );
  } else {
    message.reply(result.data.choices[0].text);
  }
});

client.login(process.env.TOKEN);
