import {PermissionFlagsBits, REST, Routes, SlashCommandBuilder} from "discord.js";
import {Config} from "./Config";

const command = [
    new SlashCommandBuilder()
        .setName('투표')
        .setDescription('투표 관리 명령어')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addSubcommand(subcommand =>
            subcommand
                .setName('시작')
                .setDescription('투표를 시작합니다.')
                .addStringOption(option =>
                    option
                        .setName('참가자1')
                        .setDescription('참가자 1의 이름을 입력하세요.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('참가자2')
                        .setDescription('참가자 2의 이름을 입력하세요.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('참가자3')
                        .setDescription('참가자 3의 이름을 입력하세요.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('종료')
                .setDescription('투표를 종료합니다.')
        )
]

const token = process.env.TOKEN || Config.token;
const clientId = process.env.CLIENT_ID || Config.clientId;

const rest = new REST({version: '10'}).setToken(token);

export async function registerCommands() {
    try {
        await rest.put(
            Routes.applicationCommands(clientId),
            {body: command},
        );

        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }
}