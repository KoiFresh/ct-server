"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CtServer = void 0;
var client_1 = require("client");
var express_1 = __importDefault(require("express"));
var express_ws_1 = __importDefault(require("express-ws"));
/**
 * provides the baseclass for the sever application
 * @author Kai Mayer
 */
var CtServer = /** @class */ (function () {
    function CtServer() {
        this.app = express_1.default();
        this.router = express_1.default.Router();
        this.clients = new Array();
        // add websocket compatibility to the express router https://www.npmjs.com/package/express-ws
        express_ws_1.default(this.app);
        /**
         * handles http requests for path /
         */
        this.router.get("/", function (req, res) {
            res.send("welcome");
        });
        /**
         * handles ws requests for path /push/notifications
         */
        this.router.ws("/push/subscribe", function (ws, req) {
            var cloient = new client_1.Client();
            //let client : Client = new Client(ws);
            //clienti.socket?.send("Hallo Welt");
            //(<client>ws).send("Hello World!");
            //(ws as client).registry = "Kai";
            //console.log((ws as client).registryi());
        });
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
//# sourceMappingURL=server.js.map