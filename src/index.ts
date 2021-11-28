import { CtServer } from "./ctserver";
import { PushNotification } from "./notification";

/**
 * ct-server application 
 * @author Kai Mayer
 * @version 1.1
 */

PushNotification.applePushOptions = {
    KeyId: "344JYMF7K5",
    KeyPath: "/etc/ct-server/AuthKey_344JYMF7K5.p8",
    TeamId: "3QLZPMLJ3W",
    Production: false
}

PushNotification.googlePushOptions = {
    AuthorizationToken: "key=AAAAguYv-qw:APA91bGcgXL7t53dDxqjqOa4QrMvOP5rCvBQP-fyGzqktU_gbPdLvBFq1sdr69L-l0g3nTIGSARee4ARgJ4ODgAtvwwb2BcmGo-mnnKj9wrLVgr2WoeVzDShUVrMkOr-Kbog9Co7jw6U"
}

function main(args : string[]) : number {
    process.title = "ct-server"; 
    console.log("process name:", process.title);
    console.log("process id:", process.pid);
    console.log("UNSTABLE");



    let server: CtServer = new CtServer();
    server.run(3381);

    return 1;
}
main(process.argv.slice(2));