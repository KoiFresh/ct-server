"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CtServer = void 0;
var ctclient_1 = require("./ctclient");
var express_1 = __importDefault(require("express"));
var express_ws_1 = __importDefault(require("express-ws"));
var notification_1 = require("./notification");
/**
 * provides the base class for the sever application
 * @author Kai Mayer
 * @version 1
 * @alpha
 * if this server is run on dev.ct.dieklingel.com then it is not secure to use it. It is in a proof of concept mode, where we try things and change them
 * on demand. It is recommended to use the ct.dieklingel.com server.
 * every method market as @alpha is in try mode, so it could be removed for some reason, or stop working some day, or worser has never worked correctly
 */
var _200_PUSH_SUCCESFULL = "200 : The message was successfully pushed";
var _400_PUSH_ABORTED = "400 : The message was aborted because of an bad request";
var _401_MISSING_CLIENT_REGISTRY = "401 : The request could not be authenticated";
var _404_CLIENT_NOT_FOUND = "404 : The requested client could not be found on this server";
var _406_NO_IMAGE_AVAILABLE = "406 : For the requested client is no image available";
var CtServer = /** @class */ (function () {
    function CtServer() {
        var _this = this;
        this.app = express_1.default();
        this.router = express_1.default.Router();
        this.clients = new Array();
        /**
         * handles ws requests for a doorunit channel push subscribtion
         * path: /push/subscribe
         */
        this.wsPushSubscribe = function (ws, req) {
            var _a, _b;
            var client = new ctclient_1.CtClient(ws);
            (_a = client.socket) === null || _a === void 0 ? void 0 : _a.once("message", function (message) {
                var _a;
                var exists = _this.clients.find(function (element) { return element.isRegisterd && element.registry === client.registry; });
                if (exists === undefined) {
                    _this.clients.push(client);
                }
                else {
                    (_a = client.socket) === null || _a === void 0 ? void 0 : _a.close();
                }
            });
            (_b = client.socket) === null || _b === void 0 ? void 0 : _b.once("close", function () {
                var index = _this.clients.indexOf(client);
                if (index > -1) {
                    _this.clients.splice(index, 1);
                }
            });
        };
        /**
         * handles the webosocket request for uploading the livestream
         * @alpha
         */
        this.postMediaStreamSend = function (req, res) {
            //let imgs : b46Uri[] = (<string>req.body).split("\n");
            //console.log(imgs.length);
            _this.singlestream = Buffer.from(req.body, "base64"); //Buffer.from(req.body);
            //this.singlestream = req.body;
            /*for(let i = 0; i < this.singlestream.length; i++)
            {
                this.singlestream[i] = (this.singlestream[i] == 255) ? 0 : this.singlestream[i];
            } */
            //console.log(this.singlestream[13]);
            res.send("");
        };
        /**
         * handles post requests for posting a message on the gateway
         * path: /gateway/post
         */
        this.postGatewayPost = function (req, res) {
            var _a, _b, _c, _d;
            var registry = (_a = req.header("Token")) !== null && _a !== void 0 ? _a : (_b = req.query.Token) === null || _b === void 0 ? void 0 : _b.toString();
            console.log("Post on Gateway", registry);
            if (registry !== undefined) {
                var exists = _this.clients.find(function (element) { return element.isRegisterd && element.registry === registry; });
                if (exists !== undefined) {
                    console.log("client exists: wait for response");
                    (_c = exists.socket) === null || _c === void 0 ? void 0 : _c.once("message", function (message) {
                        console.log("200", _200_PUSH_SUCCESFULL, registry);
                        res.send(message);
                    });
                    (_d = exists.socket) === null || _d === void 0 ? void 0 : _d.send(req.body);
                }
                else {
                    /**
                     * @author Kai Mayer
                     * no we are at some critical point
                     * describtion:
                     * there could be thousends of instances runnig in the world wide web ... so its possible for each doorunit to be
                     * connected to a differnt one then the instance the gateway request was send to. In this case it should be
                     * possible to send the request to the next ct-server, which runs hopefully with the same source code than this
                     * and the instance can look if the doorunit is connected to himself, if we go one step deeper and repeate the process.
                     * Thats the idear of forwarding a message throug a network of trusted ct-servers. So also an untrusted ct-server could send to an trusted
                     * ct-server, but an trusted ct-server would only forward to a set of other trusted ct-server. In this case it is possible to run your ct-server fully at home
                     * and only use this server to forward messages, the same we could do on an image request, here the problem is, you would never reach an untrusted server, since
                     * someone is setting up a trusted server and connect it to a single or worser a couple of untrusted servers.
                     * Another point is, that if two instances of ct-server are connected to each other and the doorunit is connected to none of them, we end in endless recursion.
                     * and at this moment i think it is not a really goot idea to buidl a network of servers ... maybe in the future
                     * solution:
                     * send back a not found response
                     */
                    console.log("404", _404_CLIENT_NOT_FOUND, registry);
                    res.status(404).send(_404_CLIENT_NOT_FOUND);
                }
            }
            else {
                console.log("401", _401_MISSING_CLIENT_REGISTRY);
                res.status(401).send(_401_MISSING_CLIENT_REGISTRY);
            }
        };
        /**
         * handles get requests for posting a push message to the app
         * path: /push/post
         */
        this.postPushPost = function (req, res) {
            var registry = req.header("Token");
            var post = req.body;
            if (registry !== undefined) {
                var exists = _this.clients.find(function (element) { return element.isRegisterd && element.registry === registry; });
                if (exists !== undefined && exists.isRegisterd) {
                    if (post.Image !== undefined) {
                        console.log("image was here");
                        exists.imageUri = Buffer.from(post.Image, "base64");
                    }
                    post.ImageUrl = "https://" + req.headers.host + "/client/preview?Token=" + exists.registry;
                }
            }
            var notification = new notification_1.PushNotification(post);
            if (notification.push()) {
                res.status(200).send(_200_PUSH_SUCCESFULL);
            }
            else {
                res.status(400).send(_400_PUSH_ABORTED);
            }
        };
        /**
         * handles get request for image download
         * path: /client/preview
         */
        this.getClientPreview = function (req, res) {
            var _a, _b;
            var registry = (_a = req.header("Token")) !== null && _a !== void 0 ? _a : (_b = req.query.Token) === null || _b === void 0 ? void 0 : _b.toString();
            if (registry !== undefined) {
                var exists = _this.clients.find(function (element) { return element.isRegisterd && element.registry === registry; });
                if (exists !== undefined) {
                    if (exists.imageUri.length > 0) {
                        res.writeHead(200, { "Content-Type": "image/png" });
                        res.end(exists.imageUri);
                    }
                    else {
                        res.status(406).send(_406_NO_IMAGE_AVAILABLE);
                    }
                }
                else {
                    res.status(404).send(_404_CLIENT_NOT_FOUND);
                }
            }
            else {
                res.status(401).send(_401_MISSING_CLIENT_REGISTRY);
            }
        };
        // add websocket compatibility to the express router https://www.npmjs.com/package/express-ws
        express_ws_1.default(this.app);
        // add middleware for the express app
        this.app.use(express_1.default.json({ limit: '50MB' }));
        this.app.use(express_1.default.text({ limit: '50MB' }));
        //this.app.use(express.raw({type: 'image/png'}));
        /**
         * handles http requests for path /
         */
        this.router.get("/", function (req, res) {
            res.send("none");
            //res.send(JSON.stringify(this.clients));
        });
        /**
         * subscribe for push notifications
         */
        this.router.ws("/push/subscribe", this.wsPushSubscribe);
        /**
         * @alpha
         * send images over websocket stream
         */
        this.router.post("/media/stream/send", this.postMediaStreamSend);
        /**
         * post message on the gateway
         */
        this.router.post("/gateway/post", this.postGatewayPost);
        /**
         * post push notification
         */
        this.router.post("/push/post", this.postPushPost);
        /**
         * get the preview image from a client
         */
        this.router.get("/client/preview", this.getClientPreview);
        /**
         * @deprecated
         * @author Kai Mayer
         * outdated since 2021-10-15
         * replaced by /push/post
         */
        this.router.post("/image/*", function (req, res) {
            var _a, _b;
            var registry = (_a = req.header("Token")) !== null && _a !== void 0 ? _a : (_b = req.query.Token) === null || _b === void 0 ? void 0 : _b.toString();
            if (registry !== undefined) {
                var exists = _this.clients.find(function (element) { return element.isRegisterd && element.registry === registry; });
                if (exists !== undefined) {
                    if (req.body.body.data != undefined) {
                        exists.imageUri = Buffer.from(req.body.body.data, "base64");
                    }
                }
            }
            res.status(418).send("I am a Teapot, go find someone who makes coffee - This method is deprecated use /push/post instead");
        });
        /**
         * @deprecated
         * @author Kai Mayer
         * outdated since 2021-10-15
         * replaced by /gateway/post
         */
        this.router.post("/", this.postGatewayPost);
        /**
         * @deprecated
         * @author Kai Mayer
         * outdated since 2021-10-15
         * replaced by /push/post
         */
        this.router.post("/pushservice", this.postPushPost);
        /**
         * handle 404 not found get request
         */
        this.router.get("*", function (req, res) {
            res.status(404).send("404 NOT FOUND Exception");
        });
    }
    /**
     * starts the server application
     * @param port runs the server on the given port
     */
    CtServer.prototype.run = function (port) {
        this.app.use("/", this.router);
        this.app.listen(port);
    };
    return CtServer;
}());
exports.CtServer = CtServer;
//# sourceMappingURL=ctserver.js.map