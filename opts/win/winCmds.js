require(__app+'opts/baseCmds');

class ExecWinCommand extends ExecUnixCommand {
    constructor (cmd) {
        this.cmd=cmd;
    }
    exec(param_str) {

    }
}