const Beam = require('beam-client-node');
const Interactive = require('beam-interactive-node');
const reconnector = require('./lib/reconnector');

const channelId = 67559;

const beam = new Beam();

beam.use('oauth', {
    tokens: {
        access: 'TnH2tqDTnqt9ggJSrIU5AJwB0oWYZtYRV9uEeoYrNuaXi1djxroEFTYgvUo7ToDn',
        expires: Date.now() + (365 * 24 * 60 * 60 * 1000)
    },
});

beam.request('GET', `users/current`)
    .then(() => getControls())
    .then(() => launchInteractive(beam, channelId))
    .catch(err => {
        if (err.message !== undefined && err.message.body !== undefined) {
            console.log(err);
        } else {
            throw err;
        }
    });

/**
 * Our report handler, entry point for data from beam
 * @param  {Object} report Follows the format specified in the latest tetris.proto file
 */
function handleReport(report) {
    if (report.users.active >= 1) {
        console.log(report);
    }
}

function launchInteractive(beam, id) {
    return beam.game.join(id).then(details => {
        console.log('Authenticated, Spinning up Interactive Connection');
        robot = new Interactive.Robot({
            remote: details.body.address,
            key: details.body.key,
            channel: id
        });
        robot.on('report', handleReport);
        robot.on('error', code => console.log(code));
        reconnector(robot, launchInteractive.bind(this, beam, id), onInteractiveConnect);
        return performRobotHandShake(robot);
    });
}

function onInteractiveConnect(err) {
    if (err) {
        console.log('Theres a problem connecting to Interactive');
        console.log(err);
    } else {
        console.log('Connected to Interactive');
    }
}

function performRobotHandShake(robot) {
    return new Promise((resolve, reject) => {
        robot.handshake(err => {
            if (err) {
                reject(err);
            }
            resolve(robot);
        });
    });
}

function getControls() {
    return beam.request('GET', `interactive/versions/17145?code=ddah1qiw`)
        .then(res => {
            if (!res.body.controls) {
                throw new Error('Incorrect version id or share code in your config or no control layout saved for that version.');
            }
            return res.body.controls;
        }).catch(() => {
            throw new Error('Problem retrieving controls');
        });
}