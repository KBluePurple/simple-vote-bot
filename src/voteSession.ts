import {v4 as uuidv4} from 'uuid';
import {
    BaseGuildTextChannel,
    ButtonStyle,
    Channel,
    Client,
    ComponentType,
    Interaction,
    Message,
    User
} from "discord.js";
import * as fs from "fs";

type VoteOption = {
    name: string;
    voters: User[];
}

if (!fs.existsSync("hitCount.json")) {
    fs.writeFileSync("hitCount.json", "{}");
}

export class VoteSession {
    private readonly _id: string;
    private readonly _options: VoteOption[];
    private _message: Message | null = null;
    private _client: Client;
    private _interactionId: string | null = null;

    private _embedCache: any = null;
    private _buttonCache: any = null;

    constructor(options: VoteOption[], client: Client) {
        this._id = uuidv4();
        this._options = options;
        this._client = client;
    }

    public async start(channel: Channel): Promise<void> {
        if (!(channel instanceof BaseGuildTextChannel)) {
            throw new Error("Channel is not a text channel!");
        }

        this._interactionId = channel.guild.id + channel.id + this._id;
        this._message = await channel.send({
            embeds: this.getEmbeds(),
            components: [{
                type: ComponentType.ActionRow,
                components: this.getButtons()
            }]
        });

        this._client.on("interactionCreate", this.interactionHandler);
        console.log(`VoteSession ${this._id} started!`);
    }

    private interactionHandler = async (interaction: Interaction) => {
        if (interaction.isButton() && interaction.customId.startsWith(this._id)) {
            const index = parseInt(interaction.customId.replace(this._id, ""));
            console.log(`VoteSession ${this._id} received interaction from ${interaction.user.username}!`);

            try {
                await this.vote(index, interaction.user);
                await interaction.update({
                    embeds: this.getEmbeds(),
                });
            } catch (e: any) {
                await interaction.reply({
                    content: e.message,
                });
            }
        }
    }

    public async vote(index: number, user: User) {
        if (this._message === null) {
            throw new Error("VoteSession is not started!");
        }

        const alreadyVoted = this._options.some((option) => {
            return option.voters.some((voter) => {
                return voter.id === user.id;
            });
        });

        if (alreadyVoted) {
            this._options.forEach((option) => {
                option.voters = option.voters.filter((voter) => {
                    return voter.id !== user.id;
                });
            });
        }

        this._options[index].voters.push(user);
    }

    public async end() {
        if (this._message === null) {
            throw new Error("VoteSession is not started!");
        }

        await this._message.edit({
            embeds: [{
                title: "투표",
                description: `투표가 종료되었습니다!`,
                fields: [...this.generateVotersFields(), {
                    name: "총 투표 수",
                    value: `${this.totalVoteCount()}표!`,
                }, {
                    name: "우승자",
                    value: this.getWinner(),
                }]
            }],
            components: []
        });

        this._client.off("interactionCreate", this.interactionHandler);

        console.log(`VoteSession ${this._id} ended!`)
    }

    private getWinner() {
        let max = 0;
        let winner = "";

        for (const option of this._options) {
            if (option.voters.length > max) {
                max = option.voters.length;
                winner = option.name;
            }
        }

        return winner;
    }

    private totalVoteCount() {
        let total = 0;

        for (const option of this._options) {
            total += option.voters.length;
        }

        return total;
    }

    private generateVotersFields() {
        return this._options.map((option) => {
            return {
                name: option.name,
                value: `${option.voters.length}표!`,
                inline: true
            }
        })
    }

    private getButtons(): { style: any; label: string; type: any; customId: string }[] {
        if (this._buttonCache !== null) {
            return this._buttonCache;
        }

        return this._buttonCache = this._options.map((option, index) => {
            return {
                type: ComponentType.Button,
                label: option.name,
                style: ButtonStyle.Primary,
                customId: this._id + index
            }
        });
    }

    private getEmbeds() {
        return this._embedCache = [{
            title: "투표",
            description: `투표가 시작되었습니다!`,
            fields: [...this.generateVotersFields(), {
                name: "총 투표 수",
                value: `${this.totalVoteCount()}표!`,
            }]
        }];
    }
}
