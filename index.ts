import type { ClientOptions } from "eris";
import settings from "./src/json/settings.json"
import c from "chalk"
import prompts from "prompts"
import gradient from "gradient-string"
import cld from "child_process"
const
    KetClient = require('./src/KetClient'),
    moment = require("moment"),
    duration = require("moment-duration-format"),
    {tz} = require('moment-timezone')
duration(moment);
let DISCORD_TOKEN: string;

function log(type: string = "log", setor = "CLIENT", message: string, error: any = "") {
    moment.locale("pt-BR")
    switch (type) {
        case "log": return console.log(c.greenBright(`[ ${setor} | ${moment.tz(Date.now(), "America/Bahia").format("LT")} ] - ${message}`))
        case "error": 
            console.error(c.redBright(`[ ${setor} | ${moment.tz(Date.now(), "America/Bahia").format("LT")} ] - ${message}\n${error}`))
            return console.error(error)
        case "shard": return console.log(c.blueBright(`[ ${setor} | ${moment.tz(Date.now(), "America/Bahia").format("LT")} ] - ${message}`))
    }
}
global.log = log
starterMenu()
async function starterMenu() {
    console.clear()
    console.log(process.env.DATABASE_CREDENTIALS)
    let starterMenu = await prompts({
        name: 'value',
        message: gradient.mind(`
    ██╗░░██╗███████╗████████╗  ███╗░░░███╗███████╗███╗░░██╗██╗░░░██╗
    ██║░██╔╝██╔════╝╚══██╔══╝  ████╗░████║██╔════╝████╗░██║██║░░░██║
    █████═╝░█████╗░░░░░██║░░░  ██╔████╔██║█████╗░░██╔██╗██║██║░░░██║
    ██╔═██╗░██╔══╝░░░░░██║░░░  ██║╚██╔╝██║██╔══╝░░██║╚████║██║░░░██║
    ██║░╚██╗███████╗░░░██║░░░  ██║░╚═╝░██║███████╗██║░╚███║╚██████╔╝
    ╚═╝░░╚═╝╚══════╝░░░╚═╝░░░  ╚═╝░░░░░╚═╝╚══════╝╚═╝░░╚══╝░╚═════╝░\n
  ◆ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ ❴ ✪ ❵ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ ◆\n
    0 - Exit
    1 - Iniciar Client padrão
    2 - Iniciar Client BETA
    3 - Visualizar LOGS\n`),
        type: 'number',
        validate: option => option >= 0 && option <= 3 ? true : 'Escolha uma opção válida'
    })
    console.clear()
    switch(starterMenu.value) {
        case 0: return process.emit('SIGINT', null)
        case 1: DISCORD_TOKEN = process.env.CLIENT_DISCORD_TOKEN
            return start()
        case 2: DISCORD_TOKEN = process.env.BETA_CLIENT_DISCORD_TOKEN
            return start()
        case 3: return logsMenu()
    }
}
async function logsMenu() {
    let logsMenu = await prompts({
            name: 'value',
            message: gradient.mind(`
    ██╗░░░░░░█████╗░░██████╗░░██████╗
    ██║░░░░░██╔══██╗██╔════╝░██╔════╝
    ██║░░░░░██║░░██║██║░░██╗░╚█████╗░
    ██║░░░░░██║░░██║██║░░╚██╗░╚═══██╗
    ███████╗╚█████╔╝╚██████╔╝██████╔╝
    ╚══════╝░╚════╝░░╚═════╝░╚═════╝░\n
  ◆ ▬▬▬▬▬▬▬▬▬▬▬▬▬ ❴ ✪ ❵ ▬▬▬▬▬▬▬▬▬▬▬▬▬ ◆\n
    0 - Voltar
    1 - Logs completos
    2 - Logs de erros
            `),
            type: 'number',
            validate: option => option >= 0 && option <= 2 ? true : 'Escolha uma opção válida'
        })
        console.clear()
        switch(logsMenu.value) {
            case 0: return starterMenu();
            case 1: try {
                return cld.exec('cat /src/logs/output.log', (a, value) => {
                    if(value.length === 0) {
                        console.log('Logs vazios')
                        return setTimeout(() => starterMenu(), 2000)
                    }
                    else console.log(value)
                })
                } catch(e) {
                    console.log('Logs vazios')
                    return setTimeout(() => starterMenu(), 2000)
            }
            case 2: try {
                return cld.exec('cat /src/logs/errors.log', (a, value) => {
                    if(value.length === 0) {
                        console.log('Logs vazios')
                        return setTimeout(() => starterMenu(), 2000)
                    }
                    else console.log(value)
                })
            } catch(e) {
                console.log('Logs vazios')
                return setTimeout(() => starterMenu(), 2000)
            }
        }
}
function start() {
    require('./src/components/ProtoTypes').start()
    
    console.log(c.bgBlueBright("[ SHARDING MANAGER ] - Iniciando fragmentação..."))
    const ket = new KetClient(`Bot ${DISCORD_TOKEN}`, settings.ERIS_LOADER_SETTINGS as ClientOptions)
    
    ket.boot().then(boot => {
        process.env.CLIENT_DISCORD_TOKEN = null
        process.env.BETA_CLIENT_DISCORD_TOKEN = null
    })
    
    global.ket = ket;
    global.dir = __dirname;
}

process
    .on('SIGINT', async () => {
        console.log(c.bgGreen('encerrando conexão com o banco de dados...'))
        try {
            await global.db.disconnect()
            global.log('log', 'DATABASE', `√ Banco de dados desconectado`)
        } catch(e) {
            global.log('error', 'DATABASE', `x Houve um erro ao encerrar a conexão com o banco de dados:`, e)
        } finally {
            process.exit()
            process.exit(0)
            process.exit(1)
            return process.kill(process.pid);
        }
    })
    .on('unhandledRejection', (reason, p) => global.log('error', "ANTI-CRASH", `SCRIPT REJEITADO:`, reason))
    .on("uncaughtException", (err, o) => global.log('error', 'ANTI-CRASH', `CATCH ERROR:`, err))
    .on('uncaughtExceptionMonitor', (err, o) => global.log('error', "ANTI-CRASH", `BLOQUEADO:`, err))
    .on('multipleResolves', (type, promise, reason) => global.log('error', 'ANTI-CRASH', `MULTIPLOS ERROS:`, promise));