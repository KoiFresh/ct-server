"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ctserver_1 = require("./ctserver");
var notification_1 = require("./notification");
/**
 * ct-server application
 * @author Kai Mayer
 * @version 1.1
 */
notification_1.PushNotification.applePushOptions = {
    KeyId: "344JYMF7K5",
    KeyPath: "/etc/ct-server/AuthKey_344JYMF7K5.p8",
    TeamId: "3QLZPMLJ3W",
    Production: false
};
notification_1.PushNotification.googlePushOptions = {
    AuthorizationToken: "key=AAAAguYv-qw:APA91bGcgXL7t53dDxqjqOa4QrMvOP5rCvBQP-fyGzqktU_gbPdLvBFq1sdr69L-l0g3nTIGSARee4ARgJ4ODgAtvwwb2BcmGo-mnnKj9wrLVgr2WoeVzDShUVrMkOr-Kbog9Co7jw6U"
};
function main(args) {
    process.title = "ct-server";
    console.log("process name:", process.title);
    console.log("process id:", process.pid);
    console.log("UNSTABLE");
    var server = new ctserver_1.CtServer();
    server.run(3381);
    return 1;
}
main(process.argv.slice(2));
//# sourceMappingURL=index.js.map