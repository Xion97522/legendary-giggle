const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const { createReadStream } = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playsound')
        .setDescription('Joins your voice channel and plays a sound'),
    async execute(interaction) {
        try {
            // Check if the user is in a voice channel
            const voiceChannel = interaction.member?.voice?.channel;
            if (!voiceChannel) {
                return interaction.reply('❌ You need to be in a voice channel to use this command!');
            }

            // Check if the bot has permissions to join and speak in the voice channel
            const permissions = voiceChannel.permissionsFor(interaction.guild.members.me);
            if (!permissions.has('Connect') || !permissions.has('Speak')) {
                return interaction.reply('❌ I need permissions to join and speak in your voice channel!');
            }

            // Send initial response
            await interaction.reply('🔊 Joining voice channel and preparing to play sound...');

            try {
                // Join the voice channel
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                // Wait for the connection to be ready
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout'));
                    }, 10000); // 10 second timeout

                    connection.on(VoiceConnectionStatus.Ready, () => {
                        clearTimeout(timeout);
                        resolve();
                    });

                    connection.on(VoiceConnectionStatus.Disconnected, () => {
                        clearTimeout(timeout);
                        reject(new Error('Connection disconnected'));
                    });
                });

                // Create audio player
                const player = createAudioPlayer();
                
                // Path to the sound file
                const soundPath = path.join(__dirname, '..', 'sounds', 'notification.mp3');
                
                // Create audio resource
                const resource = createAudioResource(createReadStream(soundPath), {
                    metadata: {
                        title: 'Notification Sound',
                    },
                });

                // Subscribe the connection to the audio player
                connection.subscribe(player);

                // Play the audio
                player.play(resource);

                // Update status message
                await interaction.editReply('🎵 Playing sound...');

                // Handle player events
                player.on(AudioPlayerStatus.Playing, () => {
                    console.log('Audio is now playing');
                });

                player.on(AudioPlayerStatus.Idle, async () => {
                    console.log('Audio playback finished');
                    
                    // Wait a moment before leaving
                    setTimeout(() => {
                        try {
                            connection.destroy();
                            console.log('Left voice channel');
                        } catch (error) {
                            console.error('Error leaving voice channel:', error);
                        }
                    }, 1000);

                    // Update status message
                    try {
                        await interaction.editReply('✅ Sound played successfully! Left voice channel.');
                    } catch (error) {
                        console.error('Error updating status message:', error);
                    }
                });

                player.on('error', async (error) => {
                    console.error('Audio player error:', error);
                    
                    try {
                        connection.destroy();
                        await interaction.editReply('❌ Error playing sound! Left voice channel.');
                    } catch (updateError) {
                        console.error('Error updating status message:', updateError);
                    }
                });

            } catch (connectionError) {
                console.error('Voice connection error:', connectionError);
                await interaction.editReply('❌ Failed to connect to voice channel!');
            }

        } catch (error) {
            console.error('Command execution error:', error);
            
            if (error.message.includes('Missing Permissions')) {
                return interaction.reply('❌ I don\'t have permission to join voice channels in this server!');
            } else if (error.message.includes('Target user is not connected to a voice channel')) {
                return interaction.reply('❌ You must be in a voice channel to use this command!');
            } else {
                return interaction.reply('❌ An unexpected error occurred while trying to play the sound!');
            }
        }
    },
};
