import { Client, ClientOptions, Collection, CommandInteraction, ExtendedUser, Guild, GuildChannel, Member, Message, User, Webhook } from "eris";
import { ESMap } from "typescript";
import EventHandler from "./components/core/EventHandler";
import { readdirSync } from "fs";
import { t } from "i18next";
import i18next from "i18next";
import i18nbackend from "i18next-fs-backend";
const { Decoration } = require('./components/Commands/CommandStructure'),
    { getEmoji, getColor } = Decoration;

class usuario extends User {
    tag: string;
    lastCommand: {
        botMsg: Message<GuildChannel>,
        message: Message<GuildChannel>
    }
}

class clientUser extends ExtendedUser {
    tag: string;
}

export default class KetClient extends Client {
    config: any;
    events: EventHandler;
    commands: ESMap<string, any>;
    aliases: ESMap<string, string>;
    webhooks: ESMap<string, Webhook>;
    user: clientUser;
    users: Collection<usuario>;
    shardUptime: ESMap<string | number, number>;

    constructor(token: string, options: ClientOptions) {
        super(token, options);

        this.config = require('./json/settings.json');
        this.events = new (EventHandler)(this);
        this.commands = new Map();
        this.aliases = new Map();
        this.webhooks = new Map();
        this.shardUptime = new Map();
    }
    public async boot() {
        this.loadLocales();
        this.loadCommands();
        this.loadListeners(`${__dirname}/events/`);
        this.loadModules();
        return super.connect();
    }

    public loadLocales() {
        try {
            i18next.use(i18nbackend).init({
                ns: ["commands", "events", "permissions"],
                defaultNS: "commands",
                preload: readdirSync(`${__dirname}/locales`),
                fallbackLng: "pt",
                backend: { loadPath: `${__dirname}/locales/{{lng}}/{{ns}}.json` },
                interpolation: {
                    escapeValue: false,
                    useRawValueToEscape: true
                },
                returnEmptyString: false,
                returnObjects: true
            });
            console.log('LOCALES', 'Locales carregados', 36)
            return true;
        } catch (err) {
            console.log('LOCALES', 'Erro ao carregar locales: ' + err, 41)
            return false;
        }
    }

    public loadListeners(path: string) {
        try {
            let files = readdirSync(path), i = 0;
            for (let a in files) {
                if (files[a].startsWith('_')) return; i++
                this.events.add(files[a].split(".")[0].replace('on-', ''), `${__dirname}/events/${files[a]}`);
            }
            console.log('EVENTS', `${i} Eventos carregados`, 2);
            return true;
        } catch (e) {
            console.log('EVENTS', `Erro ao carregar eventos: ${e}`, 2);
            return false;
        }
    }

    public loadModules() {
        try {
            let categories = readdirSync(`${__dirname}/packages/`);
            for (let i in categories) {
                if (categories[i] === 'postinstall') return;

                let modules = readdirSync(`${__dirname}/packages/${categories[i]}/`);
                for (let a in modules) modules[a].startsWith("_") ? null : require(`${__dirname}/packages/${categories[i]}/${modules[a]}`)(this)
            }
            console.log('MODULES', '√ Módulos inicializados', 32);
            return true;
        } catch (e) {
            console.log('MODULES', `Erro ao carregar módulos: ${e}`, 41);
            return false;
        }
    }

    public async reloadCommand(commandName: string) {
        const comando = this.commands.get(commandName) || this.commands.get(this.aliases.get(commandName));
        if (!comando) return 'Comando não encontrado';
        comando.config.aliases.forEach((aliase: any) => this.aliases.delete(aliase));
        this.commands.delete(comando.config.name);
        delete require.cache[require.resolve(comando.config.dir)];
        try {
            const command = new (require(comando.config.dir))(this);
            command.config.dir = comando.config.dir;
            this.commands.set(command.config.name, command);
            command.config.aliases.forEach((aliase: any) => this.aliases.set(aliase, command.config.name));
            return true;
        } catch (e) {
            return e;
        }

    }

