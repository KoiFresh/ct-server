import * as fs from "fs";
import path from "path";
import express, {Application, Request, Response, NextFunction} from "express";
import ws from 'express-ws';
import axios from "axios";
import {application} from "./application";
import {client, PushImage} from "./client";

/*
*   Anwendungsname setzen und ausgeben
*/
process.title = application.NAME; 
console.log("process name:", process.title);
console.log("process id:", process.pid);

/*
*    Globale Varibalen definieren
*/
let config: any = JSON.parse(fs.readFileSync(path.join(application.BASEPATH, "config.json") ,"utf-8"));
let blacklist: any = JSON.parse(fs.readFileSync(path.join(application.BASEPATH, "blacklist.json") ,"utf-8"));
let whitelist: any = JSON.parse(fs.readFileSync(path.join(application.BASEPATH, "whitelist.json") ,"utf-8"));
let clients: client[] = [];

/*
*    Express Server Einrichten
*/ 

let app: Application = express();
let router: ws.Router = express.Router() as ws.Router;
ws(app); // websocket kompatibilität hinzufügen

/*
*   überprüfen ob es ein valides json format ist
*/ 

function isValidJson(val: string | undefined) : boolean {
    if(val) {
        try { JSON.parse(val); } catch (e) {return false;}
        return true;
    }
    return false;
} 

/*
*   rawBody von Nachrichten auslesen
*/
let rawBody:any = (req: any, res: Response, next: NextFunction) => {
    req.setEncoding("utf-8");
    req.rawBody = "";
    req.on("data", (chunk:any) => { req.rawBody += chunk});
    req.on("end", () => {next(); });
};
app.use(rawBody);

/*
*    Router konfigurieren
*/ 

router.get("/", (req: Request, res: Response) => {
    res.sendStatus(204);
});

router.post("/development", (req: Request, res: Response) => {
    res.send("everything clear")
});

// image service /image/{randomNumber}
// bild herunterladen
router.get("/image/*", (req: Request | any, res: Response) => {
    let statuscode: number = 404;
    for(const knownClient of clients) {
        if(req.url == knownClient.pushImage?.key) {
            res.writeHead(200, {"Content-Type":"image/png"});
            res.end(knownClient.pushImage?.file);
            statuscode = 200;
            break;
        }
    }
    if(statuscode != 200) {
        res.sendStatus(statuscode);
    }
});

// bild hochladen
router.post("/image/*", (req: Request | any, res: Response) => {
    let statuscode = 401;
    let registry: string | undefined = req.header("Token");
    if(registry != undefined) {
        statuscode = 404;
        if(isValidJson(req.rawBody)) {
            console.log(`trying to post image for registry ${registry} . . . `)
            for(const knownClient of clients) {
                if(registry == knownClient.registry) {
                    console.log("client found !");
                    let message: any = JSON.parse(req.rawBody);
                    knownClient.pushImage = new PushImage(Buffer.from(message.body.data, "base64") ,req.url);
                    statuscode = 200;
                }
            }
        }else {
            statuscode = 400;
        }
    }
    res.sendStatus(statuscode);
})

/*
*   gatway für die standard kommunikation
*/

router.post("/",(req: any, res: Response) => {
    let statuscode = 401;
    let registry: string | undefined = req.header("Token");
    if(registry != undefined) {
        statuscode = 404;
        for(const knownClient of clients) {
            if(registry == knownClient.registry) {
                knownClient.channel.once("message", (msg: string) => {
                    res.send(msg);
                })
                knownClient.channel.send(req.rawBody);
                statuscode = 200;
            }
        }
    }
    console.log(`gateway => registry: ${registry}, status: ${statuscode}`);
    if(statuscode != 200) {
        res.sendStatus(statuscode);
    }
});

