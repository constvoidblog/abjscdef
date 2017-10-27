const { BaseCommand } = require(__app+'opts/baseCmds');
const { spawn } = require('child_process');

class ExecUnixCommand extends BaseCommand {
    constructor (cmd) {
        super();
        this.cmd=cmd;
    }

    exec(log,param_array,callback) {
        var stdout='';
        var stderr='';
        log.log(`running ${this.cmd} ${param_array}`);
        var c = spawn(this.cmd,param_array);
        c.stdout.on('data',(data)=> { stdout+=data; });
        c.stderr.on('data',(data)=> { stderr+=data; });
        c.on('close',(code)=>{ callback(code, stdout, stderr);});
    }

    exec_realtime_io(log,param_array,process_stdout_cb,process_stderr_cb,close_cb) {
        var stdout='';
        var stderr='';
        log.log(`running ${this.cmd} ${param_array}`);
        var c = spawn(this.cmd,param_array);
        c.stdout.on('data',(data)=> { stdout+=data; process_stdout_cb(data); });
        c.stderr.on('data',(data)=> { stderr+=data; process_stderr_cb(data); });
        c.on('close',(code)=>{ close_cb(code, stdout, stderr);});
    }

    ignore_io(log,data) {
        log.log(`${data}`);
    }
}

class ExecUnixRippingCommand extends ExecUnixCommand {
    constructor (cmd) {
        super(cmd);
    }
}

module.exports = { ExecUnixCommand }