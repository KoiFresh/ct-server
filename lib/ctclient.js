"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushImage = exports.client1 = exports.CtClient = void 0;
/**
 * represents a doorunit client, connected to the server over ws
 * @author Kai Mayer
 * @version 1
 */
var CtClient = /** @class */ (function () {
    function CtClient(socket) {
        this._imageUri = Buffer.alloc(0);
        this._registry = "";
        this._isRegisterd = false;
        this._socket = undefined;
        if (socket !== undefined) {
            this.socket = socket;
        }
    }
    Object.defineProperty(CtClient.prototype, "imageUri", {
        /**
         * get the image uri
         */
        get: function () {
            return this._imageUri;
        },
        /**
         * set the image uri
         */
        set: function (uri) {
            this._imageUri = uri;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CtClient.prototype, "registry", {
        /**
         * get the registry token
         */
        get: function () {
            return this._registry;
        },
        /**
         * set the registry token
         */
        set: function (registry) {
            this.registry = registry;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CtClient.prototype, "socket", {
        /**
         * get the socket
         */
        get: function () {
            return this._socket;
        },
        /**
         * set the socket
         */
        set: function (socket) {
            var _this = this;
            this._socket = socket;
            if (this._socket !== undefined) {
                this._socket.once("message", function (message) {
                    // first message
                    _this._registry = message.toString();
                    _this._isRegisterd = true;
                    console.log("[ctclient.ts] new client with registry ", _this._registry, " connected");
                });
                this._socket.on("close", function () {
                    _this._isRegisterd = false;
                    console.log("[ctclient.ts] client with registry ", _this._registry, " disconnected");
                });
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CtClient.prototype, "isRegisterd", {
        /**
         * get the registerd state
         */
        get: function () {
            return this._isRegisterd;
        },
        enumerable: false,
        configurable: true
    });
    return CtClient;
}());
exports.CtClient = CtClient;
var client1 = /** @class */ (function () {
    function client1(registry, wsocket) {
        this.pushImage = undefined;
        this.registry = registry;
        this.channel = wsocket;
    }
    client1.prototype.isListed = function (key, keys) {
        var result = false;
        for (var i = 0; i < keys.length; i++) {
            if (key == keys[i]) {
                result = true;
            }
        }
        return result;
    };
    /*
    *   Prüfen ob das Registry des Clients in einer Whitelist enthalten ist.
    */
    client1.prototype.isWhitelisted = function (keys) {
        return this.isListed(this.registry, keys);
    };
    /*
    *   Prüfen ob das Registry des Clients in einer Blacklist enthalten ist.
    */
    client1.prototype.isBlacklisted = function (keys) {
        return this.isListed(this.registry, keys);
    };
    return client1;
}());
exports.client1 = client1;
var PushImage = /** @class */ (function () {
    function PushImage(file, key) {
        this.file = file;
        this.key = key;
    }
    return PushImage;
}());
exports.PushImage = PushImage;
//# sourceMappingURL=ctclient.js.map