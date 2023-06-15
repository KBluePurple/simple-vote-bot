import {Client, CommandInteraction, GatewayIntentBits, GuildChannel, Interaction, TextBasedChannel} from "discord.js";
import {Config} from "./Config";
import {registerCommands} from "./CommandRegister";
import {VoteSession} from "./voteSession";

const sessionMap = new Map<TextBasedChannel, VoteSession>();

(async () => {
    await registerCommands();
    console.log("Registered commands!")

    const intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildIntegrations,
    ];

    const client = new Client({
        intents: intents
    });

    client.on("interactionCreate", onInteraction);

    await client.login(Config.token);
    console.log("Logged in!");
})();

async function onInteraction(interaction: Interaction) {
    if (interaction.isCommand()) {
        if (interaction.commandName === "투표") {
            await handleVoteCommand(interaction);
        }
    }
}

async function handleVoteCommand(interaction: CommandInteraction) {
    if (interaction.channel === null) {
        throw new Error("Interaction channel is null!");
    }

    const options: any = interaction.options;
    if (options.getSubcommand() === "시작") {
        if (sessionMap.has(interaction.channel)) {
            throw new Error("VoteSession is already started!");
        }

        const voteOptions = [];
        voteOptions.push({
            name: options.getString("참가자1")!,
            voters: [],
        });
        voteOptions.push({
            name: options.getString("참가자2")!,
            voters: [],
        });

        if (options.getString("참가자3") !== null)
            voteOptions.push({
                name: options.getString("참가자3"),
                voters: [],
            });

        const voteSession = new VoteSession(voteOptions, interaction.client);

        await voteSession.start(interaction.channel);
        sessionMap.set(interaction.channel, voteSession);

        await interaction.reply({content: "투표를 시작합니다.", ephemeral: true});
    }

    if (options.getSubcommand() === "종료") {
        if (interaction.channel === null || !(interaction.channel instanceof GuildChannel)) {
            throw new Error("Interaction channel is null!");
        }

        const voteSession = sessionMap.get(interaction.channel);
        if (voteSession === undefined) {
            throw new Error("VoteSession is not found!");
        }

        await voteSession.end();
        await interaction.reply({content: "투표를 종료합니다.", ephemeral: true});
    }
}

process.on("uncaughtException", (err) => {
    console.error(err);
});