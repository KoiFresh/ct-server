"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushImage = exports.client = void 0;
var client = /** @class */ (function () {
    function client(registry, wsocket) {
        this.pushImage = undefined;
        this.registry = registry;
        this.channel = wsocket;
    }
    client.prototype.isListed = function (key, keys) {
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
    client.prototype.isWhitelisted = function (keys) {
        return this.isListed(this.registry, keys);
    };
    /*
    *   Prüfen ob das Registry des Clients in einer Blacklist enthalten ist.
    */
    client.prototype.isBlacklisted = function (keys) {
        return this.isListed(this.registry, keys);
    };
    return client;
}());
exports.client = client;
var PushImage = /** @class */ (function () {
    function PushImage(file, key) {
        this.file = file;
        this.key = key;
    }
    return PushImage;
}());
exports.PushImage = PushImage;
//# sourceMappingURL=client.js.map