"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotification = void 0;
var pushserver_1 = require("./pushserver");
/**
 * represents a notification object, from the doorunit, which has to be pushed to a end device or to another server
 * @author Kai Mayer
 * @version 1
 */
var google = require('googleapis').google;
var MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
var SCOPES = [MESSAGING_SCOPE];
var PushNotification = /** @class */ (function () {
    function PushNotification(data) {
        var _a;
        this._data = data;
        if (PushNotification._apnProvider === undefined && PushNotification.applePushOptions !== undefined) {
            var options = {
                token: {
                    key: PushNotification.applePushOptions.KeyPath,
                    keyId: PushNotification.applePushOptions.KeyId,
                    teamId: PushNotification.applePushOptions.TeamId
                },
                production: (_a = PushNotification.applePushOptions.Production) !== null && _a !== void 0 ? _a : false
            };
            var apn = require('apn');
            PushNotification._apnProvider = new apn.Provider(options);
        }
        if (PushNotification._accessToken === undefined) {
            // fcm http v1 
            this.getAccressToken().then(function (token) {
                PushNotification._accessToken = token;
                console.log("access token: ", token);
            });
            // fcm http v1 - end
        }
    }
    PushNotification.prototype.getAccressToken = function () {
        return new Promise(function (resolve, reject) {
            var key = require('/etc/ct-server/dieklingel-firebase-adminsdk-cl3a8-0fa91fe32e.json');
            var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, SCOPES, null);
            jwtClient.authorize(function (err, tokens) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(tokens.access_token);
            });
        });
    };
    /**
     * send the notification to the specific server
     * @returns the number of
     */
    PushNotification.prototype.push = function () {
        var psuhWasSuccesfully = false;
        switch (this._data.Server) {
            /**
             * apns request to send a push notification
             */
            case pushserver_1.Pushserver.Apple:
                if (PushNotification.applePushOptions !== undefined) {
                    var apn = require('apn');
                    var note = new apn.Notification();
                    note.alert = this._data.Notify.Alert;
                    note.alert = {
                        title: this._data.Notify.Alert.Title,
                        body: this._data.Notify.Alert.Body
                    };
                    note.topic = "com.dieklingel.app";
                    note.sound = "normal_sound.wav";
                    note.mutableContent = 1;
                    note.payload = {
                        "ImageUrl": this._data.ImageUrl,
                        "action": this._data.Notify.Action,
                    };
                    var deviceToken = this._data.Token;
                    PushNotification._apnProvider.send(note, deviceToken).then(function (result) { console.log("Apple: ", result); });
                    psuhWasSuccesfully = true;
                }
                break;
            /**
             * firebase request to send a push notification
             */
            case pushserver_1.Pushserver.Google:
                if (PushNotification.googlePushOptions !== undefined) {
                    var request = require('request');
                    // with image but unstabel
                    var raw = {
                        "to": this._data.Token,
                        "priority": "high",
                        "data": {
                            "Body": this._data.Notify.Alert.Body,
                            "Title": this._data.Notify.Alert.Title,
                            "ImageUrl": this._data.ImageUrl,
                        }
                    };
                    // without image but stable
                    /*let raw = {
                        "to": this.data.Token,
                        "notification":{
                            "body": this.data.Notify.Alert.Body,
                            "title": this.data.Notify.Alert.Title,
                            "priority":"high",
                            "color":"#ffa100",
                            "icon":"icon_16x16"
                        },
                        "data":{
                            "ImageUrl": this.data.ImageUrl
                        }
                    }; */
                    console.log(this._data.ImageUrl);
                    var options = {
                        "method": "POST",
                        "url": "https://fcm.googleapis.com/fcm/send",
                        "headers": {
                            "Content-Type": "application/json",
                            "Authorization": PushNotification.googlePushOptions.AuthorizationToken
                        },
                        "body": JSON.stringify(raw)
                    };
                    request(options, function (error, response) {
                        if (error)
                            throw new Error(error);
                        console.log("Google: " + response.body);
                    });
                    psuhWasSuccesfully = true;
                }
                break;
        }
        return psuhWasSuccesfully;
    };
    Object.defineProperty(PushNotification.prototype, "data", {
        get: function () {
            return this._data;
        },
        enumerable: false,
        configurable: true
    });
    PushNotification._apnProvider = undefined;
    PushNotification._accessToken = undefined;
    PushNotification.applePushOptions = undefined;
    PushNotification.googlePushOptions = undefined;
    return PushNotification;
}());
exports.PushNotification = PushNotification;
//# sourceMappingURL=notification.js.map