// pushservice websocket
router.ws("/pushservice", (ws, req) => {
    ws.once("message", (msg: string) => {
        let newClient: client = new client(msg, ws);
        // prüfen ob der registry auf der whitelist/blacklist steht
        if(blacklist.enabled && !newClient.isBlacklisted(blacklist.keys) || !blacklist.enabled) {
            if( whitelist.enabled && newClient.isWhitelisted(whitelist.keys) || !whitelist.enabled ) {
                let alredyRegisterd: boolean = false;
                // prüfen ob der registry schon registriert ist
                clients.forEach((registerdClient: client) => {
                    if(registerdClient.registry == newClient.registry) {
                        alredyRegisterd = true;
                    }
                });
                if(!alredyRegisterd) {
                    // neuen client speichern
                    console.log(`Client with Registry ${newClient.registry} connected!`)
                    clients.push(newClient);
                    newClient.channel.on("close",() => {
                        let i: number = clients.indexOf(newClient);
                        if(i >= 0) {
                            console.log(`Client with Registry ${newClient.registry} unregistered!`);
                            clients.splice(i, 1);
                        }
                    });
                }else {
                    console.log(`Client whith Registry ${newClient.registry} already exists!`);
                    ws.close();
                }
            }else {
                console.log(`Client whith Registry ${newClient.registry} is not whitelisted!`);
                ws.close();
            }
        }else {
            console.log(`Client whith Registry ${newClient.registry} is blacklisted!`);
            ws.close();
        }
    });
    
    ws.on("ping", () => {
        ws.pong();
    });
});

router.post("/pushservice", (req: Request | any, res: Response) => {
    res.sendStatus(200);
    let registry: string | undefined = req.header("Token");
    if((registry != undefined || true) && isValidJson(req.rawBody)) {
        let notification = JSON.parse(req.rawBody);
        let options = {};

        switch (notification.server) {
            // push benachrichtigung an apple senden
            case 'apple.com':
                console.log("send notification to apple");
                var apn = require('apn');
                options = {
                    token: {
                        key: "/etc/ct-server/AuthKey_344JYMF7K5.p8",
                        keyId: "344JYMF7K5",
                        teamId: "3QLZPMLJ3W"
                    },
                    production: true,
                }
                var apnProvider = new apn.Provider(options);
                var note = new apn.Notification();
        
                note.alert = notification.notify.alert;
                note.topic = "com.dieklingel.app";
                note.sound = notification.sound + ".wav";
                note.mutableContent = 1;
                note.payload = {
                    "image-path": notification.notify["image-path"],
                    "action": notification.notify.action
                }
                
                let deviceToken = notification.token;
                apnProvider.send(note, deviceToken).then( (result: any) => {
                    console.log(result)
                });
                break;
            // push bena
            case 'googleapis.com':
                console.log("send notification to google");
                var request = require('request');

                var raw = {
                    "to":notification.token,
                    "collapse_key":"type_a",
                    "notification":{
                        "body":notification.notify.alert.body,
                        "title":notification.notify.alert.title,
                        "android_channel_id":"doorunit_notification_channel",
                    },
                    "data":{
                        "image-path": notification.notify["image-path"],
                        "action":notification.notify.action
                    }
                };

                options = {
                    'method': 'POST',
                    'url': 'https://fcm.googleapis.com/fcm/send',
                    'headers': {
                        'Content-Type': 'application/json',
                        'Authorization': 'key=AAAAguYv-qw:APA91bGcgXL7t53dDxqjqOa4QrMvOP5rCvBQP-fyGzqktU_gbPdLvBFq1sdr69L-l0g3nTIGSARee4ARgJ4ODgAtvwwb2BcmGo-mnnKj9wrLVgr2WoeVzDShUVrMkOr-Kbog9Co7jw6U'
                    },
                    body: JSON.stringify(raw)
                };
                request(options, function (error: any , response: any) {
                if (error) throw new Error(error);
                console.log(response.body);
                });

                break;
        }
    }
})

app.use("/", router);
app.listen(config.port);