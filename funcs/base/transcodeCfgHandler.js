//Usage:
//const { TranscodeCfgHandler } = require(__app+'funcs/base/transcodeCfgHandler');

class TranscodeCfgHandler {
    constructor (o,cd,rip_path,log,log_desc) {
        this.o=o;
        this.cd=cd;
        this.rip_path=rip_path;
        this.cfgs={};
        this.log = log;
        this.log_desc=log_desc;
            //log_desc.process_history
    }

    padStart(s,targetLength,padString) {
        targetLength = targetLength>>0; //floor if number or convert non-number to 0;
        padString = String(padString || ' ');
        if (s.length > targetLength) {
            return String(s);
        }
        else {
            targetLength = targetLength-s.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0,targetLength) + String(s);
        }
    }

    /**
     * @abstract
     * abstract method that should be overridden to instantiate a given transcode config object.
     * @param {String} cfg_fmt - transcode configuration format (flac, mp3, ogg, etc)
     */
    generate_cfg_obj(cfg_fmt) {
        return null;
    }

    /**
     * @abstract
     * abstrct method that allows cfg objects to finalize their initialization -- after new & state, for example.
     * @param {Object} cfg - initialized cfg object
     * @returns {Promise} Promise that cfg object has finalized self initialization 
     */
    finalize_cfg_initialization(cfg) {
        return new Promise((resolve,reject)=> {
            resolve(true);                
            //reject(false);    
        });
    }

    /**
     * @public
     * initialize cfg objects for each needed transcoded fmt.
     */
    init() {
        var cfg_count=this.o.cfg_transcode.length;
        var cfg_completion=0;
        return new Promise((resolve,reject)=>{
            this.o.cfg_transcode.forEach((cfg_fmt) => {
                var cfg=this.generate_cfg_obj(cfg_fmt);
                cfg.init()
                    .then((ok)=> {
                        this.finalize_cfg_initialization(cfg)
                            .then((ok)=>{ 
                                this.cfgs[cfg_fmt]=cfg;
                                cfg_completion++;
                                if (cfg_completion==cfg_count) {
                                    resolve(cfg_count);
                                } 
                            })  
                            .catch((err)=>{ this.log.err(err); reject(err);});
                    })
                    .catch((err)=>{ this.log.err(err); reject(err);});          
            });
        });
    }

    /**
     * @public Process all transcode cfgs on a track
     * @param {Number} t - track number
     * @param {Object} input_obj - input object (likely a file)
     */
    process(t,input_obj) {
        Object.keys(this.cfgs).forEach((cfg)=> {
            this.cfgs[cfg].process_track(t,input_obj);            
        });
    }

    /**
     * @public Process a given transcode cfg on a track
     * @param {Number} t - track number
     * @param {Object} input_obj - input object (likely a file)
     */
    process_cfg(cfg,t,input_obj) {
        this.cfgs[cfg].process_track(t,input_obj);            
    }

    /**
     * @public Process any unprocessed history
     * @param {Number} max_track - Max number of backlogged tracks to process 
     */
    process_history(max_track) {
        Object.keys(this.cfgs).forEach((cfg)=> {
            this.log.log(`${this.log_desc.history_desc} ${cfg}`);
            this.cfgs[cfg].process_history(max_track);                        
        });        
    }

}

module.exports = { TranscodeCfgHandler };