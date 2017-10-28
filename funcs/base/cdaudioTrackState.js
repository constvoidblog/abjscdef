//Usage:
//const { CDAudioTrackState } = require(__app+'funcs/base/cdaudioTrackState');

/**
 * The idea is to use this class to figure out how to 
 */

//nodeJs libs
const fs=require('fs');
const path=require('path');

//abjscdef libs
const { StateStatus } = require(__app+'funcs/state');

/**
 * Stateful cd tracks, extend for processing individual tracks 
 */
class CDAudioTrackState {
    /**
     * Logging functions
     * @typedef {Object} LogStructure
     * @property {function} log - stdout logging function
     * @property {function} err - stderr logging function
     */

    /**
      * Log description
      @typedef {Object} LogDescription
      @property {String} starting_desc - Description of processing that is starting
      @property {String} completed_desc - Description of processing that just completed.
      @property {String} backlog_desc - Description of processing that just completed.      
      */

    /** Prepare a cd's worth of audio tracks for processing
     * @param {Object} cd - cd object
     * @param {Object} o - option object
     * @param {string} rip_path - path caching state & source audio
     * @param {boolean} retry_flag - __argv.[some param]
     * @param {LogStructure} log - logger settings
     * @param {LogDescription} log_desc - starting / completed descriptions 
     */
    constructor (cd,o,rip_path,retry_flag, state_file,log,log_desc) {
        this.o=o;
        this.cd=cd;
        this.rip_path=rip_path;
        this.retry_flag=retry_flag;
        this.state_file=state_file;
        this.log=log;  //log.log, log.err
        this.log_desc=log_desc;  //log_desc.start_desc, log_desc.complete_desc, log_desc.history_desc
    }

    /**
     * @public
     * Initialize state:
     * 1. Remove state if forcing a retry (via this.retry_flag)
     * 2. Load prior state if prior state is present
     * 3. Create new state if no prior state present (eg new cd or result of this.retry_flag)     
     */ 
    init() {
        if (this.retry_flag)  {
            this.remove_if_exists(path.join(this.rip_path,this.state_file));
        }
        this.obj_state=new StateStatus(this.log,this.cd.tracks.length-1,this.rip_path,this.tag_state_file);        
        return this.obj_state.init_state();   
    }

    /**
     * @private
     * Remove a file if it exists
     * @param {string} f - path to remove
     */
    remove_if_exists(f) {
        if (fs.existsSync(f)) {
            fs.unlinkSync(f); 
        }   
    }

    /* override */
    operate_on_track(t,input_obj) {}

    /**
     * Should be overriden to return an input object for this.process_track. 
     * @abstract
     * @param {Number} t - track number 
     */
    get_backlog_input_obj(t) {}

    /**
     * @public
     * @abstract
     * @param {Number} t 
     */
    downstream_process(t,input_obj){  }

    /**@public 
     * generic track handler
     * @param {number} t - track number (1..max track)
     * @param {Object} input_obj - input parameters (probably a path...)
     */
    process_track(t,input_obj) {
        this.log.log(`${this.log_desc.starting_desc} track ${t}`);       
        this.obj_state.start(t);
        this.operate_on_track(t,input_obj)
            .then((rv) => {
                this.log.log(`${this.log_desc.completed_desc} track ${t}`);
                this.obj_state.complete(t);      
                this.downstream_process(t,input_obj);                         
            })
            .catch((err)=>{ this.log.err(err);});
    }

    /**
     * @public
     * Activate any unprocessed backlog
     * @param {number} max_track - upper gate on tracks to process (1 - max_track)
     * 
     */
    process_history(max_track) {
        var process_backlog=0;
        for (let idx=1; idx<=max_track; idx++) {
            if (this.obj_state.is_incomplete(idx)) {
                this.log.log(`retry: track ${idx} wasn't ${this.log_desc.completed}...retry!`);
                this.process_track(idx,this.get_backlog_input_obj(idx));                                  
                process_backlog++;
            }          
        } 
        if (process_backlog) {
            this.log.log(`processed a backlog of ${process_backlog} ${this.log.backlog_desc} files.`);
        }
        else {
            this.log.log(`no backlog -- all ${this.log.backlog_desc} is caught up!`);
        }
    }

}


module.exports={CDAudioTrackState};