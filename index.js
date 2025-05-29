require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const keep_alive = require('./keep_alive'); // Keep-alive server

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ]
});

// Command Collection
client.commands = new Collection();
const commands = [];

// Slash Commands Setup
const commandDefinitions = [
    // Moderation
    new SlashCommandBuilder().setName('kick').setDescription('Kicks a user').addUserOption(option => option.setName('target').setDescription('User to kick').setRequired(true)),
    new SlashCommandBuilder().setName('ban').setDescription('Bans a user').addUserOption(option => option.setName('target').setDescription('User to ban').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Deletes messages').addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete').setRequired(true)),

    // Utility
    new SlashCommandBuilder().setName('userinfo').setDescription('Shows user info').addUserOption(option => option.setName('target').setDescription('User to check')),
    new SlashCommandBuilder().setName('ping').setDescription('Checks bot latency'),
    new SlashCommandBuilder().setName('avatar').setDescription('Shows user avatar').addUserOption(option => option.setName('target').setDescription('User to check')),

    // Voice
    new SlashCommandBuilder().setName('join').setDescription('Bot joins a voice channel'),
    new SlashCommandBuilder().setName('leave').setDescription('Bot leaves voice channel'),
    new SlashCommandBuilder().setName('playsound').setDescription('Plays a sound in VC').addStringOption(option => option.setName('sound').setDescription('Sound file name')),

    // Fun
    new SlashCommandBuilder().setName('meme').setDescription('Sends a random meme'),
    new SlashCommandBuilder().setName('roll').setDescription('Rolls a random number'),
    new SlashCommandBuilder().setName('flip').setDescription('Flips a coin'),
];

commandDefinitions.forEach(cmd => commands.push(cmd.toJSON()));

// Bot Ready Event
client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);

    client.user.setPresence({ activities: [{ name: 'Moderating the server', type: 3 }], status: 'online' });

    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// Slash Command Handling
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'playsound') {
        const soundFile = interaction.options.getString('sound') || 'sound.mp3';
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply("❌ You need to be in a voice channel!");
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfMute: false, // Bot will NOT be muted
            selfDeaf: false  // Bot will NOT be deafened
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(path.join(__dirname, soundFile));

        player.play(resource);
        connection.subscribe(player);

        player.on('idle', () => {
            connection.destroy();
        });

        await interaction.reply(`🔊 **Now playing:** ${soundFile}`);
    }

    if (commandName === 'ping') {
        await interaction.reply(`🏓 Pong! Latency: ${client.ws.ping}ms`);
    }

    if (commandName === 'userinfo') {
        const user = interaction.options.getUser('target') || interaction.user;
        await interaction.reply(`👤 **User:** ${user.username}\n🆔 **ID:** ${user.id}`);
    }

    if (commandName === 'avatar') {
        const user = interaction.options.getUser('target') || interaction.user;
        await interaction.reply(user.displayAvatarURL({ dynamic: true }));
    }

    if (commandName === 'meme') {
        const response = await axios.get('https://meme-api.com/memes');
        await interaction.reply(response.data.url);
    }
});

// Error Handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Bot Login
client.login(process.env.DISCORD_BOT_TOKEN);

