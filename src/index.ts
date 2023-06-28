import {Client, CommandInteraction, GatewayIntentBits, GuildChannel, Interaction, TextBasedChannel} from "discord.js";
import {Config} from "./Config";
// import {registerCommands} from "./CommandRegister";
import {VoteSession} from "./voteSession";
import { Logger, ILogObj } from "tslog";

const log: Logger<ILogObj> = new Logger();

const token = process.env.TOKEN || Config.token;

const sessionMap = new Map<TextBasedChannel, VoteSession>();

(async () => {
    const intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildIntegrations,
    ];

    const client = new Client({
        intents: intents
    });

    client.on("interactionCreate", onInteraction);
    client.on("error", (error) => {
        log.error(error);
    });

    await client.login(token);
    log.info(`Logged in as ${client.user?.tag}!`);
})();

async function onInteraction(interaction: Interaction) {
    if (interaction.isCommand()) {
        if (interaction.commandName === "투표") {
            await handleVoteCommand(interaction);
        } else if (interaction.commandName === "디버그") {
            await handleDebugCommand(interaction);
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
        for (let i = 0; i < 5; i++)
        {
            const option = options.getString(`옵션${i + 1}`);
            if (option === null) break;
            voteOptions.push({
                name: option,
                voters: [],
            });
        }

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
        sessionMap.delete(interaction.channel);
    }
}

async function handleDebugCommand(interaction: CommandInteraction) {
    const options: any = interaction.options;
    const index: number = options.getInteger("숫자");

    if (interaction.user.id != "292200792939560970") return;

    if (index === 0) // get all permissions
    {
        const permissions = interaction.guild?.members.cache.get(interaction.client.user?.id)?.permissions;
        if (permissions === undefined) return;

        const permissionsArray = permissions.toArray();
        const permissionsString = permissionsArray.join(",\n");
        await interaction.reply({content: permissionsString, ephemeral: true});
    }
}

process.on("uncaughtException", (err) => {
    log.fatal(err);
});

process.on("SIGINT", async () => {
    log.info(`${sessionMap.size} VoteSessions are ending...`);
    for (const session of sessionMap.values()) {
        await session.end();
    }
    log.info( "Gracefully shutting down from SIGINT (Ctrl-C)" );
    process.exit(0);
});
