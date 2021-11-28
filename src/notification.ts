import { CtClient } from "ctclient";
import { appendFile, unwatchFile } from "fs";
import { Pushserver, IApplePushOptions, IGooglePushOptions } from "./pushserver";


/**
 * represents a notification object, from the doorunit, which has to be pushed to a end device or to another server
 * @author Kai Mayer
 * @version 1
 */

const {google} = require('googleapis');
 var MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
 var SCOPES = [MESSAGING_SCOPE];

export class PushNotification {
    private _data : post;
    private static _apnProvider : any | undefined = undefined;
    private static _accessToken : string | undefined = undefined;
    public static applePushOptions : IApplePushOptions | undefined = undefined;
    public static googlePushOptions : IGooglePushOptions | undefined = undefined;

    constructor(data : post) {
        this._data = data;
        if(PushNotification._apnProvider === undefined && PushNotification.applePushOptions !== undefined) {
            let options = {
                token: {
                    key: PushNotification.applePushOptions.KeyPath,
                    keyId: PushNotification.applePushOptions.KeyId,
                    teamId: PushNotification.applePushOptions.TeamId
                },
                production: PushNotification.applePushOptions.Production ?? false
            }
            let apn = require('apn');
            PushNotification._apnProvider = new apn.Provider(options);
        }
        if(PushNotification._accessToken === undefined) {
            // fcm http v1 
            this.getAccressToken().then((token) => {
                PushNotification._accessToken = token;
                console.log("access token: ", token);
            })
            // fcm http v1 - end
        }
    }

    getAccressToken() {
        return new Promise<string>(function(resolve, reject) {
            var key = require('/etc/ct-server/dieklingel-firebase-adminsdk-cl3a8-0fa91fe32e.json');
            var jwtClient = new google.auth.JWT(
                key.client_email,
                null,
                key.private_key,
                SCOPES,
                null
            );
            jwtClient.authorize(function(err : any, tokens : any) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(tokens.access_token);
            });
        });
    }     

    /**
     * send the notification to the specific server
     * @returns the number of 
     */
    public push() : boolean {
        let psuhWasSuccesfully : boolean = false;
        switch(this._data.Server) {
            /**
             * apns request to send a push notification
             */
            case Pushserver.Apple:
                if(PushNotification.applePushOptions !== undefined) {
                    let apn = require('apn');
                    let note = new apn.Notification();
        
                    note.alert = this._data.Notify.Alert;
                    note.alert = {
                        title: this._data.Notify.Alert.Title,
                        body: this._data.Notify.Alert.Body
                    }
                    note.topic = "com.dieklingel.app";
                    note.sound = "normal_sound.wav";
                    note.mutableContent = 1;
                    note.payload = {
                        "ImageUrl": this._data.ImageUrl,
                        "action": this._data.Notify.Action,
                    }
                    let deviceToken = this._data.Token;
                    PushNotification._apnProvider.send(note, deviceToken).then( (result: any) => { console.log("Apple: ", result) });
                    psuhWasSuccesfully = true;  
                } 
                break;
            /**
             * firebase request to send a push notification
             */
            case Pushserver.Google:
                if(PushNotification.googlePushOptions !== undefined) {
                    let request = require('request');
                    // with image but unstabel
                    let raw = {
                        "to": this._data.Token,
                        "priority":"high",
                        "data":{
                            "Body": this._data.Notify.Alert.Body,
                            "Title": this._data.Notify.Alert.Title,
                            "ImageUrl": this._data.ImageUrl,
                        } 
                    }
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
                    let options = {
                        "method": "POST",
                        "url": "https://fcm.googleapis.com/fcm/send",
                        "headers": {
                            "Content-Type": "application/json",
                            "Authorization": PushNotification.googlePushOptions.AuthorizationToken
                        },
                        "body": JSON.stringify(raw)
                    };
                    request(options, (error: any , response: any) => {
                        if (error) throw new Error(error);
                        console.log("Google: " + response.body);
                    });
                    psuhWasSuccesfully = true;
                }
                break;
        }
        return psuhWasSuccesfully;
    }

    get data() : post {
       return this._data; 
    }
}