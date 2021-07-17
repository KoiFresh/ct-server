"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var path_1 = __importDefault(require("path"));
var express_1 = __importDefault(require("express"));
var express_ws_1 = __importDefault(require("express-ws"));
var application_1 = require("./application");
var client_1 = require("./client");
/*
*   Anwendungsname setzen und ausgeben
*/
process.title = application_1.application.NAME;
console.log("process name:", process.title);
console.log("process id:", process.pid);
/*
*    Globale Varibalen definieren
*/
var config = JSON.parse(fs.readFileSync(path_1.default.join(application_1.application.BASEPATH, "config.json"), "utf-8"));
var blacklist = JSON.parse(fs.readFileSync(path_1.default.join(application_1.application.BASEPATH, "blacklist.json"), "utf-8"));
var whitelist = JSON.parse(fs.readFileSync(path_1.default.join(application_1.application.BASEPATH, "whitelist.json"), "utf-8"));
var clients = [];
/*
*    Express Server Einrichten
*/
var app = express_1.default();
var router = express_1.default.Router();
express_ws_1.default(app); // websocket kompatibilität hinzufügen
/*
*   überprüfen ob es ein valides json format ist
*/
function isValidJson(val) {
    if (val) {
        try {
            JSON.parse(val);
        }
        catch (e) {
            return false;
        }
        return true;
    }
    return false;
}
/*
*   rawBody von Nachrichten auslesen
*/
var rawBody = function (req, res, next) {
    req.setEncoding("utf-8");
    req.rawBody = "";
    req.on("data", function (chunk) { req.rawBody += chunk; });
    req.on("end", function () { next(); });
};
app.use(rawBody);
/*
*    Router konfigurieren
*/
router.get("/", function (req, res) {
    res.sendStatus(204);
});
router.post("/development", function (req, res) {
    res.send("everything clear");
});
// image service /image/{randomNumber}
// bild herunterladen
router.get("/image/*", function (req, res) {
    var _a, _b;
    var statuscode = 404;
    for (var _i = 0, clients_1 = clients; _i < clients_1.length; _i++) {
        var knownClient = clients_1[_i];
        if (req.url == ((_a = knownClient.pushImage) === null || _a === void 0 ? void 0 : _a.key)) {
            res.writeHead(200, { "Content-Type": "image/png" });
            res.end((_b = knownClient.pushImage) === null || _b === void 0 ? void 0 : _b.file);
            statuscode = 200;
            break;
        }
    }
    if (statuscode != 200) {
        res.sendStatus(statuscode);
    }
});
// bild hochladen
router.post("/image/*", function (req, res) {
    var statuscode = 401;
    var registry = req.header("Token");
    if (registry != undefined) {
        statuscode = 404;
        if (isValidJson(req.rawBody)) {
            console.log("trying to post image for registry " + registry + " . . . ");
            for (var _i = 0, clients_2 = clients; _i < clients_2.length; _i++) {
                var knownClient = clients_2[_i];
                if (registry == knownClient.registry) {
                    console.log("client found !");
                    var message = JSON.parse(req.rawBody);
                    knownClient.pushImage = new client_1.PushImage(Buffer.from(message.body.data, "base64"), req.url);
                    statuscode = 200;
                }
            }
        }
        else {
            statuscode = 400;
        }
    }
    res.sendStatus(statuscode);
});
/*
*   gatway für die standard kommunikation
*/
router.post("/", function (req, res) {
    var statuscode = 401;
    var registry = req.header("Token");
    if (registry != undefined) {
        statuscode = 404;
        for (var _i = 0, clients_3 = clients; _i < clients_3.length; _i++) {
            var knownClient = clients_3[_i];
            if (registry == knownClient.registry) {
                knownClient.channel.once("message", function (msg) {
                    res.send(msg);
                });
                knownClient.channel.send(req.rawBody);
                statuscode = 200;
            }
        }
    }
    console.log("gateway => registry: " + registry + ", status: " + statuscode);
    if (statuscode != 200) {
        res.sendStatus(statuscode);
    }
});
// pushservice websocket
router.ws("/pushservice", function (ws, req) {
    ws.once("message", function (msg) {
        var newClient = new client_1.client(msg, ws);
        // prüfen ob der registry auf der whitelist/blacklist steht
        if (blacklist.enabled && !newClient.isBlacklisted(blacklist.keys) || !blacklist.enabled) {
            if (whitelist.enabled && newClient.isWhitelisted(whitelist.keys) || !whitelist.enabled) {
                var alredyRegisterd_1 = false;
                // prüfen ob der registry schon registriert ist
                clients.forEach(function (registerdClient) {
                    if (registerdClient.registry == newClient.registry) {
                        alredyRegisterd_1 = true;
                    }
                });
                if (!alredyRegisterd_1) {
                    // neuen client speichern
                    console.log("Client with Registry " + newClient.registry + " connected!");
                    clients.push(newClient);
                    newClient.channel.on("close", function () {
                        var i = clients.indexOf(newClient);
                        if (i >= 0) {
                            console.log("Client with Registry " + newClient.registry + " unregistered!");
                            clients.splice(i, 1);
                        }
                    });
                }
                else {
                    console.log("Client whith Registry " + newClient.registry + " already exists!");
                    ws.close();
                }
            }
            else {
                console.log("Client whith Registry " + newClient.registry + " is not whitelisted!");
                ws.close();
            }
        }
        else {
            console.log("Client whith Registry " + newClient.registry + " is blacklisted!");
            ws.close();
        }
    });
    ws.on("ping", function () {
        ws.pong();
    });
});
router.post("/pushservice", function (req, res) {
    res.sendStatus(200);
    var registry = req.header("Token");
    if ((registry != undefined || true) && isValidJson(req.rawBody)) {
        var notification = JSON.parse(req.rawBody);
        var options = {};
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
                };
                var apnProvider = new apn.Provider(options);
                var note = new apn.Notification();
                note.alert = notification.notify.alert;
                note.topic = "com.dieklingel.app";
                note.sound = notification.sound + ".wav";
                note.mutableContent = 1;
                note.payload = {
                    "image-path": notification.notify["image-path"],
                    "action": notification.notify.action
                };
                var deviceToken = notification.token;
                apnProvider.send(note, deviceToken).then(function (result) {
                    console.log(result);
                });
                break;
            // push bena
            case 'googleapis.com':
                console.log("send notification to google");
                var request = require('request');
                var raw = {
                    "to": notification.token,
                    "collapse_key": "type_a",
                    "notification": {
                        "body": notification.notify.alert.body,
                        "title": notification.notify.alert.title,
                        "android_channel_id": "doorunit_notification_channel",
                    },
                    "data": {
                        "image-path": notification.notify["image-path"],
                        "action": notification.notify.action
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
                request(options, function (error, response) {
                    if (error)
                        throw new Error(error);
                    console.log(response.body);
                });
                break;
        }
    }
});
app.use("/", router);
app.listen(config.port);
//# sourceMappingURL=index.js.map