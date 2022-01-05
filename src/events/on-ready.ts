export { };
import { Client } from "eris"
const
    c = require('chalk'),
    gradient = require('gradient-string'),
    { TerminalClient } = require('../components/CLI/KetMenu');

module.exports = class ReadyEvent {
    ket: Client;
    constructor(ket: Client) {
        this.ket = ket;
    }
    async start() {
        let status: object[] = [
            { name: 'no vasco', type: 0 },
            { name: 'sua mãe da janela', type: 0 },
            { name: 'sua mãe na panela', type: 0 },
            { name: "mais um gol do vasco", type: 3 },
            { name: "os gemidos da sua mãe", type: 2 },
            { name: 'Vasco x Flamengo', type: 5 }
        ]
        //@ts-ignore
        setInterval(() => this.ket.editStatus("dnd", status[Math.floor(Math.random() * status.length)]), 25 * 1_000)
        global.session.log('log', "CLIENT", `Sessão iniciada como ${c.bgGreen(c.white(this.ket.user.tag))}\n${gradient('red', 'yellow')("◆ ▬▬▬▬▬▬▬▬ ❴ ✪ ❵ ▬▬▬▬▬▬▬▬ ◆")}\nOperante em ${this.ket.guilds.size} templos com ${this.ket.users.size} subordinados`);
        TerminalClient(this.ket);
        /*        return setInterval(() => {
                    return global.infoEmbed(NaN, this.ket)
                }, 2000)
                */
        return;
    }
}
