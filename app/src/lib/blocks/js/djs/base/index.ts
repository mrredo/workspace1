import {
    OutputType,
    BlockShape,
    InputShape,
} from "$lib/utils/blockRegistryTool";

class BaseBlocks {
    getRegistry() {
        return {
            id: "base",
            color: "#3844fc",
            blocks: [
                {
                    func: "token",
                    text: "Connect to bot using [TOKEN]",
                    blockShape: BlockShape.FLOATING,
                    arguments: [
                        {                    
                            type: InputShape.VALUE,
                            check: OutputType.STRING,
                        },
                    ],
                },
                {
                    func: "env",
                    text: "Get environment variable [NAME]",
                    output: OutputType.STRING,
                    arguments: [
                        {
                            type: InputShape.VALUE,
                            check: OutputType.STRING,
                        },
                    ],
                },
                {
                    func: "bot_connected",
                    text: " [INFO] \n",
                    color: "#ffab19",
                    branches: 1,
                    BlockShape: BlockShape.EVENT,
                    arguments: {
                        INFO: {
                            type: InputShape.MENU,
                            options: [
                                ["bot is connected", "bot_connected"],
                                ["Insert code", "insert_code"],
                            ]
                        }
                    }
                },
                {
                    func: "bot_status",
                    text: "Type: [TYPE] Message: [MESSAGE] Status: [STATUS] Name: [NAME]",
                    color: "#cc33ff",
                    BlockShape: BlockShape.FLOATING,
                    arguments: {
                        MESSAGE: {                    
                            type: InputShape.VALUE,
                            check: OutputType.STRING,
                        },
                        NAME: {                    
                            type: InputShape.VALUE,
                            check: OutputType.STRING,
                        },
                        TYPE: {
                            type: InputShape.MENU,
                            options: [
                                ["playing", "Playing"],
                                ["streaming", "Streaming"],
                                ["watching", "Watching"],
                                ["listening", "Listening"],
                                ["custom", "Custom"]
                            ]
                        },
                        STATUS: {
                            type: InputShape.MENU,
                            options: [
                                ["dnd", "dnd"],
                                ["idle", "idle"],
                                ["online", "online"],
                                ["invisible", "invisible"]
                            ]
                        }
                    },
                },
                {
                    func: "bot_as_member",
                    text: "Bot as member",
                    output: OutputType.OBJECT,
                    color: "#187494"
                },
                {
                    func: "bot_in_server",
                    text: "Bot as member in server [SERVER]",
                    color: "#187494",
                    output: OutputType.OBJECT,
                    arguments: {
                        SERVER: {
                            type: InputShape.VALUE,
                            check: OutputType.DISCORD.SERVER,
                        },    
                    }
                },
                {
                    func: "bot_info",
                    text: "get bot info [INFO]",
                    color: "#4fa7c7",
                    output: OutputType.ANY,
                    arguments: {
                        INFO: {
                            type: InputShape.MENU,
                            options: [
                                ["startup time", "startup_time"],
                                ["ping", "ping"],
                                ["uptime", "uptime"],
                                ["user count", "user_count"],
                                ["server count", "server_count"],
                                ["channel count", "channel_count"],
                            ]

                        },
                    },
                },
            ]
        };
    }

    // login to discord and if token invalid let them know
    token(args: any) {
        return `client.login(${args.TOKEN}).catch((err) => {
            console.error(err);
            return "Invalid token";
        });`;
    }

    env(args: any) {
        return `process.env.${args.NAME}`;
    }

    bot_connected(args: any) {
        switch (args.INFO) {
            case "bot_connected":
                return `client.once("ready", () => {
                    ${args.BRANCH1}
                });`;
            case "insert_code":
                return `${args.BRANCH1}`;
        }
    }

    bot_as_member(args: any) {
        return `client.user`;
    }

    bot_status(args: any) {
        return `client.on("ready", () => {
            const status = client.user.setPresence({
                status: '${args.STATUS}',
                activities: [{
                    type: ActivityType.${args.TYPE},
                    name: ${args.MESSAGE}, // I know its confusing but it makes more sense when looking at it in discord
                    state: ${args.NAME}
                }]
            })
        });`
    }

    bot_in_server(args: any) {
        return `client.guilds.cache.get(${args.SERVER})`;
    }

    bot_info(args: any) {
        switch (args.INFO) {
            case "startup_time":
                return `client.readyAt`;
            case "ping":
                return `client.ws.ping`;
            case "uptime":
                return `client.uptime`;
            case "user_count":
                return `client.users.cache.size`;
            case "server_count":
                return `client.guilds.cache.size`;
            case "channel_count":
                return `client.channels.cache.size`;
        }
    }
}

export default BaseBlocks;
