class BaseCommand {
    constructor() {}
    exec(param_obj) {
        return true;
    }
}

class MissingCommand extends BaseCommand {
    constructor() {super();}
    exec(param_obj){
        return false;
    }

}

class CallbackCommand extends BaseCommand {
    constructor (func) {
        super();
        this.func=func;
    }

    exec(param_obj) {
        this.func(param_obj);
    }
}

module.exports = { BaseCommand, MissingCommand, CallbackCommand }    