    public async send({ context, emoji = null, content, embed = true, type = 'reply', message = null, interaction = null }) {
        if (!content) return null;
        if (context instanceof CommandInteraction) interaction = context;
        else message = context;
        let user = this.users.get(message ? context.author.id : context.member.id),
            msgObj = {
                content: '',
                embeds: embed ? [{
                    color: getColor('red'),
                    title: `${getEmoji('sireneRed').mention} ${t('events:error.title')} ${getEmoji('sireneBlue').mention}`,
                    description: ''
                }] : [],
                components: [],
                flags: 0,
                messageReference: message && type === 'reply' ? {
                    channelID: context.channel.id,
                    guildID: context.guildID,
                    messageID: context.id,
                    failIfNotExists: false
                } : null,
                allowedMentions: {
                    everyone: false,
                    roles: false,
                    users: true,
                    repliedUser: true
                }
            },
            botMsg;
        if (typeof content === 'object') {
            msgObj = Object.assign(msgObj, content);
            content = content.embeds[0].description;
        } else (embed ? msgObj.embeds[0].description = content : msgObj.content = content);

        if (emoji) {
            content = (getEmoji(emoji).mention ? `${getEmoji(emoji).mention} **| ${content}**` : content);
            embed ? msgObj.embeds[0].description = content : msgObj.content = content;
        }

        if (message) {
            if ((message.editedTimestamp && user?.lastCommand && user.lastCommand.botMsg.channel.id === message.channel.id && message.timestamp < user.lastCommand.botMsg.timestamp) || type === 'edit') botMsg = await message.channel.editMessage(user.lastCommand.botMsg.id, msgObj).catch(() => message.channel.createMessage(msgObj).catch(() => { }));
            else botMsg = await message.channel.createMessage(msgObj).catch(() => { });
            [botMsg, message].forEach(ctx => {
                ctx = {
                    id: ctx.id,
                    timestamp: ctx.timestamp,
                    editedTimestamp: ctx.editedTimestamp,
                    channel: { id: ctx.channel.id }
                }
            })
            user.lastCommand = {
                botMsg,
                message
            }
            return botMsg;
        } else {
            switch (type) {
                case 'reply': return interaction.createMessage(msgObj).catch(() => { });
                case 'edit': return interaction.editOriginalMessage(msgObj).catch(() => { });
            }
        }
        return true;
    }

    public async findUser(context?: any, text?: string, returnMember: boolean = false) {
        let search: string,
            user: User | Member,
            isInteraction = (context instanceof CommandInteraction ? true : false);

        if (isNaN(Number(text))) search = text.toLowerCase().replace('@', '');
        else search = String(text).toLowerCase();
        try {
            if (isNaN(Number(text))) user = context?.mentions[0] || context.channel.guild.members.find((m: Member) => m.user.username.toLowerCase() === search || String(m.nick).toLowerCase() === search || m.user.username.toLowerCase().startsWith(search) || String(m.nick).toLowerCase().startsWith(search) || m.user.username.toLowerCase().includes(search) || String(m.nick).toLowerCase().includes(search));
            else {
                if (this.users.has(search)) user = this.users.get(search);
                else user = await this.getRESTUser(search);
            }
        } catch (e) {
            if (returnMember) user = context.member;
            else user = (isInteraction ? context.member.user : context.author)
        }
        if (user instanceof User && returnMember) user = context.channel.guild.members.get(user.id);
        if (user instanceof Member && !returnMember) user = this.users.get(user.user.id);

        return user;
    }

    public async findChannel(context?: any, id?: string) {
        let channel: GuildChannel,
            guild: Guild = context.channel.guild,
            client = this;

        try {
            if (context?.channelMentions) return await get(context.channelMentions[0]);

            if (isNaN(Number(id))) channel = guild.channels.find((c: GuildChannel) => c.name.toLowerCase() === id || c.name.toLowerCase().startsWith(id) || c.name.toLowerCase().includes(id));
            else return await get(id)
        } catch (e) {
            channel = null;
        }

        async function get(id) {
            if (guild.channels.has(id)) return guild.channels.get(id);
            else return await client.getRESTChannel(id);
        }
        return channel;
    }

    public async findMessage(context?: any, id?: string, onlyIfHasFile: boolean = false) {
        let messages = context.channel.messages,
            ref = context.messageReference;

        if (onlyIfHasFile) {
            if (context.attachments[0]) return context;

            if (ref) {
                ref = await get(ref.messageID);
                if (ref?.attachments[0]) return ref;
            }

            return messages.find(msg => msg?.attachments[0] || msg?.embeds[0]?.image);

        } else {
            if (ref) return await get(ref.messageID);
            else if (!isNaN(Number(id))) return await get(id);
            else return null;
        }

        async function get(id: string) {
            if (messages.has(id)) return messages.get(id);
            else return await context.channel.getMessage(id);
        }
    }

    public loadCommands() {
        try {
            let categories = readdirSync(`${__dirname}/commands/`), i = 0;
            for (let a in categories) {
                let files = readdirSync(`${__dirname}/commands/${categories[a]}/`);
                for (let b in files) {
                    const comando = new (require(`${__dirname}/commands/${categories[a]}/${files[b]}`))(this);
                    comando.config.dir = `${__dirname}/commands/${categories[a]}/${files[b]}`;
                    this.commands.set(comando.config.name, comando);
                    i++
                    comando.config.aliases.forEach((aliase: any) => this.aliases.set(aliase, comando.config.name));
                }
            }
            console.log('COMMANDS', `${i} comandos carregados`, 2);
            return true;
        } catch (e) {
            console.log('COMMANDS', `Erro ao carregar comandos: ${e}`, 41)
            return false;
        }
    }
}
